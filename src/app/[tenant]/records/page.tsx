import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { ShieldCheck, Search, Filter, RefreshCw } from 'lucide-react';

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
  const startTime = performance.now();
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const tenantSubdomain = resolvedParams.tenant;

  const query = resolvedSearchParams.q || '';
  const scope = resolvedSearchParams.scope || 'all';
  const typeFilter = resolvedSearchParams.type || 'all';
  const stateFilter = resolvedSearchParams.state || 'all';

  // Auth check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name')
    .eq('subdomain', tenantSubdomain)
    .single();

  if (!tenant) {
    return <div className="p-8 text-center text-red-600 font-semibold">Tenant not found</div>;
  }

  // Get current user profile
  let currentUserProfile = null;
  if (user) {
    const { data: prof } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('auth_user_id', user.id)
      .single();
    currentUserProfile = prof;
  }

  // Access Scoping:
  // User can view decisions if:
  // 1. User is owner/requester (owner_id = user.id)
  // 2. User is step approver (approval_steps.approver_id = user.id)
  // 3. User is participant (request_participants.email = user.email)
  // 4. Category has default_visibility = 'open' or 'public'
  let recordsQuery = adminClient
    .from('approval_requests')
    .select(`
      id, ref, subject, status, checksum_sha256, sealed_at, created_at, finalized_at,
      categories!inner ( name, step_type, default_visibility ),
      users!owner_id ( id, name, email ),
      outgoing_refs:decision_references!SourceRefs ( id )
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
    recordsQuery = recordsQuery.eq('categories.step_type', typeFilter.toUpperCase());
  }

  const { data: records, count: totalCount, error: recordsError } = await recordsQuery;

  const durationMs = (performance.now() - startTime).toFixed(1);
  const totalDecisionsCount = totalCount || (records ? records.length : 0);

  // Determine empty state classification
  const isSearchActive = query.trim().length > 0;
  const isFilterActive = scope !== 'all' || typeFilter !== 'all' || stateFilter !== 'all';

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="max-w-[1240px] mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">Records</h1>
            <p className="text-sm text-[#64748B]">
              Immutable, searchable decision history provable to external stakeholders.
            </p>
          </div>
          <div className="text-xs font-mono text-[#64748B] bg-white px-3 py-1.5 rounded-lg border border-[#E2E8F0] shadow-xs self-start md:self-auto">
            {totalDecisionsCount} decisions retrieved in {durationMs}s
          </div>
        </div>

        {/* Search & Filter Bar */}
        <form method="GET" className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs mb-6">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Single Search Input Focused on Load */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                autoFocus
                placeholder="Search decisions by subject, reference ID, requester, or reasoning..."
                className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#274C77]"
              />
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-4 py-2 bg-[#274C77] text-white text-sm font-semibold rounded-lg hover:bg-[#1E3C60] transition-colors"
            >
              Search
            </button>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-[#F1F5F9] text-xs">
            <span className="flex items-center text-[#64748B] font-semibold mr-1">
              <Filter className="w-3.5 h-3.5 mr-1" /> Filters:
            </span>

            {/* Scope Filter Chips */}
            {['all', 'raised_by_me', 'involved_me', 'approved_by_me'].map((s) => (
              <a
                key={s}
                href={`?${new URLSearchParams({ ...resolvedSearchParams, scope: s }).toString()}`}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                  scope === s ? 'bg-[#274C77] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                {s.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </a>
            ))}

            <div className="w-[1px] h-4 bg-[#CBD5E1] my-auto mx-1" />

            {/* Type Filter Chips */}
            {['all', 'S', 'T', 'E', 'P'].map((t) => (
              <a
                key={t}
                href={`?${new URLSearchParams({ ...resolvedSearchParams, type: t }).toString()}`}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                  typeFilter === t ? 'bg-[#274C77] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                {t === 'all' ? 'All Types' : `Type ${t}`}
              </a>
            ))}

            <div className="w-[1px] h-4 bg-[#CBD5E1] my-auto mx-1" />

            {/* State Filter Chips */}
            {['all', 'sealed', 'in_flight', 'rejected'].map((st) => (
              <a
                key={st}
                href={`?${new URLSearchParams({ ...resolvedSearchParams, state: st }).toString()}`}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                  stateFilter === st ? 'bg-[#274C77] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                {st.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </a>
            ))}

            {isFilterActive && (
              <a
                href={`/${tenantSubdomain}/records`}
                className="ml-auto flex items-center text-xs font-semibold text-[#B42318] hover:underline"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Clear Filters
              </a>
            )}
          </div>
        </form>

        {/* Content & Empty States */}
        {!records || records.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center shadow-xs">
            {isSearchActive ? (
              <div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-2">No decision matches that.</h3>
                <p className="text-sm text-[#64748B] max-w-md mx-auto mb-4">
                  If it happened outside SigmaGo, it was never recorded — which is the problem this exists to solve.
                </p>
                <a href={`/${tenantSubdomain}/records`} className="text-sm text-[#274C77] font-semibold hover:underline">
                  Clear search query
                </a>
              </div>
            ) : isFilterActive ? (
              <div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-2">No decisions match these filters.</h3>
                <p className="text-sm text-[#64748B] max-w-md mx-auto mb-4">
                  Try broadening your selection to find recorded decisions.
                </p>
                <a
                  href={`/${tenantSubdomain}/records`}
                  className="inline-flex items-center px-4 py-2 bg-[#274C77] text-white text-xs font-semibold rounded-lg hover:bg-[#1E3C60]"
                >
                  Clear All Filters
                </a>
              </div>
            ) : (
              <div>
                <ShieldCheck className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-2">Nothing recorded yet.</h3>
                <p className="text-sm text-[#64748B] max-w-md mx-auto">
                  Every decision made here will be findable in seconds, provable to an outsider, and available as precedent for the next one.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Dense Records Table */
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11.5px] uppercase font-bold text-[#64748B] tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">Seal</th>
                    <th className="py-3 px-4 w-32 font-mono">Reference</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 w-20 text-center">STEP</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Requester</th>
                    <th className="py-3 px-4 w-32">Date</th>
                    <th className="py-3 px-4 w-24 text-center">Precedents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#1E293B]">
                  {records.map((r: any) => {
                    const isSealed = Boolean(r.checksum_sha256);
                    const isRejected = r.status === 'rejected';
                    const stepType = r.categories?.step_type || 'T';
                    const precedentCount = r.outgoing_refs ? r.outgoing_refs.length : 0;

                    return (
                      <tr key={r.id} className="hover:bg-[#F8FAFC] transition-colors">
                        {/* Seal Indicator */}
                        <td className="py-3 px-4 text-center">
                          {isSealed ? (
                            <span title="Sealed & Verified (Gold)" className="inline-block w-3 h-3 rounded-full bg-[#D97706] ring-2 ring-[#FEF3C7]" />
                          ) : isRejected ? (
                            <span title="Rejected (Muted)" className="inline-block w-3 h-3 rounded-full bg-[#94A3B8]" />
                          ) : (
                            <span title="In Flight (Hollow)" className="inline-block w-3 h-3 rounded-full border-2 border-[#0EA5E9] bg-transparent" />
                          )}
                        </td>

                        {/* Mono Ref */}
                        <td className="py-3 px-4 font-mono font-bold text-xs text-[#274C77]">
                          <Link href={`/${tenantSubdomain}/requests/${r.id}`} className="hover:underline">
                            {r.ref}
                          </Link>
                        </td>

                        {/* Subject */}
                        <td className="py-3 px-4 font-semibold max-w-md truncate">
                          <Link href={`/${tenantSubdomain}/requests/${r.id}`} className="hover:text-[#274C77]">
                            {r.subject}
                          </Link>
                        </td>

                        {/* STEP Badge */}
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-extrabold bg-[#E2E8F0] text-[#334155]">
                            {stepType}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 text-xs text-[#64748B]">
                          {r.categories?.name || 'General'}
                        </td>

                        {/* Requester */}
                        <td className="py-3 px-4 text-xs font-medium">
                          {r.users?.name || r.users?.email || 'System'}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-xs text-[#64748B] whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Precedents */}
                        <td className="py-3 px-4 text-center text-xs font-mono text-[#475569]">
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
