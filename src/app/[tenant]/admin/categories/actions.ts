'use server';

import { adminClient } from '@/lib/supabase/admin';
import { requireTenantAdmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

export async function createCategoryAction(
  tenantSubdomain: string,
  name: string,
  defaultSlaHours: number,
  validityData?: {
    validity_mode?: 'NONE' | 'OPTIONAL' | 'REQUIRED';
    default_validity_days?: number | null;
    max_validity_days?: number | null;
    review_only?: boolean;
  }
): Promise<void> {
  // C1 & C2 Fix: Authenticate, verify tenant membership, and derive tenantId server-side
  const { tenantId } = await requireTenantAdmin(tenantSubdomain);

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

  revalidatePath(`/${tenantSubdomain}/admin/categories`);
}
