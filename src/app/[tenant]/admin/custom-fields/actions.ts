'use server';

import { adminClient } from '@/lib/supabase/admin';
import { requireTenantAdmin } from '@/lib/auth/guards';
import {
  createCustomField,
  updateCustomField,
  reorderCustomFields,
  slugify,
} from '@/lib/db/customFields';
import { revalidatePath } from 'next/cache';

export async function createCustomFieldAction(
  tenant: string,
  data: {
    label: string;
    type: string;
    options?: string[];
    required?: boolean;
    categoryId?: string | null;
  }
) {
  const { tenantId } = await requireTenantAdmin(tenant);
  
  const key = slugify(data.label);
  if (!key) throw new Error('Label must contain at least one alphanumeric character');
  
  const { data: existing } = await adminClient
    .from('tenant_custom_fields')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('key', key)
    .maybeSingle();
  
  if (existing) throw new Error(`A field with key "${key}" already exists. Choose a different label.`);
  
  const { data: maxRow } = await adminClient
    .from('tenant_custom_fields')
    .select('sort_order')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;
  
  await createCustomField({
    tenantId,
    label: data.label,
    key,
    type: data.type,
    options: data.type === 'SELECT' ? (data.options || []) : null,
    required: data.required || false,
    categoryId: data.categoryId || null,
    sortOrder: nextOrder,
  });
  
  revalidatePath(`/${tenant}/admin/custom-fields`);
  return { success: true, key };
}

export async function updateCustomFieldAction(
  tenant: string,
  fieldId: string,
  data: {
    label?: string;
    type?: string;
    options?: string[];
    required?: boolean;
    categoryId?: string | null;
    active?: boolean;
  }
) {
  const { tenantId } = await requireTenantAdmin(tenant);
  
  await updateCustomField(tenantId, fieldId, {
    label: data.label,
    type: data.type,
    options: data.type === 'SELECT' ? (data.options || []) : undefined,
    required: data.required,
    categoryId: data.categoryId,
    active: data.active,
  });
  
  revalidatePath(`/${tenant}/admin/custom-fields`);
  return { success: true };
}

export async function moveFieldAction(
  tenant: string,
  fieldId: string,
  direction: 'up' | 'down'
) {
  const { tenantId } = await requireTenantAdmin(tenant);
  
  const { data: fields } = await adminClient
    .from('tenant_custom_fields')
    .select('id, sort_order')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true });
  
  if (!fields) return { success: false };
  
  const idx = fields.findIndex(f => f.id === fieldId);
  if (idx === -1) return { success: false };
  
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= fields.length) return { success: false };
  
  const orderedIds = fields.map(f => f.id);
  const temp = orderedIds[idx];
  orderedIds[idx] = orderedIds[swapIdx];
  orderedIds[swapIdx] = temp;
  
  await reorderCustomFields(tenantId, orderedIds);
  revalidatePath(`/${tenant}/admin/custom-fields`);
  return { success: true };
}
