'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { createWorkflow, updateWorkflow, deleteWorkflow, WorkflowStep } from '@/lib/db/workflows';
import { revalidatePath } from 'next/cache';

async function checkAdmin(tenantSubdomain: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthenticated');
  }

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenantSubdomain)
    .single();

  if (!tenant) throw new Error('Tenant not found');

  const profile = await getProfileForAuthUser(user.id, user.email || '');

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin' && profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
    throw new Error('Unauthorized - Admin privileges required');
  }

  return { tenantId: tenant.id, userId: profile.id };
}

export async function saveWorkflowAction(
  tenantSubdomain: string,
  payload: {
    id?: string;
    name: string;
    categoryId: string | null;
    isLocked: boolean;
    steps: WorkflowStep[];
  }
) {
  const { tenantId } = await checkAdmin(tenantSubdomain);

  // Validate that categoryId belongs to this tenant if provided
  if (payload.categoryId) {
    const { data: category } = await adminClient
      .from('categories')
      .select('id')
      .eq('id', payload.categoryId)
      .eq('tenant_id', tenantId)
      .single();

    if (!category) {
      throw new Error('Category not found or does not belong to this tenant');
    }
  }

  let result;
  if (payload.id) {
    result = await updateWorkflow(payload.id, tenantId, {
      categoryId: payload.categoryId,
      name: payload.name,
      isLocked: payload.isLocked,
      steps: payload.steps
    });
  } else {
    result = await createWorkflow({
      tenantId,
      categoryId: payload.categoryId,
      name: payload.name,
      isLocked: payload.isLocked,
      steps: payload.steps
    });
  }

  revalidatePath(`/${tenantSubdomain}/admin/workflows`);
  revalidatePath(`/${tenantSubdomain}/requests/new`);
  return result;
}

export async function deleteWorkflowAction(tenantSubdomain: string, workflowId: string) {
  const { tenantId } = await checkAdmin(tenantSubdomain);
  await deleteWorkflow(workflowId, tenantId);
  revalidatePath(`/${tenantSubdomain}/admin/workflows`);
  revalidatePath(`/${tenantSubdomain}/requests/new`);
  return true;
}
