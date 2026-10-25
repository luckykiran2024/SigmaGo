'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, FileText, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { DecisionRecordItem } from '@/lib/db/decisions';
import StepBadge from '@/components/ui/StepBadge';

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
    <div className="space-y-6 font-sans text-[#182B3D]">
      {/* Top Header & Context Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE5EA] pb-5">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#182B3D]">Decision Record</h1>
          <p className="text-[14px] text-[#526679] mt-1">
            The organizational ledger. Every consequential decision in one searchable place.
          </p>
        </div>
      </div>

      {/* Primary Control Search Field */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#637587] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            autoFocus
            id="decision-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={() => updateUrl({ q: searchQuery.trim() })}
            placeholder="Search decisions by subject, reference, reasoning text, requester, or beneficiary..."
            className="w-full pl-10 pr-24 py-2.5 bg-white border border-[#DCE5EA] rounded-[8px] text-[13.5px] text-[#182B3D] placeholder-[#637587] focus:outline-none focus:ring-2 focus:ring-[#0B7780] shadow-xs transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                updateUrl({ q: null });
              }}
              className="absolute right-3 text-[12px] text-[#637587] hover:text-[#182B3D] font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Filter Chips Bar */}
      <div className="p-4 bg-white border border-[#DCE5EA] rounded-[10px] space-y-3 text-[12px] shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* Scope Group */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#637587] uppercase tracking-wider">Scope:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'raised_by_me', label: 'Raised by me' },
              { id: 'involved_me', label: 'Involved me' },
              { id: 'approved_by_me', label: 'Approved by me' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => updateUrl({ scope: s.id === 'all' ? null : s.id })}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition ${
                  scopeParam === s.id
                    ? 'bg-[#17324D] text-white'
                    : 'bg-[#EEF2F4] text-[#526679] hover:bg-[#E7EDF0] hover:text-[#17324D]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* STEP Multi-select Group */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#637587] uppercase tracking-wider">Type:</span>
            {[
              { id: 'STRUCTURAL', label: 'S', color: 'bg-[#17324D]' },
              { id: 'TRANSACTIONAL', label: 'T', color: 'bg-[#0B7780]' },
              { id: 'EXCEPTION', label: 'E', color: 'bg-[#B54708]' },
              { id: 'PROCESS', label: 'P', color: 'bg-[#526679]' },
            ].map((t) => {
              const active = typesParam.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleStepType(t.id)}
                  title={`${t.id} decision type`}
                  className={`w-6 h-6 rounded-[4px] font-semibold text-[11px] flex items-center justify-center transition ${
                    active
                      ? `${t.color} text-white`
                      : 'bg-[#EEF2F4] text-[#526679] hover:bg-[#E7EDF0] hover:text-[#17324D]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* State Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#637587] uppercase tracking-wider">State:</span>
            {[
              { id: '', label: 'All' },
              { id: 'sealed', label: 'Sealed' },
              { id: 'in_flight', label: 'In flight' },
              { id: 'rejected', label: 'Rejected' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => updateUrl({ state: st.id || null })}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition ${
                  stateParam === st.id
                    ? 'bg-[#17324D] text-white'
                    : 'bg-[#EEF2F4] text-[#526679] hover:bg-[#E7EDF0] hover:text-[#17324D]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#637587] uppercase tracking-wider">Date:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'this_quarter', label: 'This quarter' },
              { id: 'this_year', label: 'This year' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => updateUrl({ date: d.id === 'all' ? null : d.id })}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition ${
                  dateParam === d.id
                    ? 'bg-[#17324D] text-white'
                    : 'bg-[#EEF2F4] text-[#526679] hover:bg-[#E7EDF0] hover:text-[#17324D]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center text-[12px] font-semibold text-[#B42318] hover:underline ml-auto"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Decision Record Ledger List Container */}
      <div className="bg-white border border-[#DCE5EA] rounded-[10px] shadow-xs overflow-hidden">
        {initialItems.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3 max-w-md mx-auto">
            <FileText className="w-10 h-10 text-[#637587] mx-auto" />

            {queryParam ? (
              <div className="space-y-2">
                <h3 className="text-[16px] font-semibold text-[#182B3D]">No decision matches that.</h3>
                <p className="text-[13px] text-[#526679]">
                  If it happened outside SigmaGo, it was never recorded — which is the problem this exists to solve.
                </p>
                <button
                  onClick={() => updateUrl({ q: null })}
                  className="mt-2 inline-flex items-center px-3.5 py-1.5 border border-[#DCE5EA] rounded-[6px] text-[12.5px] font-medium text-[#526679] hover:bg-[#F6F8F9]"
                >
                  Clear Search
                </button>
              </div>
            ) : hasActiveFilters ? (
              <div className="space-y-2">
                <h3 className="text-[16px] font-semibold text-[#182B3D]">No decisions match these filters.</h3>
                <p className="text-[13px] text-[#526679]">Try clearing filter parameters to broaden the ledger search.</p>
                <button
                  onClick={clearAllFilters}
                  className="mt-2 inline-flex items-center px-3.5 py-1.5 bg-[#17324D] text-white rounded-[6px] text-[12.5px] font-medium hover:bg-[#224564]"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-[16px] font-semibold text-[#182B3D]">Nothing recorded yet.</h3>
                <p className="text-[13px] text-[#526679]">
                  Every decision made here will be findable in seconds, provable to an outsider, and available as precedent for the next one.
                </p>
                <Link
                  href={`/${tenantSubdomain}/requests/new`}
                  className="mt-3 inline-flex items-center px-4 py-2 bg-[#17324D] text-white rounded-[6px] text-[13px] font-medium hover:bg-[#224564] shadow-xs"
                >
                  Raise the First Decision
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#EAF0F2]">
            {initialItems.map((item) => {
              const stepType = item.category?.step_type || 'TRANSACTIONAL';

              return (
                <Link
                  key={item.id}
                  href={`/${tenantSubdomain}/requests/${item.id}`}
                  className="group px-4 py-3.5 hover:bg-[#F9FBFC] transition flex items-center justify-between gap-4 text-xs select-none"
                >
                  {/* Left: Seal Dot, Ref Code, STEP badge, Subject & Category */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0">
                      {item.is_sealed ? (
                        <div
                          title="Sealed & Cryptographically Provable"
                          className="w-3.5 h-3.5 rounded-full bg-[#0B7780] flex items-center justify-center text-white ring-2 ring-[#E7F4F3]"
                        >
                          <ShieldCheck className="w-2.5 h-2.5" />
                        </div>
                      ) : item.is_rejected ? (
                        <div
                          title="Rejected Decision"
                          className="w-3.5 h-3.5 rounded-full bg-[#FEF3F2] text-[#B42318] flex items-center justify-center font-bold text-[10px]"
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
                    <span className="font-mono text-[12px] font-semibold text-[#17324D] shrink-0 w-28 truncate">
                      {item.ref}
                    </span>

                    {/* STEP Type Badge */}
                    <div className="shrink-0">
                      <StepBadge type={stepType} size="sm" />
                    </div>

                    {/* Subject & Category */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div
                        className="font-medium text-[13.5px] text-[#182B3D] group-hover:text-[#17324D] transition truncate"
                        title={item.subject}
                      >
                        {item.subject}
                      </div>
                      <div className="text-[12px] text-[#637587] flex items-center gap-2">
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

                  {/* Right: Date, Precedent Count, RRRR Lifecycle */}
                  <div className="flex items-center gap-4 shrink-0">
                    {item.precedent_count > 0 && (
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#E7F4F3] border border-[#E8DDB0] text-[#B54708] text-[11px] font-mono font-medium">
                        {item.precedent_count} {item.precedent_count === 1 ? 'link' : 'links'}
                      </span>
                    )}

                    <span className="text-[12px] text-[#637587] font-mono w-28 text-right">
                      {item.finalized_at ? formatDate(item.finalized_at) : formatDaysAgo(item.created_at)}
                    </span>

                    {/* Compact 4-Dot RRRR Lifecycle */}
                    <div className="flex items-center gap-1 px-1.5 py-1 bg-[#F6F8F9] rounded-[4px] border border-[#EAF0F2]">
                      <span title="RECORDED" className="w-2 h-2 rounded-full bg-[#0F7548]" />
                      <span title="RETRIEVABLE" className="w-2 h-2 rounded-full bg-[#0F7548]" />
                      <span
                        title={item.is_sealed ? 'PROVABLE' : 'Unsealed'}
                        className={`w-2 h-2 rounded-full ${item.is_sealed ? 'bg-[#0B7780]' : 'bg-[#DCE5EA]'}`}
                      />
                      <span
                        title={item.precedent_count > 0 ? 'REUSABLE' : 'Not yet cited'}
                        className={`w-2 h-2 rounded-full ${item.precedent_count > 0 ? 'bg-[#0F7548]' : 'bg-[#DCE5EA]'}`}
                      />
                    </div>

                    <ArrowRight className="w-4 h-4 text-[#637587] group-hover:text-[#17324D] transition transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Timing */}
      <div className="pt-2 text-center text-[12px] font-mono text-[#637587]">
        <span className="font-semibold text-[#17324D]">{initialItems.length}</span> {initialItems.length === 1 ? 'decision' : 'decisions'} retrieved in {initialDuration}s
      </div>
    </div>
  );
}
