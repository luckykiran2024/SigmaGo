import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { ShieldCheck, Search, Filter, RefreshCw } from 'lucide-react';
import StepBadge from '@/components/ui/StepBadge';
import { getProfileForAuthUser } from '@/lib/db/users';
import { collectPages } from '@/lib/intelligence/analytics/pagination';

interface RecordsPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    q?: string;
    scope?: string;
    type?: string;
    state?: string;
  }>;
}

export default async function RecordsPage({ params, searchParams }: RecordsPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const tenantSubdomain = resolvedParams.tenant;

  const query = resolvedSearchParams.q || '';
  const scope = resolvedSearchParams.scope || 'all';
  const typeFilter = resolvedSearchParams.type || 'all';
  const stateFilter = resolvedSearchParams.state || 'all';

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name')
    .eq('subdomain', tenantSubdomain)
    .single();

  if (!tenant) {
    return <div className="p-8 text-center text-[#B42318] font-semibold">Tenant not found</div>;
  }

  // Get current user profile
  const currentUserProfile = user ? await getProfileForAuthUser(user.id, user.email || '') : null;
  if (!currentUserProfile || currentUserProfile.tenant_id !== tenant.id) {
    return <div className="p-8 text-center text-[#B42318] font-semibold">Access denied</div>;
  }

  let recordsQuery = supabase
    .from('approval_requests')
    .select(`
      id, ref, subject, status, checksum_sha256, sealed_at, created_at, finalized_at, resolved_step_type,
      categories!inner ( name, step_type, default_visibility ),
      users!owner_id ( id, name, email )
    `, { count: 'exact' })
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Full-text search over subject and ref
  if (query.trim()) {
    recordsQuery = recordsQuery.or(`subject.ilike.%${query.trim()}%,ref.ilike.%${query.trim()}%`);
  }

  // State filter
  if (stateFilter === 'sealed') {
    recordsQuery = recordsQuery.not('checksum_sha256', 'is', null);
  } else if (stateFilter === 'in_flight') {
    recordsQuery = recordsQuery.eq('status', 'pending');
  } else if (stateFilter === 'rejected') {
    recordsQuery = recordsQuery.eq('status', 'rejected');
  }

  // Type filter
  if (typeFilter !== 'all') {
    const typeName = { S: 'STRUCTURAL', T: 'TRANSACTIONAL', E: 'EXCEPTION', P: 'PROCESS' }[typeFilter.toUpperCase() as 'S' | 'T' | 'E' | 'P'];
    if (typeName) {
      recordsQuery = recordsQuery.eq('resolved_step_type', typeName);
    }
  }

  if (scope === 'raised_by_me') {
    recordsQuery = recordsQuery.eq('owner_id', currentUserProfile.id);
  } else if (scope === 'approved_by_me' || scope === 'involved_me') {
    const assigned = await collectPages<{ request_id: string }>((from, to) => {
      let page = adminClient.from('approval_steps').select('id, request_id')
        .eq('approver_id', currentUserProfile.id).order('id', { ascending: true }).range(from, to);
      if (scope === 'approved_by_me') page = page.eq('status', 'approved');
      return page;
    });
    const requestIds = new Set(assigned.map((step) => step.request_id));
    if (scope === 'involved_me') {
      const [owned, benefiting, grants, participation] = await Promise.all([
        collectPages<{ id: string }>((from, to) => adminClient.from('approval_requests').select('id')
          .eq('tenant_id', tenant.id).eq('owner_id', currentUserProfile.id).order('id', { ascending: true }).range(from, to)),
        collectPages<{ id: string }>((from, to) => adminClient.from('approval_requests').select('id')
          .eq('tenant_id', tenant.id).eq('beneficiary_id', currentUserProfile.id).order('id', { ascending: true }).range(from, to)),
        collectPages<{ request_id: string }>((from, to) => adminClient.from('view_grants').select('id, request_id')
          .eq('grantee_id', currentUserProfile.id).eq('status', 'active').order('id', { ascending: true }).range(from, to)),
        collectPages<{ request_id: string }>((from, to) => adminClient.from('request_participants').select('id, request_id')
          .eq('tenant_id', tenant.id).ilike('email', currentUserProfile.email).order('id', { ascending: true }).range(from, to)),
      ]);
      for (const row of owned) requestIds.add(row.id);
      for (const row of benefiting) requestIds.add(row.id);
      for (const row of grants) requestIds.add(row.request_id);
      for (const row of participation) requestIds.add(row.request_id);
    }
    recordsQuery = requestIds.size ? recordsQuery.in('id', [...requestIds]) : recordsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  const { data: records, count: totalCount, error: recordsError } = await recordsQuery;
  if (recordsError) throw recordsError;
  const recordIds = (records || []).map((record) => record.id);
  const outgoingRefs = recordIds.length ? await collectPages<{ source_id: string }>((from, to) => adminClient
    .from('decision_references').select('source_id').eq('tenant_id', tenant.id)
    .in('source_id', recordIds).order('id', { ascending: true }).range(from, to)) : [];
  const precedentCounts = new Map<string, number>();
  for (const reference of outgoingRefs) {
    precedentCounts.set(reference.source_id, (precedentCounts.get(reference.source_id) || 0) + 1);
  }

  const totalDecisionsCount = totalCount || (records ? records.length : 0);

  const isSearchActive = query.trim().length > 0;
  const isFilterActive = scope !== 'all' || typeFilter !== 'all' || stateFilter !== 'all';

  return (
    <div className="min-h-screen bg-[#F6F8F9]">
      <main className="max-w-[1360px] mx-auto px-6 py-8 font-sans space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DCE5EA] pb-5">
          <div>
            <h1 className="text-[28px] font-semibold text-[#182B3D] tracking-tight">Records</h1>
            <p className="text-[14px] text-[#526679] mt-1">
              Searchable decision history with traceable approvals and integrity seals.
            </p>
          </div>
          <div className="text-[12px] font-mono text-[#526679] bg-white px-3 py-1.5 rounded-[6px] border border-[#DCE5EA] shadow-xs self-start md:self-auto">
            <span className="font-semibold text-[#17324D]">{totalDecisionsCount}</span> {totalDecisionsCount === 1 ? 'decision' : 'decisions'} found
          </div>
        </div>

        {/* Search & Filter Bar */}
        <form method="GET" className="bg-white rounded-[10px] border border-[#DCE5EA] p-4 shadow-xs space-y-3">
          <input type="hidden" name="scope" value={scope} />
          <input type="hidden" name="type" value={typeFilter} />
          <input type="hidden" name="state" value={stateFilter} />
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#637587]" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                autoFocus
                placeholder="Search decisions by subject or reference ID..."
                className="w-full pl-10 pr-4 py-2 bg-[#F6F8F9] border border-[#DCE5EA] rounded-[6px] text-[13.5px] text-[#182B3D] placeholder-[#637587] focus:outline-none focus:ring-2 focus:ring-[#0B7780] transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-4 py-2 bg-[#17324D] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#224564] transition-colors shadow-xs"
            >
              Search
            </button>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#EAF0F2] text-[12px]">
            <span className="flex items-center text-[#637587] font-semibold mr-1">
              <Filter className="w-3.5 h-3.5 mr-1" /> Filters:
            </span>

            {/* Scope Filter Chips */}
            {['all', 'raised_by_me', 'involved_me', 'approved_by_me'].map((s) => (
              <a
                key={s}
                href={`?${new URLSearchParams({ ...resolvedSearchParams, scope: s }).toString()}`}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                  scope === s ? 'bg-[#17324D] text-white' : 'bg-[#EEF2F4] text-[#526679] hover:bg-[#E7EDF0] hover:text-[#17324D]'
                }`}
              >
                {s.replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </a>
            ))}

            <div className="w-[1px] h-4 bg-[#DCE5EA] my-auto mx-1" />

            {/* Type Filter Chips */}
            {['all', 'S', 'T', 'E', 'P'].map((t) => (
              <a
                key={t}
                href={`?${new URLSearchParams({ ...resolvedSearchParams, type: t }).toString()}`}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                  typeFilter === t ? 'bg-[#17324D] text-white' : 'bg-[#EEF2F4] text-[#526679] hover:bg-[#E7EDF0] hover:text-[#17324D]'
                }`}
              >
                {t === 'all' ? 'All Types' : `Type ${t}`}
              </a>
            ))}

            <div className="w-[1px] h-4 bg-[#DCE5EA] my-auto mx-1" />

            {/* State Filter Chips */}
            {['all', 'sealed', 'in_flight', 'rejected'].map((st) => (
              <a
                key={st}
                href={`?${new URLSearchParams({ ...resolvedSearchParams, state: st }).toString()}`}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                  stateFilter === st ? 'bg-[#17324D] text-white' : 'bg-[#EEF2F4] text-[#526679] hover:bg-[#E7EDF0] hover:text-[#17324D]'
                }`}
              >
                {st.replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </a>
            ))}

            {isFilterActive && (
              <a
                href={`/${tenantSubdomain}/records`}
                className="ml-auto flex items-center text-[12px] font-semibold text-[#B42318] hover:underline"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Clear Filters
              </a>
            )}
          </div>
        </form>

        {/* Content & Empty States */}
        {!records || records.length === 0 ? (
          <div className="bg-white rounded-[10px] border border-[#DCE5EA] p-12 text-center shadow-xs">
            {isSearchActive ? (
              <div>
                <h3 className="text-[16px] font-semibold text-[#182B3D] mb-1">No decision matches that query.</h3>
                <p className="text-[13.5px] text-[#526679] max-w-md mx-auto mb-4">
                  Try another subject or reference ID, or clear the search.
                </p>
                <a href={`/${tenantSubdomain}/records`} className="text-[13px] text-[#0B7780] font-semibold hover:underline">
                  Clear search query
                </a>
              </div>
            ) : isFilterActive ? (
              <div>
                <h3 className="text-[16px] font-semibold text-[#182B3D] mb-1">No decisions match these filters.</h3>
                <p className="text-[13.5px] text-[#526679] max-w-md mx-auto mb-4">
                  Try broadening your selection to find recorded decisions.
                </p>
                <a
                  href={`/${tenantSubdomain}/records`}
                  className="inline-flex items-center px-3.5 py-1.5 bg-[#17324D] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#224564]"
                >
                  Clear All Filters
                </a>
              </div>
            ) : (
              <div>
                <ShieldCheck className="w-12 h-12 text-[#637587] mx-auto mb-3" />
                <h3 className="text-[16px] font-semibold text-[#182B3D] mb-1">Nothing recorded yet.</h3>
                <p className="text-[13.5px] text-[#526679] max-w-md mx-auto">
                  Decisions recorded here will appear with their approval history and available integrity evidence.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Dense Enterprise Records Table */
          <div className="bg-white rounded-[10px] border border-[#DCE5EA] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse font-sans">
                <thead>
                  <tr className="bg-[#F6F8F9] border-b border-[#DCE5EA] text-[11px] uppercase font-semibold text-[#637587] tracking-wider">
                    <th className="py-2.5 px-4 w-14 text-center">Seal</th>
                    <th className="py-2.5 px-4 w-32 font-mono">Reference</th>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4 w-28">STEP</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Requester</th>
                    <th className="py-2.5 px-4 w-32">Date</th>
                    <th className="py-2.5 px-4 w-24 text-center">Precedents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF0F2] text-[#182B3D]">
                  {records.map((r: any) => {
                    const isSealed = Boolean(r.checksum_sha256);
                    const isRejected = r.status === 'rejected';
                    const stepType = r.resolved_step_type || 'TRANSACTIONAL';
                    const precedentCount = precedentCounts.get(r.id) || 0;

                    return (
                      <tr key={r.id} className="hover:bg-[#F9FBFC] transition-colors group">
                        {/* Seal Indicator */}
                        <td className="py-3 px-4 text-center">
                          {isSealed ? (
                            <span title="Sealed & Verified" className="inline-block w-2.5 h-2.5 rounded-full bg-[#0B7780] ring-2 ring-[#E7F4F3]" />
                          ) : isRejected ? (
                            <span title="Rejected" className="inline-block w-2.5 h-2.5 rounded-full bg-[#637587]" />
                          ) : (
                            <span title="In Flight" className="inline-block w-2.5 h-2.5 rounded-full border border-[#0B7780] bg-transparent" />
                          )}
                        </td>

                        {/* Mono Ref */}
                        <td className="py-3 px-4 font-mono font-medium text-[12.5px] text-[#17324D]">
                          <Link href={`/${tenantSubdomain}/requests/${r.id}`} className="hover:underline">
                            {r.ref}
                          </Link>
                        </td>

                        {/* Subject */}
                        <td className="py-3 px-4 font-medium text-[13.5px] max-w-md truncate">
                          <Link href={`/${tenantSubdomain}/requests/${r.id}`} className="group-hover:text-[#17324D] transition-colors">
                            {r.subject}
                          </Link>
                        </td>

                        {/* STEP Badge */}
                        <td className="py-3 px-4">
                          <StepBadge type={stepType} size="sm" />
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 text-[13px] text-[#526679]">
                          {r.categories?.name || 'General'}
                        </td>

                        {/* Requester */}
                        <td className="py-3 px-4 text-[13px] font-medium text-[#182B3D]">
                          {r.users?.name || r.users?.email || 'System'}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-[12px] text-[#637587] whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Precedents */}
                        <td className="py-3 px-4 text-center text-[12px] font-mono text-[#526679]">
                          {precedentCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
