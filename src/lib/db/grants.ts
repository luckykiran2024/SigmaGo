import { createClient } from '../supabase/server'
import { adminClient } from '../supabase/admin'

export async function nominateViewer(requestId: string, granteeId: string, ownerId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('view_grants')
    .insert({
      request_id:    requestId,
      grantee_id:    granteeId,
      granted_by_id: ownerId,
      status:        'pending'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function approveViewGrant(grantId: string, approverId: string, tenantId: string) {
  const supabase = await createClient()

  const { data: grant } = await supabase
    .from('view_grants')
    .select('request_id')
    .eq('id', grantId)
    .eq('status', 'pending')
    .single()

  if (!grant) throw new Error('Grant not found or already resolved')

  const { data: isApprover } = await supabase
    .from('approval_steps')
    .select('id')
    .eq('request_id', grant.request_id)
    .eq('approver_id', approverId)
    .eq('type', 'GENERAL')
    .limit(1)
    .maybeSingle()

  if (!isApprover) throw new Error('Not authorized to approve this grant')

  const { error } = await supabase
    .from('view_grants')
    .update({
      status:      'active',
      resolved_at: new Date().toISOString()
    })
    .eq('id', grantId)

  if (error) throw error

  await adminClient.from('audit_log').insert({
    tenant_id:   tenantId,
    request_id:  grant.request_id,
    actor_id:    approverId,
    action_type: 'view_grant_approved',
    metadata:    { grant_id: grantId }
  })
}


