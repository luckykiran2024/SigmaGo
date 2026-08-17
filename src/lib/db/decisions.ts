import { adminClient } from '@/lib/supabase/admin';

export interface DecisionRecordFilterParams {
  tenantId: string;
  userId: string;
  userEmail: string;
  scope?: 'all' | 'raised_by_me' | 'involved_me' | 'approved_by_me';
  types?: string[]; // STRUCTURAL | TRANSACTIONAL | EXCEPTION | PROCESS
  state?: 'sealed' | 'in_flight' | 'rejected' | 'superseded';
  categoryId?: string;
  dateRange?: 'this_quarter' | 'this_year' | 'all';
  query?: string;
  cursorFinalizedAt?: string;
  cursorId?: string;
  limit?: number;
}

export interface DecisionRecordItem {
  id: string;
  ref: string;
  subject: string;
  status: string;
  created_at: string;
  finalized_at: string | null;
  checksum_sha256: string | null;
  archived: boolean;
  category: {
    id: string;
    name: string;
    step_type: string;
  } | null;
  owner: {
    id: string;
    name: string;
    email: string;
  } | null;
  final_approver?: {
    id: string;
    name: string;
  } | null;
  precedent_count: number;
  reasoning: string;
  is_sealed: boolean;
  is_in_flight: boolean;
  is_rejected: boolean;
  is_superseded: boolean;
}

export interface DecisionRecordListResult {
  items: DecisionRecordItem[];
  totalCount: number;
  retrievalDurationSeconds: number;
  nextCursorFinalizedAt: string | null;
  nextCursorId: string | null;
  hasMore: boolean;
}

export async function getDecisionRecordList(
  params: DecisionRecordFilterParams
): Promise<DecisionRecordListResult> {
  const startTime = performance.now();
  const limit = params.limit || 50;

  // 1. Resolve category permissions for user
  // User can see categories with default_visibility = 'open'
  const { data: openCategories } = await adminClient
    .from('categories')
    .select('id')
    .eq('tenant_id', params.tenantId)
    .eq('default_visibility', 'open');

  const openCategoryIds = openCategories?.map((c) => c.id) || [];

  // Find approver record for this user to check authorities
  const { data: approverRec } = await adminClient
    .from('approvers')
    .select('id')
    .eq('tenant_id', params.tenantId)
    .eq('email', params.userEmail)
    .is('removed_at', null)
    .maybeSingle();

  let authorityCategoryIds: string[] = [];
  if (approverRec) {
    const { data: auths } = await adminClient
      .from('approver_authorities')
      .select('category_id')
      .eq('tenant_id', params.tenantId)
      .eq('approver_id', approverRec.id);

    authorityCategoryIds = auths?.map((a) => a.category_id) || [];
  }

  // 2. Query requests for this tenant with relations
  let query = adminClient
    .from('approval_requests')
    .select(
      `
      id,
      ref,
      subject,
      status,
      created_at,
      finalized_at,
      checksum_sha256,
      archived,
      category_id,
      owner_id,
      body_json,
      categories!category_id (id, name, step_type, default_visibility),
      users!owner_id (id, name, email),
      approval_steps (id, approver_id, status, type, acted_at, comment, users!approver_id(id, name)),
      request_participants (email)
    `
    )
    .eq('tenant_id', params.tenantId);

  // Apply scope filtering (§4)
  const normalizedEmail = params.userEmail.toLowerCase().trim();
  const isRaisedByMe = params.scope === 'raised_by_me';
  const isInvolvedMe = params.scope === 'involved_me';
  const isApprovedByMe = params.scope === 'approved_by_me';

  if (isRaisedByMe) {
    query = query.eq('owner_id', params.userId);
  }

  // Apply category filter
  if (params.categoryId) {
    query = query.eq('category_id', params.categoryId);
  }

  // Apply state filter
  if (params.state === 'sealed') {
    query = query.or('checksum_sha256.not.is.null,status.eq.approved');
  } else if (params.state === 'in_flight') {
    query = query.in('status', ['pending', 'draft', 'in_discussion']);
  } else if (params.state === 'rejected') {
    query = query.eq('status', 'rejected');
  }

  // Order by recency (finalized_at DESC, created_at DESC)
  query = query.order('created_at', { ascending: false }).limit(limit + 1);

  const { data: rawRequests, error } = await query;
  if (error) {
    console.error('Error querying decision record list:', error);
    throw error;
  }

  // 3. Filter rows in memory for strict authorization & full-text search
  let filtered = (rawRequests || []).filter((req: any) => {
    // Permission check (§4): Must be owner, assigned approver, participant, open category, or authority category
    const isOwner = req.owner_id === params.userId;
    const isOnPath = req.approval_steps?.some((s: any) => s.approver_id === params.userId);
    const isParticipant = req.request_participants?.some((p: any) => p.email?.toLowerCase().trim() === normalizedEmail);
    const isOpenCategory = openCategoryIds.includes(req.category_id);
    const isAuthorityCategory = authorityCategoryIds.includes(req.category_id);

    const hasAccess = isOwner || isOnPath || isParticipant || isOpenCategory || isAuthorityCategory;
    if (!hasAccess) return false;

    // Filter scope
    if (isInvolvedMe && !isOwner && !isOnPath && !isParticipant) return false;
    if (isApprovedByMe) {
      const hasApproved = req.approval_steps?.some((s: any) => s.approver_id === params.userId && s.status === 'approved');
      if (!hasApproved) return false;
    }

    // Filter STEP types
    if (params.types && params.types.length > 0) {
      const catStepType = req.categories?.step_type || 'TRANSACTIONAL';
      if (!params.types.includes(catStepType)) return false;
    }

    // Filter Date Range
    if (params.dateRange && params.dateRange !== 'all') {
      const dateToCheck = new Date(req.finalized_at || req.created_at);
      const now = new Date();
      if (params.dateRange === 'this_year') {
        if (dateToCheck.getFullYear() !== now.getFullYear()) return false;
      } else if (params.dateRange === 'this_quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const reqQuarter = Math.floor(dateToCheck.getMonth() / 3);
        if (dateToCheck.getFullYear() !== now.getFullYear() || reqQuarter !== currentQuarter) {
          return false;
        }
      }
    }

    // Filter Full-Text Query
    if (params.query && params.query.trim().length > 0) {
      const q = params.query.toLowerCase().trim();
      const subjectMatch = req.subject?.toLowerCase().includes(q);
      const refMatch = req.ref?.toLowerCase().includes(q);
      const ownerMatch = req.users?.name?.toLowerCase().includes(q);
      const reasoningMatch = req.approval_steps?.some((s: any) => s.comment?.toLowerCase().includes(q));
      const bodyTextMatch = JSON.stringify(req.body_json || {}).toLowerCase().includes(q);

      if (!subjectMatch && !refMatch && !ownerMatch && !reasoningMatch && !bodyTextMatch) {
        return false;
      }
    }

    return true;
  });

  const hasMore = filtered.length > limit;
  if (hasMore) {
    filtered = filtered.slice(0, limit);
  }

  // 4. Execute single batch query for precedent counts across the visible items (§5)
  const visibleItemIds = filtered.map((f: any) => f.id);
  const precedentCountsMap = new Map<string, number>();

  if (visibleItemIds.length > 0) {
    const { data: refRows } = await adminClient
      .from('decision_references')
      .select('source_id')
      .eq('tenant_id', params.tenantId)
      .in('source_id', visibleItemIds);

    if (refRows) {
      for (const row of refRows) {
        precedentCountsMap.set(row.source_id, (precedentCountsMap.get(row.source_id) || 0) + 1);
      }
    }
  }

  // 5. Map results to DecisionRecordItem payload
  const items: DecisionRecordItem[] = filtered.map((req: any) => {
    const isSealed = Boolean(req.checksum_sha256 || req.status === 'approved');
    const isInFlight = ['pending', 'draft', 'in_discussion'].includes(req.status);
    const isRejected = req.status === 'rejected';

    const lastApprovedStep = req.approval_steps
      ?.filter((s: any) => s.status === 'approved')
      ?.sort((a: any, b: any) => new Date(b.acted_at || 0).getTime() - new Date(a.acted_at || 0).getTime())[0];

    const finalApproverName = lastApprovedStep?.users?.name;
    const commentsList = req.approval_steps?.map((s: any) => s.comment).filter(Boolean) || [];

    return {
      id: req.id,
      ref: req.ref || `REQ-${req.id.slice(0, 8)}`,
      subject: req.subject,
      status: req.status,
      created_at: req.created_at,
      finalized_at: req.finalized_at,
      checksum_sha256: req.checksum_sha256,
      archived: Boolean(req.archived),
      category: req.categories
        ? {
            id: req.categories.id,
            name: req.categories.name,
            step_type: req.categories.step_type || 'TRANSACTIONAL',
          }
        : null,
      owner: req.users
        ? {
            id: req.users.id,
            name: req.users.name,
            email: req.users.email,
          }
        : null,
      final_approver: finalApproverName ? { id: '', name: finalApproverName } : null,
      precedent_count: precedentCountsMap.get(req.id) || 0,
      reasoning: commentsList.join(' ') || 'No reasoning commentary recorded.',
      is_sealed: isSealed,
      is_in_flight: isInFlight,
      is_rejected: isRejected,
      is_superseded: false,
    };
  });

  const endTime = performance.now();
  const retrievalDurationSeconds = Number(((endTime - startTime) / 1000).toFixed(2));
  const lastItem = items[items.length - 1];

  return {
    items,
    totalCount: items.length,
    retrievalDurationSeconds,
    nextCursorFinalizedAt: lastItem?.finalized_at || null,
    nextCursorId: lastItem?.id || null,
    hasMore,
  };
}
