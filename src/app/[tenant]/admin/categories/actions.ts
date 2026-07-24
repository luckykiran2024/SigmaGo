'use server';

import { adminClient } from '@/lib/supabase/admin';

export async function createCategoryAction(
  tenantId: string,
  name: string,
  defaultSlaHours: number,
  validityData?: {
    validity_mode?: 'NONE' | 'OPTIONAL' | 'REQUIRED';
    default_validity_days?: number | null;
    max_validity_days?: number | null;
    review_only?: boolean;
  }
): Promise<void> {
  const insertPayload: Record<string, any> = {
    tenant_id: tenantId,
    name: name,
    default_sla_hours: defaultSlaHours,
    default_chain: []
  };

  if (validityData) {
    if (validityData.validity_mode) insertPayload.validity_mode = validityData.validity_mode;
    if (validityData.default_validity_days) insertPayload.default_validity_days = validityData.default_validity_days;
    if (validityData.max_validity_days) insertPayload.max_validity_days = validityData.max_validity_days;
    if (validityData.review_only !== undefined) insertPayload.review_only = validityData.review_only;
  }

  const { error } = await adminClient
    .from('categories')
    .insert(insertPayload);

  if (error) {
    console.error("Error creating category:", error);
    throw error;
  }
}
