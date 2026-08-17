'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, FileText, ArrowRight, ShieldCheck, X, RefreshCw } from 'lucide-react';
import { DecisionRecordItem } from '@/lib/db/decisions';
import LifecycleStrip from '@/components/ui/LifecycleStrip';

interface CategoryOption {
  id: string;
  name: string;
}

interface DecisionRecordRegisterProps {
  tenantSubdomain: string;
  initialItems: DecisionRecordItem[];
  initialDuration: number;
  categories: CategoryOption[];
}

function formatDaysAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Submitted today';
  if (days === 1) return 'Submitted 1 day ago';
  return `Submitted ${days} days ago`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export default function DecisionRecordRegister({
  tenantSubdomain,
  initialItems,
  initialDuration,
  categories,
}: DecisionRecordRegisterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read params from URL
  const queryParam = searchParams.get('q') || '';
  const scopeParam = (searchParams.get('scope') as any) || 'all';
  const stateParam = searchParams.get('state') || '';
  const typesParam = searchParams.get('types')?.split(',').filter(Boolean) || [];
  const categoryParam = searchParams.get('category') || '';
  const dateParam = searchParams.get('date') || 'all';

  const [searchQuery, setSearchQuery] = useState(queryParam);

  // Sync search input state with URL changes
  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  // Update URL helper
  const updateUrl = (newParams: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    for (const [key, value] of Object.entries(newParams)) {
      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${pathname}${query}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ q: searchQuery.trim() });
  };

  const toggleStepType = (type: string) => {
    let updated: string[];
    if (typesParam.includes(type)) {
      updated = typesParam.filter((t) => t !== type);
    } else {
      updated = [...typesParam, type];
    }
    updateUrl({ types: updated.join(',') });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    router.push(pathname);
  };

  const hasActiveFilters = Boolean(
    queryParam || scopeParam !== 'all' || stateParam || typesParam.length > 0 || categoryParam || dateParam !== 'all'
  );

  return (
    <div className="space-y-6 font-sans text-[#101828]">
      {/* Top Header & Context Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-extrabold tracking-tight text-[#101828]">Decision Record</h1>
          <p className="text-xs font-semibold text-[#667085] mt-0.5">
            The organizational ledger. Every consequential decision in one searchable place.
          </p>
        </div>
      </div>

      {/* Primary Control Search Field (§2) */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#667085] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            autoFocus
            id="decision-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={() => updateUrl({ q: searchQuery.trim() })}
            placeholder="Search decisions by subject, reference, reasoning text, requester, or beneficiary..."
            className="w-full pl-10 pr-24 py-3 bg-white border border-[#D0D5DD] rounded-[8px] text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#274C77] focus:border-transparent shadow-xs transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                updateUrl({ q: null });
              }}
              className="absolute right-3 text-xs text-[#667085] hover:text-[#101828] font-bold"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Filter Chips Bar (§2) */}
      <div className="p-4 bg-white border border-[#E4E7EC] rounded-[8px] space-y-3 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* Scope Group */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider font-mono">Scope:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'raised_by_me', label: 'Raised by me' },
              { id: 'involved_me', label: 'Involved me' },
              { id: 'approved_by_me', label: 'Approved by me' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => updateUrl({ scope: s.id === 'all' ? null : s.id })}
                className={`px-2.5 py-1 rounded-[4px] font-semibold transition ${
                  scopeParam === s.id
                    ? 'bg-[#274C77] text-white'
                    : 'bg-[#F9FAFB] text-[#344054] hover:bg-[#F2F4F7] border border-[#D0D5DD]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* STEP Multi-select Group */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider font-mono">Type:</span>
            {[
              { id: 'STRUCTURAL', label: 'S' },
              { id: 'TRANSACTIONAL', label: 'T' },
              { id: 'EXCEPTION', label: 'E' },
              { id: 'PROCESS', label: 'P' },
            ].map((t) => {
              const active = typesParam.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleStepType(t.id)}
                  title={`${t.id} decision type`}
                  className={`w-6 h-6 rounded-[4px] font-bold font-mono text-xs flex items-center justify-center transition ${
                    active
                      ? 'bg-[#101828] text-white'
                      : 'bg-[#F9FAFB] text-[#344054] hover:bg-[#F2F4F7] border border-[#D0D5DD]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* State Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider font-mono">State:</span>
            {[
              { id: '', label: 'All' },
              { id: 'sealed', label: 'Sealed' },
              { id: 'in_flight', label: 'In flight' },
              { id: 'rejected', label: 'Rejected' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => updateUrl({ state: st.id || null })}
                className={`px-2.5 py-1 rounded-[4px] font-semibold transition ${
                  stateParam === st.id
                    ? 'bg-[#274C77] text-white'
                    : 'bg-[#F9FAFB] text-[#344054] hover:bg-[#F2F4F7] border border-[#D0D5DD]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider font-mono">Date:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'this_quarter', label: 'This quarter' },
              { id: 'this_year', label: 'This year' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => updateUrl({ date: d.id === 'all' ? null : d.id })}
                className={`px-2.5 py-1 rounded-[4px] font-semibold transition ${
                  dateParam === d.id
                    ? 'bg-[#274C77] text-white'
                    : 'bg-[#F9FAFB] text-[#344054] hover:bg-[#F2F4F7] border border-[#D0D5DD]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center text-xs font-semibold text-[#B42318] hover:underline ml-auto"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Decision Record Ledger List Container */}
      <div className="bg-white border border-[#E4E7EC] rounded-[8px] shadow-xs overflow-hidden">
        {initialItems.length === 0 ? (
          /* Three Teaching Empty States (§3) */
          <div className="py-16 px-6 text-center space-y-4 max-w-md mx-auto">
            <FileText className="w-12 h-12 text-[#98A2B3] mx-auto" />

            {queryParam ? (
              /* Empty State 2: Search Returned Nothing */
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[#101828]">No decision matches that.</h3>
                <p className="text-xs text-[#667085] leading-relaxed font-medium">
                  If it happened outside SigmaGo, it was never recorded — which is the problem this exists to solve.
                </p>
                <button
                  onClick={() => updateUrl({ q: null })}
                  className="mt-2 inline-flex items-center px-3.5 py-1.5 border border-[#D0D5DD] rounded-[6px] text-xs font-bold text-[#344054] hover:bg-[#F9FAFB]"
                >
                  Clear Search
                </button>
              </div>
            ) : hasActiveFilters ? (
              /* Empty State 3: Filters Exclude Everything */
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[#101828]">No decisions match these filters.</h3>
                <p className="text-xs text-[#667085]">Try clearing some filter parameters to broaden the ledger search.</p>
                <button
                  onClick={clearAllFilters}
                  className="mt-2 inline-flex items-center px-3.5 py-1.5 bg-[#274C77] text-white rounded-[6px] text-xs font-bold hover:bg-[#1E3C60]"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              /* Empty State 1: No Decisions Recorded Yet */
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[#101828]">Nothing recorded yet.</h3>
                <p className="text-xs text-[#667085] leading-relaxed font-medium">
                  Every decision made here will be findable in seconds, provable to an outsider, and available as precedent for the next one.
                </p>
                <Link
                  href={`/${tenantSubdomain}/requests/new`}
                  className="mt-3 inline-flex items-center px-4 py-2 bg-[#274C77] text-white rounded-[6px] text-xs font-bold hover:bg-[#1E3C60] shadow-xs"
                >
                  Raise the First Decision
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* Dense Ledger Rows (§2) */
          <div className="divide-y divide-[#E4E7EC]">
            {initialItems.map((item) => {
              const stepTypeLetter = item.category?.step_type?.charAt(0) || 'T';

              return (
                <Link
                  key={item.id}
                  href={`/${tenantSubdomain}/requests/${item.id}`}
                  className="group px-4 py-3 hover:bg-[#F9FAFB] transition flex items-center justify-between gap-4 text-xs select-none"
                >
                  {/* Left: Seal Dot, Ref Code, STEP badge, Subject & Category */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Seal Indicator (Greyscale Legible §2 & §6) */}
                    <div className="shrink-0">
                      {item.is_sealed ? (
                        <div
                          title="Sealed & Cryptographically Provable"
                          className="w-3.5 h-3.5 rounded-full bg-[#C9A227] border border-[#B58A18] flex items-center justify-center text-white"
                        >
                          <ShieldCheck className="w-2.5 h-2.5" />
                        </div>
                      ) : item.is_rejected ? (
                        <div
                          title="Rejected Decision"
                          className="w-3.5 h-3.5 rounded-full bg-[#FEE4E2] text-[#B42318] flex items-center justify-center font-bold text-[10px]"
                        >
                          ×
                        </div>
                      ) : (
                        <div
                          title="In Flight (Unsealed)"
                          className="w-3.5 h-3.5 rounded-full border-2 border-[#98A2B3] bg-transparent"
                        />
                      )}
                    </div>

                    {/* Reference Code */}
                    <span className="font-mono text-xs font-bold text-[#274C77] shrink-0 w-28 truncate">
                      {item.ref}
                    </span>

                    {/* STEP Type Badge */}
                    <span
                      title={`Step Type: ${item.category?.step_type || 'TRANSACTIONAL'}`}
                      className="w-5 h-5 rounded-[4px] bg-[#E8EDF4] text-[#274C77] font-bold font-mono text-[10px] flex items-center justify-center shrink-0 border border-[#D3DEEB]"
                    >
                      {stepTypeLetter}
                    </span>

                    {/* Subject (Truncated 1-line) & Category Name */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div
                        className="font-semibold text-[#101828] group-hover:text-[#274C77] transition truncate"
                        title={item.subject}
                      >
                        {item.subject}
                      </div>
                      <div className="text-[11px] text-[#667085] flex items-center gap-2 font-mono">
                        <span>{item.category?.name || 'General'}</span>
                        <span>·</span>
                        <span>By {item.owner?.name || 'Staff'}</span>
                        {item.final_approver && (
                          <>
                            <span>·</span>
                            <span>Finalized by {item.final_approver.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Date, Precedent Count, 4-Dot RRRR Lifecycle & Action Arrow */}
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Precedent Badge */}
                    {item.precedent_count > 0 && (
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#FDF6E3] border border-[#E8DDB0] text-[#B54708] text-[10.5px] font-mono font-bold">
                        {item.precedent_count} {item.precedent_count === 1 ? 'link' : 'links'}
                      </span>
                    )}

                    {/* Date */}
                    <span className="text-[11px] text-[#667085] font-mono w-28 text-right">
                      {item.finalized_at ? formatDate(item.finalized_at) : formatDaysAgo(item.created_at)}
                    </span>

                    {/* Compact 4-Dot RRRR Lifecycle Indicators (§2) */}
                    <div className="flex items-center gap-1 px-1 py-0.5 bg-[#F9FAFB] rounded-[4px] border border-[#E4E7EC]">
                      <span
                        title="RECORDED"
                        className="w-2 h-2 rounded-full bg-[#0F7548]"
                      />
                      <span
                        title="RETRIEVABLE"
                        className="w-2 h-2 rounded-full bg-[#0F7548]"
                      />
                      <span
                        title={item.is_sealed ? 'PROVABLE' : 'Unsealed (In Flight)'}
                        className={`w-2 h-2 rounded-full ${item.is_sealed ? 'bg-[#C9A227]' : 'bg-[#D0D5DD]'}`}
                      />
                      <span
                        title={item.precedent_count > 0 ? 'REUSABLE' : 'Not yet cited'}
                        className={`w-2 h-2 rounded-full ${item.precedent_count > 0 ? 'bg-[#0F7548]' : 'bg-[#D0D5DD]'}`}
                      />
                    </div>

                    <ArrowRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#274C77] transition transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Server Retrieval Timer Footer (§2, §5 & §6) */}
      <div className="pt-2 text-center text-xs font-mono font-semibold text-[#667085]">
        {initialItems.length} {initialItems.length === 1 ? 'decision' : 'decisions'} retrieved in {initialDuration}s
      </div>
    </div>
  );
}
