import { createClient } from '../supabase/server'
import { adminClient } from '../supabase/admin'

export async function getLiveDelegationsForDelegate(delegateId: string, tenantId: string) {
  const supabase = await createClient()
  const nowStr = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('delegations')
    .select('id, delegator_id, delegator:users!delegator_id(id, name, employee_id)')
    .eq('tenant_id', tenantId)
    .eq('delegate_id', delegateId)
    .eq('status', 'active')
    .or(`starts_at.is.null,starts_at.lte.${nowStr}`)
    .or(`ends_at.is.null,ends_at.gte.${nowStr}`)

  if (error) {
    console.error("Error fetching live delegations:", error)
    return []
  }
  return data || []
}

export async function getLiveDelegation(tenantId: string, delegatorId: string, delegateId: string) {
  const supabase = await createClient()
  const nowStr = new Date().toISOString()

  const { data, error } = await supabase
    .from('delegations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('delegator_id', delegatorId)
    .eq('delegate_id', delegateId)
    .eq('status', 'active')
    .or(`starts_at.is.null,starts_at.lte.${nowStr}`)
    .or(`ends_at.is.null,ends_at.gte.${nowStr}`)
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data
}

export async function createDelegation(data: any) {
  const supabase = await createClient()
  
  const { data: result, error } = await supabase
    .from('delegations')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return result
}
