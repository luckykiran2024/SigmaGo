'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfileForAuthUser } from '@/lib/db/users'
import { adminClient } from '@/lib/supabase/admin'
import {
  createCustomField,
  updateCustomField,
  reorderCustomFields,
  slugify,
} from '@/lib/db/customFields'
import { revalidatePath } from 'next/cache'

async function requireAdmin(tenant: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const profile = await getProfileForAuthUser(user.id, user.email || '')
  if (!profile) throw new Error('Profile not found')
  
  const role = (profile.role || '').toLowerCase()
  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Admin access required')
  }
  
  const { data: tenantData } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenant)
    .single()
  if (!tenantData) throw new Error('Tenant not found')
  
  return { profile, tenantId: tenantData.id }
}

export async function createCustomFieldAction(
  tenant: string,
  data: {
    label: string
    type: string
    options?: string[]
    required?: boolean
    categoryId?: string | null
  }
) {
  const { tenantId } = await requireAdmin(tenant)
  
  const key = slugify(data.label)
  if (!key) throw new Error('Label must contain at least one alphanumeric character')
  
  // Check for duplicate key
  const { data: existing } = await adminClient
    .from('tenant_custom_fields')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('key', key)
    .maybeSingle()
  
  if (existing) throw new Error(`A field with key "${key}" already exists. Choose a different label.`)
  
  // Get max sort_order
  const { data: maxRow } = await adminClient
    .from('tenant_custom_fields')
    .select('sort_order')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  const nextOrder = (maxRow?.sort_order ?? -1) + 1
  
  await createCustomField({
    tenantId,
    label: data.label,
    key,
    type: data.type,
    options: data.type === 'SELECT' ? (data.options || []) : null,
    required: data.required || false,
    categoryId: data.categoryId || null,
    sortOrder: nextOrder,
  })
  
  revalidatePath(`/${tenant}/admin/custom-fields`)
  return { success: true, key }
}

export async function updateCustomFieldAction(
  tenant: string,
  fieldId: string,
  data: {
    label?: string
    type?: string
    options?: string[]
    required?: boolean
    categoryId?: string | null
    active?: boolean
  }
) {
  await requireAdmin(tenant)
  
  await updateCustomField(fieldId, {
    label: data.label,
    type: data.type,
    options: data.type === 'SELECT' ? (data.options || []) : undefined,
    required: data.required,
    categoryId: data.categoryId,
    active: data.active,
  })
  
  revalidatePath(`/${tenant}/admin/custom-fields`)
  return { success: true }
}

export async function reorderCustomFieldsAction(
  tenant: string,
  orderedIds: string[]
) {
  await requireAdmin(tenant)
  await reorderCustomFields(orderedIds)
  revalidatePath(`/${tenant}/admin/custom-fields`)
  return { success: true }
}

export async function moveFieldAction(
  tenant: string,
  fieldId: string,
  direction: 'up' | 'down'
) {
  const { tenantId } = await requireAdmin(tenant)
  
  const { data: fields } = await adminClient
    .from('tenant_custom_fields')
    .select('id, sort_order')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
  
  if (!fields) return { success: false }
  
  const idx = fields.findIndex(f => f.id === fieldId)
  if (idx === -1) return { success: false }
  
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= fields.length) return { success: false }
  
  // Swap sort_order values
  const orderedIds = fields.map(f => f.id)
  const temp = orderedIds[idx]
  orderedIds[idx] = orderedIds[swapIdx]
  orderedIds[swapIdx] = temp
  
  await reorderCustomFields(orderedIds)
  revalidatePath(`/${tenant}/admin/custom-fields`)
  return { success: true }
}
