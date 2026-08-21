'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';
import { CategoryOption } from './GroupedCategoryPicker';

export interface PolicyBoundInfo {
  policyTitle: string;
  boundType: 'PERCENTAGE_MAX' | 'VALUE_MAX' | 'VALUE_MIN' | 'DATE_WINDOW' | 'COUNT_MAX' | 'NONE';
  boundValue: number;
  boundField?: string | null;
}

interface MisclassificationBannerProps {
  currentCategory: CategoryOption;
  policyBound: PolicyBoundInfo;
  enteredValue: number;
  exceptionCategory?: CategoryOption | null;
  onSwitchCategory: (newCategory: CategoryOption) => void;
  onKeepChoice: () => void;
  isOverrideKept: boolean;
}

export default function MisclassificationBanner({
  currentCategory,
  policyBound,
  enteredValue,
  exceptionCategory,
  onSwitchCategory,
  onKeepChoice,
  isOverrideKept,
}: MisclassificationBannerProps) {
  const boundLabel =
    policyBound.boundType === 'PERCENTAGE_MAX'
      ? `${policyBound.boundValue}%`
      : policyBound.boundType === 'VALUE_MAX'
      ? `₹${policyBound.boundValue.toLocaleString()}`
      : `${policyBound.boundValue}`;

  const enteredLabel =
    policyBound.boundType === 'PERCENTAGE_MAX'
      ? `${enteredValue}%`
      : policyBound.boundType === 'VALUE_MAX'
      ? `₹${enteredValue.toLocaleString()}`
      : `${enteredValue}`;

  if (isOverrideKept) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Classification override recorded: Keeping {currentCategory.name} despite breaching {policyBound.policyTitle} ({boundLabel}).</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3 font-sans shadow-sm">
      <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>⚠ THIS MAY BE THE WRONG CATEGORY</span>
      </div>

      <div className="text-xs text-amber-900 space-y-1 font-medium leading-relaxed">
        <p>
          You selected <strong>{currentCategory.name}</strong>, which follows the <strong>{policyBound.policyTitle}</strong> — capped at <strong>{boundLabel}</strong>.
        </p>
        <p>
          You have entered <strong>{enteredLabel}</strong>.
        </p>
        <p className="text-amber-800 font-semibold">
          This is an exception to that policy, not a routine decision. It needs a different approval path.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {exceptionCategory ? (
          <button
            type="button"
            onClick={() => onSwitchCategory(exceptionCategory)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <span>Switch to {exceptionCategory.name}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="text-2xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
            Flagged to admin: missing exception category for this policy.
          </div>
        )}

        <button
          type="button"
          onClick={onKeepChoice}
          className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold transition"
        >
          Keep my choice
        </button>
      </div>
    </div>
  );
}
