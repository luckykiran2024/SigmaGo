import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { getProfileForAuthUser } from '@/lib/db/users';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).format(new Date(dateStr));
}

export default async function TenantDashboard({ params }: { params: Promise<{ tenant: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  // Run tenant lookup and getUser concurrently to optimize page load latency
  const [authUserRes, tenantRes] = await Promise.all([
    supabase.auth.getUser(),
    adminClient
      .from('tenants')
      .select('id, name')
      .eq('subdomain', resolvedParams.tenant)
      .single()
  ]);

  const user = authUserRes.data.user;
  const tenantData = tenantRes.data;

  if (!user) redirect('/login');
  if (!tenantData) redirect('/login');
  const tenantId = tenantData.id;

  // 2. Resolve the logged-in user's public profile id (linking auth_user_id if not done yet)
  const publicUser = await getProfileForAuthUser(user.id, user.email || '');

  const userName = publicUser?.name || user.email?.split('@')[0] || 'Member';

  // 1. Fetch active delegations where the logged-in user is the delegate
  const nowStr = new Date().toISOString();
  const { data: activeDelegations } = await supabase
    .from('delegations')
    .select('delegator_id, delegator:users!delegator_id(name)')
    .eq('tenant_id', tenantId)
    .eq('delegate_id', publicUser?.id)
    .eq('status', 'active')
    .filter('', 'and', `(or(starts_at.is.null,starts_at.lte.${nowStr}),or(ends_at.is.null,ends_at.gte.${nowStr}))`);

  const delegatorIds = activeDelegations?.map((d: any) => d.delegator_id) || [];
  const delegatorNamesMap = new Map((activeDelegations || []).map((d: any) => [d.delegator_id, d.delegator?.name || 'Unknown']));

  // Run my requests and pending approvals queries concurrently
  const [myRequestsRes, pendingApprovalsRes] = await Promise.all([
    supabase
      .from('approval_requests')
      .select('id, subject, status, created_at, category_id, categories(name)')
      .eq('tenant_id', tenantId)
      .eq('owner_id', publicUser?.id)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('approval_steps')
      .select('request_id, status, approver_id, approval_requests(id, subject, status, created_at, owner:users!owner_id(name))')
      .in('approver_id', [publicUser?.id, ...delegatorIds])
      .eq('status', 'pending')
      .limit(10)
  ]);

  const myRequests = myRequestsRes.data;
  const pendingApprovals = pendingApprovalsRes.data;

  // Deduplicate actionRequired requests by request id
  const actionRequiredMap = new Map();
  if (pendingApprovals) {
    for (const step of pendingApprovals) {
      const rawReq = step.approval_requests;
      if (rawReq) {
        const req = Array.isArray(rawReq) ? rawReq[0] : rawReq;
        if (req && !actionRequiredMap.has(req.id)) {
          const rawOwner = req.owner;
          const owner = Array.isArray(rawOwner) ? rawOwner[0] : rawOwner;
          
          const delegatedFrom = step.approver_id !== publicUser?.id 
            ? (delegatorNamesMap.get(step.approver_id) || 'Unknown Approver')
            : null;

          actionRequiredMap.set(req.id, {
            ...req,
            owner,
            delegatedFrom
          });
        }
      }
    }
  }
  const actionRequired = Array.from(actionRequiredMap.values());

  const pendingCount = actionRequired.length;
  const submittedCount = myRequests?.length || 0;

  return (
    <div className="space-y-10 py-4 font-body">
      {/* Header section with Welcome text */}
      <div className="md:flex md:items-center md:justify-between border-b border-gray-100 pb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-ink">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            Welcome back, <span className="text-ink font-bold">{userName}</span>. Manage your approvals for {tenantData.name}.
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link
            href={`/${resolvedParams.tenant}/requests/new`}
            className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/10 hover:bg-accent-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transform hover:-translate-y-0.5 active:translate-y-0 transition duration-150"
          >
            <svg className="w-5 h-5 mr-1.5 -ml-1 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Request
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Action Required Card */}
        <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Action Required</p>
            <p className="mt-2 text-3xl font-extrabold text-ink font-display">{pendingCount}</p>
          </div>
          <div className={`p-4 rounded-xl ${pendingCount > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-400'}`}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
        </div>

        {/* My Submissions Card */}
        <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">My Submissions</p>
            <p className="mt-2 text-3xl font-extrabold text-ink font-display">{submittedCount}</p>
          </div>
          <div className="p-4 rounded-xl bg-accent/5 text-accent">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Action Required List (Left 2 columns on large screen) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-ink font-display">Action Required</h2>
            {pendingCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-800 border border-yellow-100">
                {pendingCount} Pending Approval
              </span>
            )}
          </div>
          
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {actionRequired.length === 0 ? (
                <li className="px-6 py-12 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-2">
                  <div className="p-3 bg-gray-50 rounded-full text-gray-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-500">Inbox is clean!</span>
                  <span>You have no pending requests to approve.</span>
                </li>
              ) : (
                actionRequired.map((req: any) => (
                  <li key={req.id} className="transition hover:bg-gray-50/50">
                    <Link href={`/${resolvedParams.tenant}/requests/${req.id}`} className="block px-6 py-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <p className="text-base font-bold text-ink truncate group-hover:text-accent transition">{req.subject}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                            <span>Submitted by <span className="text-gray-700 font-semibold">{req.owner?.name || 'Unknown'}</span></span>
                            <span>•</span>
                            <span>Created {formatDate(req.created_at)}</span>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {req.delegatedFrom && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                              Delegated from {req.delegatedFrom}
                            </span>
                          )}
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-100 uppercase tracking-wider">
                            Needs Your Review
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* My Requests List (Right 1 column on large screen) */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-ink font-display">My Submissions</h2>
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {(!myRequests || myRequests.length === 0) ? (
                <li className="px-6 py-12 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-2">
                  <div className="p-3 bg-gray-50 rounded-full text-gray-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-500">No submissions yet</span>
                  <span>You haven't submitted any approval requests.</span>
                </li>
              ) : (
                myRequests.map((req: any) => (
                  <li key={req.id} className="transition hover:bg-gray-50/50">
                    <Link href={`/${resolvedParams.tenant}/requests/${req.id}`} className="block px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-ink truncate">{req.subject}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider ${
                            req.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                            req.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                            req.status === 'in_discussion' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-yellow-50 text-yellow-700 border border-yellow-100'
                          }`}>
                            {req.status === 'in_discussion' ? 'in discussion' : req.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-2xs text-gray-400 font-medium">
                          <span>{req.categories?.name || 'Uncategorized'}</span>
                          <span>{formatDate(req.created_at)}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}