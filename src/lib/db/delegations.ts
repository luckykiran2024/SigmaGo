import { createClient } from '../supabase/server'

export async function getActiveDelegation(tenantId: string, categoryId: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('delegations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('grantor_id', user.id)
    .eq('status', 'active')
    .lte('starts_at', new Date().toISOString())
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .or(`scope_categories.is.null,scope_categories.cs.{${categoryId}}`)
    .limit(1)
    .maybeSingle()

  if (error) throw error
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
