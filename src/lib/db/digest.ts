import { adminClient } from '../supabase/admin'

export async function findOverdueSteps() {
  const { data, error } = await adminClient.rpc('get_overdue_steps')
  if (error) throw error
  return data
}

export async function getDigestPayload() {
  const { data, error } = await adminClient
    .from('approval_steps')
    .select(`
      approver_id,
      users!approver_id ( email, name ),
      approval_requests!inner (
        id, ref, subject, created_at, tenant_id,
        categories ( name ),
        users!owner_id ( name )
      )
    `)
    .eq('status', 'pending')
    .eq('users.status', 'active')

  if (error) throw error
  return data
}

