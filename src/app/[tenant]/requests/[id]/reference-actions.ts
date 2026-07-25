'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantMember } from '@/lib/auth/guards';
import { addReference, removeReference } from '@/lib/db/references';
import { adminClient } from '@/lib/supabase/admin';

export async function addReferenceAction(tenantSubdomain: string, formData: FormData) {
  const { profile, tenantId } = await requireTenantMember(tenantSubdomain);

  const sourceId = formData.get('sourceId') as string;
  const targetId = formData.get('targetId') as string;
  const relationship = formData.get('relationship') as string;
  const note = (formData.get('note') as string) || null;

  if (!sourceId || !targetId || !relationship) {
    throw new Error('Missing required reference fields.');
  }

  // Validate targetId format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(targetId)) {
    throw new Error('Invalid target decision ID.');
  }

  await addReference(
    tenantId,
    sourceId,
    targetId,
    relationship,
    note,
    profile.id
  );

  revalidatePath(`/${tenantSubdomain}/requests/${sourceId}`);
  revalidatePath(`/${tenantSubdomain}/requests/${targetId}`);
  return { success: true };
}

export async function removeReferenceAction(tenantSubdomain: string, formData: FormData) {
  const { profile, tenantId } = await requireTenantMember(tenantSubdomain);

  const referenceId = formData.get('referenceId') as string;
  const sourceId = formData.get('sourceId') as string;

  if (!referenceId || !sourceId) {
    throw new Error('Missing reference ID.');
  }

  await removeReference(tenantId, referenceId, profile.id);

  revalidatePath(`/${tenantSubdomain}/requests/${sourceId}`);
  return { success: true };
}

export async function searchDecisionsAction(tenantSubdomain: string, query: string) {
  const { tenantId } = await requireTenantMember(tenantSubdomain);

  if (!query || query.trim().length === 0) {
    return [];
  }

  const cleanQuery = query.trim();

  // Search by subject, ref prefix, or category
  const { data, error } = await adminClient
    .from('approval_requests')
    .select(`
      id,
      ref,
      subject,
      status,
      categories(name)
    `)
    .eq('tenant_id', tenantId)
    .or(`subject.ilike.%${cleanQuery}%,ref.ilike.%${cleanQuery}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return data.map((item: any) => ({
    id: item.id,
    ref: item.ref,
    subject: item.subject,
    status: item.status,
    category_name: item.categories?.name || 'General',
  }));
}
