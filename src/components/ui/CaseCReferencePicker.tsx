'use client';

import { useState, useEffect } from 'react';
import { Search, Check, ShieldCheck, FileText, HelpCircle, X } from 'lucide-react';
import { recordReferenceSkipAction } from '@/lib/db/reference_skips';

export interface ReferenceItem {
  id: string;
  ref?: string;
  title: string;
  statement?: string | null;
  step_type?: 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS';
  status?: string;
  exception_count_ytd?: number;
  isSuggested?: boolean;
  isRecent?: boolean;
}

interface CaseCReferencePickerProps {
  tenantId: string;
  categoryId: string;
  categoryStepType: 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS';
  governingPolicy?: ReferenceItem | null;
  recentlyUsedReferences?: ReferenceItem[];
  allActivePolicies?: ReferenceItem[];
  onSelectReference: (ref: ReferenceItem | null, relationship: string, isSkipped: boolean) => void;
  userId: string;
}

export default function CaseCReferencePicker({
  tenantId,
  categoryId,
  categoryStepType,
  governingPolicy,
  recentlyUsedReferences = [],
  allActivePolicies = [],
  onSelectReference,
  userId,
}: CaseCReferencePickerProps) {
  const [selectedRef, setSelectedRef] = useState<ReferenceItem | null>(governingPolicy || null);
  const [isSkipped, setIsSkipped] = useState(false);
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [skipReason, setSkipReason] = useState<'UNRECORDED_RULE' | 'NOT_SURE' | 'NO_RULE' | null>(null);
  const [describedRule, setDescribedRule] = useState('');
  const [search, setSearch] = useState('');

  // Tailored header copy by category step_type
  const promptCopy: Record<string, string> = {
    EXCEPTION: 'Which rule does this bend?',
    TRANSACTIONAL: 'Which rule does this follow?',
    PROCESS: 'Which framework does this derive from?',
    STRUCTURAL: 'Does this replace an existing decision?',
  };

  const headerTitle = promptCopy[categoryStepType] || 'WHAT RULE DOES THIS FOLLOW?';

  // Derive relationship type automatically (never ask user)
  const deriveRelationship = (stepType: string, refItem?: ReferenceItem | null) => {
    if (stepType === 'EXCEPTION') return 'EXCEPTION_TO';
    if (refItem && refItem.step_type === 'STRUCTURAL' && stepType === 'STRUCTURAL') return 'REPLACES';
    return 'BASED_ON';
  };

  // Filter policies/decisions to valid parent types
  const isValidParentType = (refStepType?: string) => {
    if (categoryStepType === 'TRANSACTIONAL' || categoryStepType === 'EXCEPTION') {
      return refStepType === 'PROCESS' || refStepType === 'STRUCTURAL';
    }
    if (categoryStepType === 'PROCESS') {
      return refStepType === 'STRUCTURAL';
    }
    if (categoryStepType === 'STRUCTURAL') {
      return refStepType === 'STRUCTURAL';
    }
    return true;
  };

  // Filter active policies matching parent type & search query
  const filteredActive = allActivePolicies.filter((item) => {
    if (!isValidParentType(item.step_type)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const titleMatch = item.title.toLowerCase().includes(q);
    const stmtMatch = (item.statement || '').toLowerCase().includes(q);
    return titleMatch || stmtMatch;
  });

  const handleSelect = (item: ReferenceItem) => {
    setSelectedRef(item);
    setIsSkipped(false);
    const rel = deriveRelationship(categoryStepType, item);
    onSelectReference(item, rel, false);
  };

  const handleSkipSubmit = async (reason: 'UNRECORDED_RULE' | 'NOT_SURE' | 'NO_RULE') => {
    setSkipReason(reason);
    setIsSkipped(true);
    setSelectedRef(null);
    setSkipModalOpen(false);

    onSelectReference(null, 'NONE', true);

    await recordReferenceSkipAction({
      tenantId,
      categoryId,
      stepType: categoryStepType,
      skippedBy: userId,
      reason,
      describedRule: reason === 'UNRECORDED_RULE' ? describedRule : null,
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 font-sans shadow-xs">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-ink uppercase tracking-wide">
          {headerTitle}
        </label>

        {!isSkipped && selectedRef && (
          <button
            type="button"
            onClick={() => setSkipModalOpen(true)}
            className="text-xs text-gray-400 hover:text-ink font-semibold transition"
          >
            No recorded rule covers this →
          </button>
        )}
      </div>

      {/* SEARCH INPUT */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="⌕ Search policies and decisions..."
          className="w-full pl-9 pr-4 py-2.5 text-xs border border-gray-200 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-accent transition font-medium"
        />
      </div>

      {/* PRE-RANKED SELECTION LIST */}
      <div className="space-y-4">
        {/* GROUP 1: SUGGESTED FOR THIS CATEGORY */}
        {governingPolicy && isValidParentType(governingPolicy.step_type) && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold tracking-wider uppercase text-gray-400 px-1">
              SUGGESTED FOR THIS CATEGORY
            </div>
            <button
              type="button"
              onClick={() => handleSelect(governingPolicy)}
              className={`w-full text-left p-3 rounded-xl border transition flex items-start justify-between ${
                selectedRef?.id === governingPolicy.id && !isSkipped
                  ? 'border-brand bg-brand/5 ring-1 ring-brand'
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
              }`}
            >
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink">{governingPolicy.title}</span>
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-200/60 px-1.5 py-0.5 rounded uppercase">
                    {governingPolicy.step_type || 'PROCESS'} · sealed
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 font-medium">
                  Configured as the governing rule · {governingPolicy.exception_count_ytd || 0} exceptions YTD
                </div>
              </div>
              {selectedRef?.id === governingPolicy.id && !isSkipped && (
                <Check className="w-4 h-4 text-brand shrink-0 mt-1" />
              )}
            </button>
          </div>
        )}

        {/* GROUP 2: RECENTLY USED IN THIS CATEGORY */}
        {recentlyUsedReferences.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold tracking-wider uppercase text-gray-400 px-1">
              RECENTLY USED IN THIS CATEGORY
            </div>
            <div className="space-y-1">
              {recentlyUsedReferences
                .filter((r) => isValidParentType(r.step_type))
                .slice(0, 3)
                .map((r) => {
                  const isSelected = selectedRef?.id === r.id && !isSkipped;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelect(r)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs font-semibold transition flex items-center justify-between ${
                        isSelected
                          ? 'border-brand bg-brand/5 ring-1 ring-brand text-brand'
                          : 'border-gray-100 hover:border-gray-200 text-ink bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>▸ {r.title}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          {r.step_type || 'PROCESS'}
                        </span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand shrink-0" />}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* GROUP 3: ALL ACTIVE POLICIES */}
        {filteredActive.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold tracking-wider uppercase text-gray-400 px-1">
              ALL ACTIVE POLICIES & DECISIONS
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredActive.map((r) => {
                const isSelected = selectedRef?.id === r.id && !isSkipped;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelect(r)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition flex items-center justify-between ${
                      isSelected
                        ? 'border-brand bg-brand/5 ring-1 ring-brand text-brand font-bold'
                        : 'border-gray-100 hover:border-gray-200 text-ink bg-white'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold">{r.title}</span>
                      {r.statement && (
                        <span className="text-[11px] text-gray-400 ml-2 font-normal truncate">
                          — {r.statement}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-brand shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SKIP INDICATOR STATE */}
        {isSkipped && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Skipped rule reference ({skipReason || 'Unrecorded'}). Recorded as an organizational finding.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSkipped(false)}
              className="text-xs font-bold text-brand hover:underline"
            >
              Select rule instead
            </button>
          </div>
        )}
      </div>

      {/* NO RECORDED RULE SKIP MODAL */}
      {skipModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-ink">No Recorded Rule Applies</h3>
              <button
                type="button"
                onClick={() => setSkipModalOpen(false)}
                className="text-gray-400 hover:text-ink transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 font-medium">
              Select the reason why no recorded rule is being linked for this decision:
            </p>

            <div className="space-y-2">
              {/* Option 1: Rule exists but isn't recorded */}
              <div className="space-y-2 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => handleSkipSubmit('UNRECORDED_RULE')}
                  className="w-full text-left font-bold text-xs text-ink hover:text-brand transition flex items-center justify-between"
                >
                  <span>1. "The rule exists but isn't recorded here"</span>
                  <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded font-extrabold">
                    Select
                  </span>
                </button>
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    What is the rule, in one line? (Optional)
                  </label>
                  <input
                    type="text"
                    value={describedRule}
                    onChange={(e) => setDescribedRule(e.target.value)}
                    placeholder="e.g. CEO verbal approval policy for out-of-band hires"
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                  />
                </div>
              </div>

              {/* Option 2: Not sure */}
              <button
                type="button"
                onClick={() => handleSkipSubmit('NOT_SURE')}
                className="w-full text-left p-3 border border-gray-200 rounded-xl hover:border-gray-300 bg-white text-xs font-bold text-ink transition"
              >
                2. "I'm not sure which rule applies"
              </button>

              {/* Option 3: No rule governs */}
              <button
                type="button"
                onClick={() => handleSkipSubmit('NO_RULE')}
                className="w-full text-left p-3 border border-gray-200 rounded-xl hover:border-gray-300 bg-white text-xs font-bold text-ink transition"
              >
                3. "No rule governs this kind of decision"
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
