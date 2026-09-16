import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { ShieldCheck, Search, Filter, RefreshCw } from 'lucide-react';
import StepBadge from '@/components/ui/StepBadge';

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
  let currentUserProfile = null;
  if (user) {
    const { data: prof } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('auth_user_id', user.id)
      .single();
    currentUserProfile = prof;
  }

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

  const { data: records, count: totalCount } = await recordsQuery;

  const durationMs = (performance.now() - startTime).toFixed(1);
  const totalDecisionsCount = totalCount || (records ? records.length : 0);

  const isSearchActive = query.trim().length > 0;
  const isFilterActive = scope !== 'all' || typeFilter !== 'all' || stateFilter !== 'all';

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      <main className="max-w-[1360px] mx-auto px-6 py-8 font-sans space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DDE5EC] pb-5">
          <div>
            <h1 className="text-[28px] font-semibold text-[#132238] tracking-tight">Records</h1>
            <p className="text-[14px] text-[#526377] mt-1">
              Immutable, searchable decision history provable to external stakeholders.
            </p>
          </div>
          <div className="text-[12px] font-mono text-[#526377] bg-white px-3 py-1.5 rounded-[6px] border border-[#DDE5EC] shadow-xs self-start md:self-auto">
            <span className="font-semibold text-[#012F6B]">{totalDecisionsCount}</span> decisions retrieved in {durationMs}s
          </div>
        </div>

        {/* Search & Filter Bar */}
        <form method="GET" className="bg-white rounded-[10px] border border-[#DDE5EC] p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8190A0]" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                autoFocus
                placeholder="Search decisions by subject, reference ID, requester, or reasoning..."
                className="w-full pl-10 pr-4 py-2 bg-[#F7FAFC] border border-[#DDE5EC] rounded-[6px] text-[13.5px] text-[#132238] placeholder-[#8190A0] focus:outline-none focus:ring-2 focus:ring-[#059DB0] transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-4 py-2 bg-[#012F6B] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#033E79] transition-colors shadow-xs"
            >
              Search
            </button>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#EAF0F4] text-[12px]">
            <span className="flex items-center text-[#8190A0] font-semibold mr-1">
              <Filter className="w-3.5 h-3.5 mr-1" /> Filters:
            </span>

            {/* Scope Filter Chips */}
            {['all', 'raised_by_me', 'involved_me', 'approved_by_me'].map((s) => (
              <a
                key={s}
                href={`?${new URLSearchParams({ ...resolvedSearchParams, scope: s }).toString()}`}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                  scope === s ? 'bg-[#012F6B] text-white' : 'bg-[#F3F6F8] text-[#526377] hover:bg-[#EDF2F6] hover:text-[#012F6B]'
                }`}
              >
                {s.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </a>
            ))}

            <div className="w-[1px] h-4 bg-[#DDE5EC] my-auto mx-1" />

            {/* Type Filter Chips */}
            {['all', 'S', 'T', 'E', 'P'].map((t) => (
              <a
                key={t}
                href={`?${new URLSearchParams({ ...resolvedSearchParams, type: t }).toString()}`}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                  typeFilter === t ? 'bg-[#012F6B] text-white' : 'bg-[#F3F6F8] text-[#526377] hover:bg-[#EDF2F6] hover:text-[#012F6B]'
                }`}
              >
                {t === 'all' ? 'All Types' : `Type ${t}`}
              </a>
            ))}

            <div className="w-[1px] h-4 bg-[#DDE5EC] my-auto mx-1" />

            {/* State Filter Chips */}
            {['all', 'sealed', 'in_flight', 'rejected'].map((st) => (
              <a
                key={st}
                href={`?${new URLSearchParams({ ...resolvedSearchParams, state: st }).toString()}`}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                  stateFilter === st ? 'bg-[#012F6B] text-white' : 'bg-[#F3F6F8] text-[#526377] hover:bg-[#EDF2F6] hover:text-[#012F6B]'
                }`}
              >
                {st.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
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
          <div className="bg-white rounded-[10px] border border-[#DDE5EC] p-12 text-center shadow-xs">
            {isSearchActive ? (
              <div>
                <h3 className="text-[16px] font-semibold text-[#132238] mb-1">No decision matches that query.</h3>
                <p className="text-[13.5px] text-[#526377] max-w-md mx-auto mb-4">
                  If it happened outside SigmaGo, it was never recorded — which is the problem this platform exists to solve.
                </p>
                <a href={`/${tenantSubdomain}/records`} className="text-[13px] text-[#059DB0] font-semibold hover:underline">
                  Clear search query
                </a>
              </div>
            ) : isFilterActive ? (
              <div>
                <h3 className="text-[16px] font-semibold text-[#132238] mb-1">No decisions match these filters.</h3>
                <p className="text-[13.5px] text-[#526377] max-w-md mx-auto mb-4">
                  Try broadening your selection to find recorded decisions.
                </p>
                <a
                  href={`/${tenantSubdomain}/records`}
                  className="inline-flex items-center px-3.5 py-1.5 bg-[#012F6B] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#033E79]"
                >
                  Clear All Filters
                </a>
              </div>
            ) : (
              <div>
                <ShieldCheck className="w-12 h-12 text-[#8190A0] mx-auto mb-3" />
                <h3 className="text-[16px] font-semibold text-[#132238] mb-1">Nothing recorded yet.</h3>
                <p className="text-[13.5px] text-[#526377] max-w-md mx-auto">
                  Every decision made here will be findable in seconds, provable to an outsider, and available as precedent for the next one.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Dense Enterprise Records Table */
          <div className="bg-white rounded-[10px] border border-[#DDE5EC] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse font-sans">
                <thead>
                  <tr className="bg-[#F7FAFC] border-b border-[#DDE5EC] text-[11px] uppercase font-semibold text-[#8190A0] tracking-wider">
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
                <tbody className="divide-y divide-[#EAF0F4] text-[#132238]">
                  {records.map((r: any) => {
                    const isSealed = Boolean(r.checksum_sha256);
                    const isRejected = r.status === 'rejected';
                    const stepType = r.categories?.step_type || 'TRANSACTIONAL';
                    const precedentCount = r.outgoing_refs ? r.outgoing_refs.length : 0;

                    return (
                      <tr key={r.id} className="hover:bg-[#F9FBFC] transition-colors group">
                        {/* Seal Indicator */}
                        <td className="py-3 px-4 text-center">
                          {isSealed ? (
                            <span title="Sealed & Verified" className="inline-block w-2.5 h-2.5 rounded-full bg-[#C9A227] ring-2 ring-[#FDF6E3]" />
                          ) : isRejected ? (
                            <span title="Rejected" className="inline-block w-2.5 h-2.5 rounded-full bg-[#8190A0]" />
                          ) : (
                            <span title="In Flight" className="inline-block w-2.5 h-2.5 rounded-full border border-[#059DB0] bg-transparent" />
                          )}
                        </td>

                        {/* Mono Ref */}
                        <td className="py-3 px-4 font-mono font-medium text-[12.5px] text-[#012F6B]">
                          <Link href={`/${tenantSubdomain}/requests/${r.id}`} className="hover:underline">
                            {r.ref}
                          </Link>
                        </td>

                        {/* Subject */}
                        <td className="py-3 px-4 font-medium text-[13.5px] max-w-md truncate">
                          <Link href={`/${tenantSubdomain}/requests/${r.id}`} className="group-hover:text-[#012F6B] transition-colors">
                            {r.subject}
                          </Link>
                        </td>

                        {/* STEP Badge */}
                        <td className="py-3 px-4">
                          <StepBadge type={stepType} size="sm" />
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 text-[13px] text-[#526377]">
                          {r.categories?.name || 'General'}
                        </td>

                        {/* Requester */}
                        <td className="py-3 px-4 text-[13px] font-medium text-[#132238]">
                          {r.users?.name || r.users?.email || 'System'}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-[12px] text-[#8190A0] whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Precedents */}
                        <td className="py-3 px-4 text-center text-[12px] font-mono text-[#526377]">
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
