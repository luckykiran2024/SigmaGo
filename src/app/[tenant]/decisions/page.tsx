import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { getDecisionRecordList, DecisionRecordListResult } from '@/lib/db/decisions';
import DecisionRecordRegister from './DecisionRecordRegister';

export default async function DecisionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    q?: string;
    scope?: 'all' | 'raised_by_me' | 'involved_me' | 'approved_by_me';
    state?: 'sealed' | 'in_flight' | 'rejected' | 'superseded';
    types?: string;
    category?: string;
    date?: 'this_quarter' | 'this_year' | 'all';
    cursorId?: string;
  }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve tenant ID
  const { data: tenantData } = await adminClient
    .from('tenants')
    .select('id, name')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenantData) {
    return <div className="p-8 text-center text-[#B42318] font-bold">Tenant not found.</div>;
  }

  const tenantId = tenantData.id;

  // Resolve logged-in public user
  const loggedInPublicUser = await getProfileForAuthUser(user.id, user.email || '');
  if (!loggedInPublicUser) redirect('/login');

  // Fetch categories for filtering
  const { data: categories } = await adminClient
    .from('categories')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  // Query decision record list with timing and permission scoping (§4 & §5)
  let result: DecisionRecordListResult = {
    items: [],
    totalCount: 0,
    retrievalDurationSeconds: 0.1,
    nextCursorFinalizedAt: null,
    nextCursorId: null,
    hasMore: false,
  };

  try {
    result = await getDecisionRecordList({
      tenantId,
      userId: loggedInPublicUser.id,
      userEmail: loggedInPublicUser.email || user.email || '',
      query: resolvedSearchParams.q,
      scope: resolvedSearchParams.scope,
      state: resolvedSearchParams.state,
      types: resolvedSearchParams.types ? resolvedSearchParams.types.split(',') : undefined,
      categoryId: resolvedSearchParams.category,
      dateRange: resolvedSearchParams.date,
      cursorId: resolvedSearchParams.cursorId,
      limit: 50,
    });
  } catch (err) {
    console.error('Error in getDecisionRecordList:', err);
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-8">
      <DecisionRecordRegister
        tenantSubdomain={resolvedParams.tenant}
        initialItems={result.items}
        initialDuration={result.retrievalDurationSeconds}
        categories={categories || []}
      />
    </div>
  );
}
