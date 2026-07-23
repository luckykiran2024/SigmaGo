import { adminClient } from '../supabase/admin'

export interface CustomFieldDefinition {
  id: string
  tenant_id: string
  label: string
  key: string
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'PERSON'
  options: string[] | null
  required: boolean
  category_id: string | null
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
  categories?: { name: string } | null
}

/** Get active custom fields for a tenant, optionally scoped to a category */
export async function getCustomFieldsForTenant(
  tenantId: string,
  categoryId?: string | null
): Promise<CustomFieldDefinition[]> {
  let query = adminClient
    .from('tenant_custom_fields')
    .select('*, categories ( name )')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (categoryId) {
    // Get fields scoped to this category OR global (no category)
    query = query.or(`category_id.eq.${categoryId},category_id.is.null`)
  } else {
    // Only global fields
    query = query.is('category_id', null)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as CustomFieldDefinition[]
}

/** Get ALL custom field definitions for admin management */
export async function getCustomFieldDefinitions(
  tenantId: string
): Promise<CustomFieldDefinition[]> {
  const { data, error } = await adminClient
    .from('tenant_custom_fields')
    .select('*, categories ( name )')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data || []) as CustomFieldDefinition[]
}

/** Create a new custom field definition */
export async function createCustomField(data: {
  tenantId: string
  label: string
  key: string
  type: string
  options?: string[] | null
  required?: boolean
  categoryId?: string | null
  sortOrder?: number
}) {
  const { data: field, error } = await adminClient
    .from('tenant_custom_fields')
    .insert({
      tenant_id: data.tenantId,
      label: data.label,
      key: data.key,
      type: data.type,
      options: data.options || null,
      required: data.required || false,
      category_id: data.categoryId || null,
      sort_order: data.sortOrder || 0,
    })
    .select()
    .single()

  if (error) throw error
  return field
}

/** Update a custom field definition */
export async function updateCustomField(
  id: string,
  data: {
    label?: string
    type?: string
    options?: string[] | null
    required?: boolean
    categoryId?: string | null
    sortOrder?: number
    active?: boolean
  }
) {
  const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }
  if (data.label !== undefined) updatePayload.label = data.label
  if (data.type !== undefined) updatePayload.type = data.type
  if (data.options !== undefined) updatePayload.options = data.options
  if (data.required !== undefined) updatePayload.required = data.required
  if (data.categoryId !== undefined) updatePayload.category_id = data.categoryId
  if (data.sortOrder !== undefined) updatePayload.sort_order = data.sortOrder
  if (data.active !== undefined) updatePayload.active = data.active

  const { data: field, error } = await adminClient
    .from('tenant_custom_fields')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return field
}

/** Bulk reorder custom fields */
export async function reorderCustomFields(orderedIds: string[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await adminClient
      .from('tenant_custom_fields')
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq('id', orderedIds[i])
  }
}

/** Generate a URL-safe slug from a label */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50)
}
