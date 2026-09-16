'use server';

import { adminClient } from '@/lib/supabase/admin';
import { requireTenantAdmin } from '@/lib/auth/guards';
import { createWorkflow, updateWorkflow, deleteWorkflow, WorkflowStep } from '@/lib/db/workflows';
import { revalidatePath } from 'next/cache';

export async function saveWorkflowAction(
  tenantSubdomain: string,
  payload: {
    id?: string;
    name: string;
    categoryId: string | null;
    isLocked: boolean;
    steps: WorkflowStep[];
    baseStepType?: 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS';
    governingPolicyId?: string | null;
    defaultSlaHours?: number | null;
    classificationRulesJson?: Record<string, any>;
  }
) {
  const { tenantId, profile } = await requireTenantAdmin(tenantSubdomain);
  const userId = profile.id;

  // Validate that categoryId belongs to this tenant if provided
  if (payload.categoryId) {
    const { data: category } = await adminClient
      .from('categories')
      .select('id')
      .eq('id', payload.categoryId)
      .eq('tenant_id', tenantId)
      .single();

    if (!category) {
      throw new Error('Category not found or does not belong to this tenant');
    }
  }

  // Validate governingPolicyId belongs to this tenant if provided
  if (payload.governingPolicyId) {
    const { data: policy } = await adminClient
      .from('policies')
      .select('id')
      .eq('id', payload.governingPolicyId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!policy) {
      throw new Error('Governing policy not found or does not belong to this tenant');
    }
  }

  let result;
  if (payload.id) {
    result = await updateWorkflow(payload.id, tenantId, {
      categoryId: payload.categoryId,
      name: payload.name,
      isLocked: payload.isLocked,
      steps: payload.steps,
      baseStepType: payload.baseStepType,
      governingPolicyId: payload.governingPolicyId,
      defaultSlaHours: payload.defaultSlaHours,
      classificationRulesJson: payload.classificationRulesJson,
      updatedBy: userId,
    });
  } else {
    result = await createWorkflow({
      tenantId,
      categoryId: payload.categoryId,
      name: payload.name,
      isLocked: payload.isLocked,
      steps: payload.steps,
      baseStepType: payload.baseStepType,
      governingPolicyId: payload.governingPolicyId,
      defaultSlaHours: payload.defaultSlaHours,
      classificationRulesJson: payload.classificationRulesJson,
      createdBy: userId,
    });
  }

  revalidatePath(`/${tenantSubdomain}/admin/workflows`);
  revalidatePath(`/${tenantSubdomain}/requests/new`);
  return result;
}

export async function deleteWorkflowAction(tenantSubdomain: string, workflowId: string) {
  const { tenantId } = await requireTenantAdmin(tenantSubdomain);
  await deleteWorkflow(workflowId, tenantId);
  revalidatePath(`/${tenantSubdomain}/admin/workflows`);
  revalidatePath(`/${tenantSubdomain}/requests/new`);
  return true;
}
