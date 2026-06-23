import { createClient } from '../supabase/server'
import { adminClient } from '../supabase/admin'
import { advanceChain } from './steps'

export async function createRequest(payload: {
  tenantId:   string
  ownerId:    string
  categoryId: string
  subject:    string
  bodyJson:   object
  visibility: 'public' | 'private'
  steps: Array<{
    approverId:  string
    type:        'GENERAL' | 'PARALLEL' | 'REFERENCE'
    orderIndex:  number
    stageIndex?: number
  }>
}) {
  const supabase = await createClient()

  const { data: request, error: reqError } = await supabase
    .from('approval_requests')
    .insert({
      tenant_id:   payload.tenantId,
      owner_id:    payload.ownerId,
      category_id: payload.categoryId,
      subject:     payload.subject,
      body_json:   payload.bodyJson,
      visibility:  payload.visibility,
      status:      'draft'
    })
    .select()
    .single()

  if (reqError) throw reqError

  const { error: stepsError } = await adminClient
    .from('approval_steps')
    .insert(
      payload.steps.map(s => ({
        request_id:  request.id,
        approver_id: s.approverId,
        type:        s.type,
        order_index: s.orderIndex,
        stage_index: s.stageIndex ?? 0,
        status:      'waiting'
      }))
    )

  if (stepsError) throw stepsError

  await adminClient.from('audit_log').insert({
    tenant_id:   payload.tenantId,
    request_id:  request.id,
    actor_id:    payload.ownerId,
    action_type: 'request_created',
    metadata:    { subject: payload.subject }
  })

  return request
}

export async function submitRequest(requestId: string, userId: string, tenantId: string) {
  // lock the request to pending
  const { error: lockError } = await adminClient
    .from('approval_requests')
    .update({ status: 'pending' })
    .eq('id', requestId)
    .eq('owner_id', userId)
    .eq('status', 'draft');

  if (lockError) throw lockError;

  // activate all REFERENCE steps -> pending
  const { error: refError } = await adminClient
    .from('approval_steps')
    .update({ status: 'pending' })
    .eq('request_id', requestId)
    .eq('type', 'REFERENCE');

  if (refError) throw refError;

  // activate first stage steps
  await advanceChain(requestId, tenantId);

  // audit
  await adminClient.from('audit_log').insert({
    tenant_id:   tenantId,
    request_id:  requestId,
    actor_id:    userId,
    action_type: 'request_submitted',
    metadata:    {}
  });
}

export async function getRequestDetail(requestId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('approval_requests')
    .select(`
      *,
      categories ( name, default_sla_hours ),
      users!owner_id ( id, name, email, designation, employee_id ),
      approval_steps (
        id, approver_id, type, order_index, stage_index, status,
        acted_at, comment, condition_text, action_source,
        users!approver_id ( id, name, email, designation, employee_id ),
        acted_by:users!acted_by_id ( id, name ),
        delegations (
          id,
          delegator:users!delegator_id ( name )
        )
      ),
      attachments ( id, filename, storage_path, size_bytes ),
      view_grants ( id, grantee_id, status,
        users!grantee_id ( name, email ) )
    `)
    .eq('id', requestId)
    .single()

  if (error) throw error
  return data
}

export async function uploadAttachment(file: File, requestId: string, tenantId: string, userId: string) {
  const supabase = await createClient()
  const path = `${tenantId}/${requestId}/${Date.now()}-${file.name}`

  // Convert File to ArrayBuffer and Buffer to ensure Serverless runtime compatibility
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(path, buffer, {
      upsert: false,
      contentType: file.type || 'application/octet-stream'
    })

  if (error) throw error

  await supabase.from('attachments').insert({
    request_id:   requestId,
    tenant_id:    tenantId,
    filename:     file.name,
    storage_path: data.path,
    size_bytes:   file.size,
    mime_type:    file.type || 'application/octet-stream',
    uploaded_by:  userId
  })

  return data.path
}

export async function getSignedUrl(storagePath: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(storagePath, 3600)
  if (error) throw error
  return data.signedUrl
}
