'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { advanceChain } from '@/lib/db/steps';
import { revalidatePath } from 'next/cache';

export async function recordOfflineAction(formData: FormData) {
  const stepId = formData.get('stepId') as string;
  const requestId = formData.get('requestId') as string;
  const tenant = formData.get('tenant') as string;
  const source = formData.get('source') as string;
  const occurredAt = formData.get('occurredAt') as string;
  const note = (formData.get('note') as string) || '';
  const evidenceFile = formData.get('evidence') as File | null;

  if (!stepId || !requestId || !tenant) {
    throw new Error('Missing required parameters');
  }

  if (note.trim().length < 20) {
    throw new Error('Note must be at least 20 characters explaining the circumstances.');
  }

  // 1. Authenticate user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) throw new Error('User profile not found');

  // 2. Fetch step details & request
  const { data: step } = await adminClient
    .from('approval_steps')
    .select('*, approval_requests!request_id ( owner_id, tenant_id, ref, subject )')
    .eq('id', stepId)
    .single();

  if (!step) throw new Error('Step not found');
  if (step.status !== 'pending') throw new Error('Only pending steps can be recorded offline');

  const reqOwnerId = (step.approval_requests as any)?.owner_id;
  const isOwner = reqOwnerId === profile.id;
  const role = (profile.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'super_admin';

  if (!isOwner && !isAdmin) {
    throw new Error('Only the request owner or tenant administrator can record offline approvals.');
  }

  // H1 Fix: Upload evidence file and use EXACT schema column names (filename, size_bytes, uploaded_by)
  let evidenceFileId: string | null = null;
  if (evidenceFile && evidenceFile.name && evidenceFile.size > 0) {
    const fileExt = evidenceFile.name.split('.').pop();
    const storagePath = `${step.tenant_id}/${requestId}/evidence_${Date.now()}.${fileExt}`;
    
    const arrayBuffer = await evidenceFile.arrayBuffer();
    const { error: uploadErr } = await adminClient.storage
      .from('attachments')
      .upload(storagePath, arrayBuffer, { contentType: evidenceFile.type });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      throw new Error(`Failed to upload evidence file: ${uploadErr.message}`);
    }

    // H1 Fix: Insert using EXACT Prisma/DB column names (filename, size_bytes, uploaded_by)
    const { data: att, error: attInsertErr } = await adminClient
      .from('attachments')
      .insert({
        tenant_id: step.tenant_id,
        request_id: requestId,
        filename: evidenceFile.name,            // Exact column name in schema
        size_bytes: evidenceFile.size,           // Exact column name in schema
        mime_type: evidenceFile.type,
        storage_path: storagePath,
        uploaded_by: profile.id                  // Exact column name in schema
      })
      .select('id')
      .single();

    if (attInsertErr || !att) {
      console.error("Attachment insert DB error:", attInsertErr);
      throw new Error(`Failed to record evidence file metadata: ${attInsertErr?.message || 'Database error'}`);
    }

    evidenceFileId = att.id;
  }

  // 3. Update step as approved offline
  const ratificationDue = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const actedTime = occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString();

  const { error: stepUpdateErr } = await adminClient
    .from('approval_steps')
    .update({
      status: 'approved',
      acted_at: actedTime,
      recorded_offline: true,
      recorded_by_id: profile.id,
      offline_source: source,
      offline_note: note,
      evidence_file_id: evidenceFileId,
      ratification_due_at: ratificationDue,
      ratification_status: 'pending'
    })
    .eq('id', stepId);

  if (stepUpdateErr) {
    throw new Error(`Failed to update step status: ${stepUpdateErr.message}`);
  }

  // 4. Log audit entry
  await adminClient.from('audit_log').insert({
    tenant_id: step.tenant_id,
    request_id: requestId,
    actor_id: profile.id,
    action_type: 'recorded_offline_approval',
    metadata: {
      step_id: stepId,
      approver_id: step.approver_id,
      recorded_by: profile.name,
      source: source,
      note: note,
      evidence_attached: !!evidenceFileId
    }
  });

  // 5. Advance workflow chain
  await advanceChain(requestId, step.tenant_id);

  revalidatePath(`/${tenant}/requests/${requestId}`);
  return { success: true };
}
