'use server';

import { adminClient } from '@/lib/supabase/admin';

export async function createCategoryAction(
  tenantId: string,
  name: string,
  defaultSlaHours: number
): Promise<void> {
  const { error } = await adminClient
    .from('categories')
    .insert({
      tenant_id: tenantId,
      name: name,
      default_sla_hours: defaultSlaHours,
      default_chain: [] // empty workflow chain
    });

  if (error) {
    console.error("Error creating category:", error);
    throw error;
  }
}
