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
  validityData?: { validUntil?: string | null; reviewDate?: string | null; renewedFromId?: string | null }
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
  if (categoryId) {
    const { data: cat } = await adminClient
      .from('categories')
      .select('id, validity_mode, max_validity_days, review_only, tenant_id')
      .eq('id', categoryId)
      .eq('tenant_id', tenantData.id) // H7 Fix: Ensure category belongs to THIS tenant
      .maybeSingle();

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
  const approverIds = approvalPath.map(s => s.approver_id || s.approverId);
  const { data: validApprovers } = await adminClient
    .from('users')
    .select('id')
    .eq('tenant_id', tenantData.id)
    .eq('status', 'active')
    .in('id', approverIds);

  const validApproverSet = new Set((validApprovers || []).map(u => u.id));
  for (const step of approvalPath) {
    const appValId = step.approver_id || step.approverId;
    if (!validApproverSet.has(appValId)) {
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

  // 2. Map steps
  const steps = approvalPath.map(step => ({
    approverId: step.approver_id || step.approverId,
    type: step.type,
    orderIndex: step.order_index ?? step.orderIndex ?? 0,
    stageIndex: step.stage_index ?? step.stageIndex ?? 0
  }));

  // 3. Create request
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
    steps: steps
  });

  // 4. Handle attachment files
  const attachmentEntries = Array.from(formData.entries())
    .filter(([key]) => key.startsWith('attachment_'));

  for (const [_, value] of attachmentEntries) {
    const file = value as File;
    if (file && file.name && file.size > 0) {
      await uploadAttachment(file, request.id, tenantData.id, profile.id);
    }
  }

  // 5. Submit request
  await submitRequest(request.id, profile.id, tenantData.id);

  revalidatePath(`/${tenant}/approvals`);
  return { success: true, requestId: request.id };
}
