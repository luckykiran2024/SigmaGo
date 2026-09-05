'use server';

import { createRequest, submitRequest, uploadAttachment } from '@/lib/db/requests';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { revalidatePath } from 'next/cache';

export async function submitNewRequest(
  formData: FormData,
  content: any,
  tenant: string,
  approvalPath: Array<any>,
  beneficiaryId?: string | null,
  customFieldValues?: Record<string, any>,
  validityData?: { validUntil?: string | null; reviewDate?: string | null; renewedFromId?: string | null },
  referenceData?: { targetId?: string | null; policyId?: string | null; relationship: string } | null,
  overrideData?: { isOverride: boolean; reason?: string | null } | null
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) {
    throw new Error('Public profile not found for user');
  }

  // 1. Resolve tenant details by subdomain
  const { data: tenantData } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenant)
    .single();

  if (!tenantData) {
    throw new Error('Tenant not found');
  }

  // H7 Fix: Assert submitter profile tenant_id matches target tenant_id
  if (profile.tenant_id !== tenantData.id) {
    throw new Error('Forbidden: User does not belong to this tenant');
  }

  const subject = formData.get('subject') as string;
  const categoryId = formData.get('category') as string;

  if (!subject || !subject.trim()) {
    throw new Error('Subject is required');
  }

  // H7 Fix: Verify category belongs to submitter's tenant
  let cat: any = null;
  if (categoryId) {
    const { data: fetchedCat } = await adminClient
      .from('categories')
      .select('id, validity_mode, max_validity_days, review_only, tenant_id, governing_policy_id')
      .eq('id', categoryId)
      .eq('tenant_id', tenantData.id) // H7 Fix: Ensure category belongs to THIS tenant
      .maybeSingle();

    cat = fetchedCat;

    if (!cat) {
      throw new Error('Category not found or does not belong to this tenant');
    }

    if (cat.validity_mode === 'REQUIRED' && !validityData?.validUntil && !validityData?.reviewDate) {
      throw new Error("This category requires a Valid Until end date.");
    }
    if (cat.max_validity_days && validityData?.validUntil) {
      const until = new Date(validityData.validUntil);
      const now = new Date();
      const maxMs = Number(cat.max_validity_days) * 24 * 60 * 60 * 1000;
      if (until.getTime() - now.getTime() > maxMs + 86400000) {
        throw new Error(`Validity duration exceeds maximum allowed limit of ${cat.max_validity_days} days.`);
      }
    }
  }

  if (!approvalPath || approvalPath.length === 0) {
    throw new Error('Approval path must contain at least one step');
  }

  // H7 Fix: Verify all approver IDs in path are active users of THIS tenant
  const approverIds = approvalPath.map(s => s.userId || s.approver_id || s.approverId).filter(Boolean);
  const { data: validApprovers } = await adminClient
    .from('users')
    .select('id')
    .eq('tenant_id', tenantData.id)
    .eq('status', 'active')
    .in('id', approverIds);

  const validApproverSet = new Set((validApprovers || []).map(u => u.id));
  for (const step of approvalPath) {
    const appValId = step.userId || step.approver_id || step.approverId;
    if (!appValId || !validApproverSet.has(appValId)) {
      throw new Error(`Approver ID "${appValId}" is not an active member of this tenant.`);
    }
  }

  // H7 Fix: Verify beneficiary belongs to THIS tenant if provided
  if (beneficiaryId) {
    const { data: benUser } = await adminClient
      .from('users')
      .select('id')
      .eq('id', beneficiaryId)
      .eq('tenant_id', tenantData.id)
      .maybeSingle();

    if (!benUser) {
      throw new Error('Beneficiary user not found or does not belong to this tenant');
    }
  }

  // 2. Resolve workflow identity, active version, SLA, governing policy snapshot, and STEP classification
  const requestedWorkflowId = (formData.get('workflow_id') || formData.get('workflowId')) as string | null;

  let workflowId: string | null = null;
  let workflowVersionId: string | null = null;
  let baselineStepType: any = 'TRANSACTIONAL';
  let resolvedStepType: any = 'TRANSACTIONAL';
  let classificationSource: string = 'WORKFLOW';
  let classificationReason: string | null = null;
  let expectedSlaHours: number | null = null;
  let workflowSnapshot: Record<string, any> = {};
  let governingPolicyBound: any = null;
  let workflowRulesJson: any = null;

  // Workflow-first lookup: by explicit workflowId or categoryId or tenant default active workflow
  let wfQuery = adminClient
    .from('workflows')
    .select('id, name, category_id, base_step_type, governing_policy_id, default_sla_hours, current_version_number, classification_rules_json')
    .eq('tenant_id', tenantData.id);

  if (requestedWorkflowId) {
    wfQuery = wfQuery.eq('id', requestedWorkflowId);
  } else if (categoryId) {
    wfQuery = wfQuery.eq('category_id', categoryId);
  } else {
    wfQuery = wfQuery.eq('is_active', true).limit(1);
  }

  const { data: wf } = await wfQuery.maybeSingle();

  if (wf) {
    workflowId = wf.id;
    if (!categoryId && wf.category_id) {
      categoryId = wf.category_id;
    }
    baselineStepType = wf.base_step_type || 'TRANSACTIONAL';
    expectedSlaHours = wf.default_sla_hours || null;
    workflowRulesJson = wf.classification_rules_json;

    // Load current active immutable workflow version
    const { data: wfVer } = await adminClient
      .from('workflow_versions')
      .select('*')
      .eq('workflow_id', wf.id)
      .eq('tenant_id', tenantData.id)
      .is('effective_to', null)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (wfVer) {
      workflowVersionId = wfVer.id;
      workflowSnapshot = wfVer;
      baselineStepType = wfVer.base_step_type || baselineStepType;
      if (wfVer.default_sla_hours !== null && wfVer.default_sla_hours !== undefined) {
        expectedSlaHours = wfVer.default_sla_hours;
      }
      if (wfVer.classification_rules_json && Object.keys(wfVer.classification_rules_json).length > 0) {
        workflowRulesJson = wfVer.classification_rules_json;
      }
    }

    const effectivePolicyId = wfVer?.governing_policy_id_snapshot || wf.governing_policy_id || cat?.governing_policy_id;
    if (effectivePolicyId) {
      const { data: pol } = await adminClient
        .from('policies')
        .select('title, bound_field, bound_type, bound_value')
        .eq('id', effectivePolicyId)
        .eq('tenant_id', tenantData.id)
        .maybeSingle();

      if (pol) {
        governingPolicyBound = {
          boundField: pol.bound_field,
          boundType: pol.bound_type,
          boundValue: pol.bound_value,
          policyTitle: pol.title,
        };
      }
    }
  }

  // Extract numeric form fields for server-side evaluation
  const formDataNumericValues: Record<string, number> = {};
  for (const [k, v] of formData.entries()) {
    const n = parseFloat(String(v));
    if (!isNaN(n)) {
      formDataNumericValues[k] = n;
    }
  }

  // Server-authoritative classification rule evaluation
  const { evaluateClassificationRules } = await import('@/lib/intelligence/rules/evaluator');
  const ruleEvaluation = evaluateClassificationRules({
    baseStepType: baselineStepType,
    rulesJson: workflowRulesJson,
    policyBound: governingPolicyBound,
    customFields: customFieldValues || {},
    formDataNumericValues,
    manualOverride: overrideData,
    referenceRelationship: referenceData?.relationship,
  });

  resolvedStepType = ruleEvaluation.resolvedStepType;
  classificationSource = ruleEvaluation.classificationSource;
  classificationReason = ruleEvaluation.classificationReason;

  // 3. Map steps deterministically (Sequential Direct approvers get incremental stageIndex)
  let currentStage = 0;
  let inParallelCluster = false;

  const steps = approvalPath.map((step, index) => {
    const role = step.role || step.type || 'GENERAL';
    let assignedStage: number;

    if (step.stage_index !== undefined && step.stage_index !== null) {
      assignedStage = Number(step.stage_index);
    } else if (step.stageIndex !== undefined && step.stageIndex !== null) {
      assignedStage = Number(step.stageIndex);
    } else {
      if (role === 'REFERENCE') {
        assignedStage = 0;
      } else if (role === 'PARALLEL') {
        if (!inParallelCluster && index > 0) {
          currentStage++;
        }
        inParallelCluster = true;
        assignedStage = currentStage;
      } else {
        // GENERAL Direct Approver
        if (index > 0) {
          currentStage++;
        }
        inParallelCluster = false;
        assignedStage = currentStage;
      }
    }

    return {
      approverId: step.userId || step.approver_id || step.approverId,
      type: role,
      orderIndex: step.order_index ?? step.orderIndex ?? index,
      stageIndex: assignedStage,
    };
  });

  // 4. Create request
  const request = await createRequest({
    tenantId: tenantData.id,
    ownerId: profile.id,
    categoryId: categoryId,
    subject: subject.trim(),
    bodyJson: content,
    visibility: 'public',
    beneficiaryId: beneficiaryId || null,
    customFields: customFieldValues || {},
    validUntil: validityData?.validUntil || null,
    reviewDate: validityData?.reviewDate || null,
    renewedFromId: validityData?.renewedFromId || null,
    parentReferenceId: referenceData?.targetId || null,
    workflowId: workflowId,
    workflowVersionId: workflowVersionId,
    baselineStepType: baselineStepType,
    resolvedStepType: resolvedStepType,
    classificationSource: classificationSource,
    classificationReason: classificationReason,
    expectedSlaHours: expectedSlaHours,
    workflowSnapshot: workflowSnapshot,
    steps: steps
  });

  const { emitDecisionEvent } = await import('@/lib/intelligence/events/emit');

  // Emit REQUEST_CREATED & WORKFLOW_RESOLVED events
  await emitDecisionEvent({
    tenantId: tenantData.id,
    requestId: request.id,
    workflowId: workflowId,
    workflowVersionId: workflowVersionId,
    eventType: 'REQUEST_CREATED',
    actorId: profile.id,
    baselineStepType: baselineStepType,
    resolvedStepType: resolvedStepType,
    parentReferenceId: referenceData?.targetId || null,
    eventPayload: { subject: subject.trim(), categoryId }
  });

  if (workflowId) {
    await emitDecisionEvent({
      tenantId: tenantData.id,
      requestId: request.id,
      workflowId: workflowId,
      workflowVersionId: workflowVersionId,
      eventType: 'WORKFLOW_RESOLVED',
      actorId: profile.id,
      baselineStepType: baselineStepType,
      resolvedStepType: resolvedStepType,
      eventPayload: { workflowId, workflowVersionId }
    });
  }

  // Handle classification override flags if present
  if (overrideData?.isOverride) {
    await adminClient
      .from('approval_requests')
      .update({
        classification_override: true,
        classification_override_reason: overrideData.reason || 'User kept choice despite misclassification warning'
      })
      .eq('id', request.id)
      .eq('tenant_id', tenantData.id);

    await emitDecisionEvent({
      tenantId: tenantData.id,
      requestId: request.id,
      workflowId: workflowId,
      workflowVersionId: workflowVersionId,
      eventType: 'CLASSIFICATION_OVERRIDDEN',
      actorId: profile.id,
      baselineStepType: baselineStepType,
      resolvedStepType: resolvedStepType,
      eventPayload: { reason: overrideData.reason }
    });
  }

  // Handle reference linking (Case C)
  if (referenceData && (referenceData.targetId || referenceData.policyId)) {
    await adminClient
      .from('decision_references')
      .insert({
        tenant_id: tenantData.id,
        source_id: request.id,
        target_id: referenceData.targetId || null,
        to_policy_id: referenceData.policyId || null,
        relationship: referenceData.relationship || 'BASED_ON',
        created_by: profile.id
      });

    await emitDecisionEvent({
      tenantId: tenantData.id,
      requestId: request.id,
      workflowId: workflowId,
      workflowVersionId: workflowVersionId,
      eventType: referenceData.relationship === 'EXCEPTION_TO' ? 'EXCEPTION_DETECTED' : 'REFERENCE_ADDED',
      actorId: profile.id,
      policyId: referenceData.policyId || null,
      parentReferenceId: referenceData.targetId || null,
      baselineStepType: baselineStepType,
      resolvedStepType: resolvedStepType,
      eventPayload: { relationship: referenceData.relationship, targetId: referenceData.targetId, policyId: referenceData.policyId }
    });
  }

  // 5. Handle attachment files
  const attachmentEntries = Array.from(formData.entries())
    .filter(([key]) => key.startsWith('attachment_'));

  for (const [_, value] of attachmentEntries) {
    const file = value as File;
    if (file && file.name && file.size > 0) {
      await uploadAttachment(file, request.id, tenantData.id, profile.id);
    }
  }

  // 6. Submit request & emit REQUEST_SUBMITTED
  await submitRequest(request.id, profile.id, tenantData.id);

  await emitDecisionEvent({
    tenantId: tenantData.id,
    requestId: request.id,
    workflowId: workflowId,
    workflowVersionId: workflowVersionId,
    eventType: 'REQUEST_SUBMITTED',
    actorId: profile.id,
    baselineStepType: baselineStepType,
    resolvedStepType: resolvedStepType,
    parentReferenceId: referenceData?.targetId || null,
  });

  revalidatePath(`/${tenant}/approvals`);
  return { success: true, requestId: request.id };
}
