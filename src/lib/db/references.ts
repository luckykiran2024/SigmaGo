import { adminClient } from '../supabase/admin';

export type RelationshipType = 'based_on' | 'replaces' | 'exception_to' | 'renewal_of';

export const ALLOWED_RELATIONSHIPS: RelationshipType[] = [
  'based_on',
  'replaces',
  'exception_to',
  'renewal_of',
];

export interface DecisionReference {
  id: string;
  tenant_id: string;
  source_id: string;
  target_id: string;
  relationship: RelationshipType;
  note?: string | null;
  created_by: string;
  created_at: string;
  target_request?: {
    id: string;
    ref: string;
    subject: string;
    status: string;
    category_name?: string;
  };
  source_request?: {
    id: string;
    ref: string;
    subject: string;
    status: string;
    created_at: string;
    category_name?: string;
  };
}

/** Add a typed decision reference asserting strict tenant isolation */
export async function addReference(
  tenantId: string,
  sourceId: string,
  targetId: string,
  relationship: string,
  note?: string | null,
  createdBy?: string
) {
  // 1. Validate relationship
  if (!ALLOWED_RELATIONSHIPS.includes(relationship as RelationshipType)) {
    throw new Error(
      `Invalid relationship. Must be one of: ${ALLOWED_RELATIONSHIPS.join(', ')}`
    );
  }

  // 2. Validate no self-reference
  if (sourceId === targetId) {
    throw new Error('Self-references are not allowed.');
  }

  // 3. CRITICAL TENANT ISOLATION Assertion: Both source & target MUST belong to tenantId
  const { data: sourceReq, error: sourceErr } = await adminClient
    .from('approval_requests')
    .select('id, ref, tenant_id, owner_id')
    .eq('id', sourceId)
    .eq('tenant_id', tenantId)
    .single();

  if (sourceErr || !sourceReq) {
    throw new Error('Source decision not found or tenant mismatch.');
  }

  const { data: targetReq, error: targetErr } = await adminClient
    .from('approval_requests')
    .select('id, ref, tenant_id')
    .eq('id', targetId)
    .eq('tenant_id', tenantId)
    .single();

  if (targetErr || !targetReq) {
    throw new Error('Target decision not found or tenant mismatch.');
  }

  // 4. Validate no direct circular pair
  const { data: circularCheck } = await adminClient
    .from('decision_references')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('source_id', targetId)
    .eq('target_id', sourceId)
    .eq('relationship', relationship)
    .maybeSingle();

  if (circularCheck) {
    throw new Error(`Circular reference pair detected for relationship '${relationship}'.`);
  }

  // 5. Insert into decision_references
  const { data: createdRef, error: insertErr } = await adminClient
    .from('decision_references')
    .insert({
      tenant_id: tenantId,
      source_id: sourceId,
      target_id: targetId,
      relationship,
      note: note || null,
      created_by: createdBy || sourceReq.owner_id,
    })
    .select()
    .single();

  if (insertErr || !createdRef) {
    throw new Error(`Failed to add reference: ${insertErr?.message || 'Unknown error'}`);
  }

  // 6. Write to audit_log
  await adminClient.from('audit_log').insert({
    tenant_id: tenantId,
    request_id: sourceId,
    actor_id: createdBy || sourceReq.owner_id,
    action_type: 'reference_added',
    metadata: {
      relationship,
      source_ref: sourceReq.ref,
      target_ref: targetReq.ref,
      reference_id: createdRef.id,
      note,
    },
  });

  return createdRef;
}

/** Remove a decision reference asserting tenant isolation */
export async function removeReference(
  tenantId: string,
  referenceId: string,
  removedBy: string
) {
  const { data: existing, error: loadErr } = await adminClient
    .from('decision_references')
    .select('id, source_id, target_id, relationship, tenant_id')
    .eq('id', referenceId)
    .eq('tenant_id', tenantId)
    .single();

  if (loadErr || !existing) {
    throw new Error('Reference not found or tenant mismatch.');
  }

  const { error: deleteErr } = await adminClient
    .from('decision_references')
    .delete()
    .eq('id', referenceId)
    .eq('tenant_id', tenantId);

  if (deleteErr) {
    throw new Error(`Failed to delete reference: ${deleteErr.message}`);
  }

  await adminClient.from('audit_log').insert({
    tenant_id: tenantId,
    request_id: existing.source_id,
    actor_id: removedBy,
    action_type: 'reference_removed',
    metadata: {
      reference_id: referenceId,
      relationship: existing.relationship,
    },
  });

  return true;
}

/** Get outgoing references where source_id = requestId */
export async function getOutgoingReferences(
  tenantId: string,
  requestId: string
): Promise<DecisionReference[]> {
  const { data, error } = await adminClient
    .from('decision_references')
    .select(`
      id,
      tenant_id,
      source_id,
      target_id,
      relationship,
      note,
      created_by,
      created_at,
      approval_requests!decision_references_target_id_fkey(
        id,
        ref,
        subject,
        status,
        categories(name)
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('source_id', requestId)
    .order('relationship')
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return data.map((item: any) => ({
    id: item.id,
    tenant_id: item.tenant_id,
    source_id: item.source_id,
    target_id: item.target_id,
    relationship: item.relationship as RelationshipType,
    note: item.note,
    created_by: item.created_by,
    created_at: item.created_at,
    target_request: item.approval_requests
      ? {
          id: item.approval_requests.id,
          ref: item.approval_requests.ref,
          subject: item.approval_requests.subject,
          status: item.approval_requests.status,
          category_name: item.approval_requests.categories?.name,
        }
      : undefined,
  }));
}

/** Get incoming references where target_id = requestId (POWER QUERY) */
export async function getIncomingReferences(
  tenantId: string,
  requestId: string
): Promise<DecisionReference[]> {
  const { data, error } = await adminClient
    .from('decision_references')
    .select(`
      id,
      tenant_id,
      source_id,
      target_id,
      relationship,
      note,
      created_by,
      created_at,
      approval_requests!decision_references_source_id_fkey(
        id,
        ref,
        subject,
        status,
        created_at,
        categories(name)
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('target_id', requestId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((item: any) => ({
    id: item.id,
    tenant_id: item.tenant_id,
    source_id: item.source_id,
    target_id: item.target_id,
    relationship: item.relationship as RelationshipType,
    note: item.note,
    created_by: item.created_by,
    created_at: item.created_at,
    source_request: item.approval_requests
      ? {
          id: item.approval_requests.id,
          ref: item.approval_requests.ref,
          subject: item.approval_requests.subject,
          status: item.approval_requests.status,
          created_at: item.approval_requests.created_at,
          category_name: item.approval_requests.categories?.name,
        }
      : undefined,
  }));
}

/** Get count of exception_to references for a policy decision */
export async function getExceptionCount(
  tenantId: string,
  policyRequestId: string
): Promise<number> {
  const { count, error } = await adminClient
    .from('decision_references')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('target_id', policyRequestId)
    .eq('relationship', 'exception_to');

  if (error || count === null) return 0;
  return count;
}

/** Walk reference chain (e.g. A replaces B replaces C) capped at 20 hops */
export async function getReferenceChain(
  tenantId: string,
  requestId: string,
  relationship: RelationshipType = 'replaces'
): Promise<Array<{ id: string; ref: string; subject: string; status: string }>> {
  const chain: Array<{ id: string; ref: string; subject: string; status: string }> = [];
  let currentId = requestId;
  let hops = 0;

  while (currentId && hops < 20) {
    const { data: ref } = await adminClient
      .from('decision_references')
      .select(`
        target_id,
        approval_requests!decision_references_target_id_fkey(id, ref, subject, status)
      `)
      .eq('tenant_id', tenantId)
      .eq('source_id', currentId)
      .eq('relationship', relationship)
      .maybeSingle();

    if (!ref || !ref.approval_requests) break;

    const target = ref.approval_requests as any;
    chain.push({
      id: target.id,
      ref: target.ref,
      subject: target.subject,
      status: target.status,
    });

    currentId = ref.target_id;
    hops++;
  }

  return chain;
}
