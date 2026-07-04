import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { redirect } from 'next/navigation';
import ApprovalsSearchList from './ApprovalsSearchList';

export default async function ApprovalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  // 1. Resolve user auth session and tenant data concurrently to optimize page load latency
  const [authUserRes, tenantRes] = await Promise.all([
    supabase.auth.getUser(),
    adminClient
      .from('tenants')
      .select('id, name')
      .eq('subdomain', resolvedParams.tenant)
      .single()
  ]);

  const user = authUserRes.data?.user;
  const tenantData = tenantRes.data;

  if (!user) redirect('/login');
  if (!tenantData) redirect('/login');
  const tenantId = tenantData.id;

  // 2. Resolve public user profile
  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) redirect('/login');

  const nowStr = new Date().toISOString();
  const { data: activeDelegations } = await supabase
    .from('delegations')
    .select('delegator_id')
    .eq('tenant_id', tenantId)
    .eq('delegate_id', profile.id)
    .eq('status', 'active')
    .filter('', 'and', `(or(starts_at.is.null,starts_at.lte.${nowStr}),or(ends_at.is.null,ends_at.gte.${nowStr}))`);

  const delegatorIds = activeDelegations?.map((d: any) => d.delegator_id) || [];

  // Parse filters from searchParams
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : 'all';
  const categoryId = typeof resolvedSearchParams.category_id === 'string' ? resolvedSearchParams.category_id : 'all';
  const ownerId = typeof resolvedSearchParams.owner_id === 'string' ? resolvedSearchParams.owner_id : '';
  const fromDate = typeof resolvedSearchParams.from_date === 'string' ? resolvedSearchParams.from_date : '';
  const toDate = typeof resolvedSearchParams.to_date === 'string' ? resolvedSearchParams.to_date : '';

  // Get selected owner details for filter chips
  let selectedOwner = null;
  if (ownerId) {
    const { data: userData } = await adminClient
      .from('users')
      .select('name')
      .eq('id', ownerId)
      .maybeSingle();
    if (userData) {
      selectedOwner = { id: ownerId, name: userData.name };
    }
  }

  // Fetch all active categories of this tenant for filter dropdown
  const { data: categories } = await adminClient
    .from('categories')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  // 3. Build Raised by Me query with server-side filters
  let raisedQuery = supabase
    .from('approval_requests')
    .select('id, subject, status, created_at, category_id, owner_id, categories(name)')
    .eq('tenant_id', tenantId)
    .eq('owner_id', profile.id)
    .eq('archived', false);

  if (q) raisedQuery = raisedQuery.ilike('subject', `%${q}%`);
  if (status !== 'all') raisedQuery = raisedQuery.eq('status', status);
  if (categoryId !== 'all') raisedQuery = raisedQuery.eq('category_id', categoryId);
  if (ownerId) {
    // Since this is raised by me, if ownerId is set to someone else, this query returns nothing
    raisedQuery = raisedQuery.eq('owner_id', ownerId);
  }
  if (fromDate) raisedQuery = raisedQuery.gte('created_at', fromDate);
  if (toDate) {
    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);
    raisedQuery = raisedQuery.lte('created_at', endOfDay.toISOString());
  }

  // 4. Build Involved steps query with server-side filters using inner joins
  let stepQuery = supabase
    .from('approval_steps')
    .select(`
      request_id,
      type,
      status,
      approval_requests!inner (
        id,
        subject,
        status,
        created_at,
        category_id,
        owner_id,
        tenant_id,
        categories ( name )
      )
    `)
    .in('approver_id', [profile.id, ...delegatorIds])
    .eq('approval_requests.tenant_id', tenantId)
    .eq('approval_requests.archived', false);

  if (q) stepQuery = stepQuery.ilike('approval_requests.subject', `%${q}%`);
  if (status !== 'all') stepQuery = stepQuery.eq('approval_requests.status', status);
  if (categoryId !== 'all') stepQuery = stepQuery.eq('approval_requests.category_id', categoryId);
  if (ownerId) stepQuery = stepQuery.eq('approval_requests.owner_id', ownerId);
  if (fromDate) stepQuery = stepQuery.gte('approval_requests.created_at', fromDate);
  if (toDate) {
    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);
    stepQuery = stepQuery.lte('approval_requests.created_at', endOfDay.toISOString());
  }

  // 5. Execute Raised by Me and Involved steps queries concurrently
  const [raisedByMeRes, involvedStepsRes] = await Promise.all([
    raisedQuery,
    stepQuery
  ]);

  const raisedByMe = raisedByMeRes.data || [];
  const involvedSteps = involvedStepsRes.data || [];

  // Deduplicate and map involved requests
  const involvedMap = new Map();
  involvedSteps.forEach((step: any) => {
    const req = step.approval_requests;
    if (req) {
      const existing = involvedMap.get(req.id);
      const typePriority: { [key: string]: number } = { 'GENERAL': 3, 'PARALLEL': 2, 'REFERENCE': 1 };
      const currentPriority = typePriority[step.type] || 0;
      const existingPriority = existing ? (typePriority[existing.user_role] || 0) : 0;

      if (!existing || currentPriority > existingPriority) {
        involvedMap.set(req.id, {
          ...req,
          user_role: step.type
        });
      }
    }
  });

  const involvedIn = Array.from(involvedMap.values());

  // 6. Build and execute Archived requests query for admin
  let archivedRequests: any[] = [];
  const isAdmin = profile && (
    profile.role === 'admin' ||
    profile.role === 'super_admin' ||
    profile.role === 'ADMIN' ||
    profile.role === 'SUPER_ADMIN'
  );

  if (isAdmin) {
    let archivedQuery = adminClient
      .from('approval_requests')
      .select(`
        id,
        subject,
        status,
        created_at,
        category_id,
        owner_id,
        owner:users!owner_id ( name, email, employee_id ),
        categories ( name )
      `)
      .eq('tenant_id', tenantId)
      .eq('archived', true);

    if (q) archivedQuery = archivedQuery.ilike('subject', `%${q}%`);
    if (status !== 'all') archivedQuery = archivedQuery.eq('status', status);
    if (categoryId !== 'all') archivedQuery = archivedQuery.eq('category_id', categoryId);
    if (ownerId) archivedQuery = archivedQuery.eq('owner_id', ownerId);
    if (fromDate) archivedQuery = archivedQuery.gte('created_at', fromDate);
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      archivedQuery = archivedQuery.lte('created_at', endOfDay.toISOString());
    }

    const { data: archived } = await archivedQuery.order('created_at', { ascending: false });
    archivedRequests = archived || [];
  }

  // Check if any filters are active
  const hasActiveFilters = !!(q || status !== 'all' || categoryId !== 'all' || ownerId || fromDate || toDate);

  return (
    <div className="space-y-10 py-4 font-body max-w-7xl mx-auto">
      <div className="border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-ink">
          Approvals Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Track, search, and review all approval requests raised by you or requiring your sign-off.
        </p>
      </div>

      <ApprovalsSearchList
        raisedByMe={raisedByMe}
        involvedIn={involvedIn}
        archivedRequests={archivedRequests}
        isAdmin={isAdmin}
        tenantSubdomain={resolvedParams.tenant}
        categories={categories || []}
        selectedOwner={selectedOwner}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  );
}
