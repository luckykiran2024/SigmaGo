'use client';

import { AlertTriangle, ShieldAlert, FileText, Users, Layers } from 'lucide-react';

export interface PriorException {
  requestId: string;
  ref: string;
  approvedBy: string;
  approvedAt: string | null;
  note: string | null;
}

export interface ExceptionContextPanelProps {
  policyTitle: string;
  policyStatement: string;
  ordinalThisYear: number;
  priorExceptions: PriorException[];
  distinctApprovers: number;
  impactFactor: number;
  costOfNotDeciding?: string | null;
  costOfDeciding?: string | null;
}

export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function ExceptionContextPanel({
  policyTitle,
  policyStatement,
  ordinalThisYear,
  priorExceptions,
  distinctApprovers,
  impactFactor,
  costOfNotDeciding,
  costOfDeciding,
}: ExceptionContextPanelProps) {
  const ordinalFormatted = getOrdinalSuffix(ordinalThisYear);

  return (
    <div className="bg-[#FFFBEB] border-2 border-[#F59E0B] rounded-xl p-5 mb-6 shadow-sm font-sans">
      {/* Policy Quoted Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-[#FCD34D]">
        <ShieldAlert className="w-6 h-6 text-[#D97706] shrink-0 mt-0.5" />
        <div>
          <span className="text-[11px] uppercase font-bold text-[#B45309] tracking-wider">
            Exception Request Policy Context
          </span>
          <h3 className="text-base font-bold text-[#78350F]">{policyTitle}</h3>
          <blockquote className="mt-1 text-xs text-[#92400E] italic bg-[#FEF3C7] px-3 py-2 rounded border-l-2 border-[#D97706]">
            "{policyStatement}"
          </blockquote>
        </div>
      </div>

      {/* Large Ordinal Display */}
      <div className="py-5 text-center bg-[#FEF3C7] rounded-lg my-4 border border-[#FDE68A]">
        <span className="block text-3xl font-extrabold text-[#78350F] tracking-tight">
          This is the {ordinalFormatted} exception to this policy this year.
        </span>
        <p className="text-xs text-[#92400E] mt-1 font-medium">
          Organizational intelligence pattern detection active.
        </p>
      </div>

      {/* Ordinal >= 4 Revision Warning */}
      {ordinalThisYear >= 4 && (
        <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold px-3.5 py-2.5 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
          <span>Consider whether this policy needs revising rather than bending again.</span>
        </div>
      )}

      {/* Prior Exceptions List */}
      {priorExceptions && priorExceptions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-bold text-[#78350F] uppercase tracking-wider mb-2">
            Prior Exceptions Granted This Year ({priorExceptions.length})
          </h4>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {priorExceptions.map((ex) => (
              <div
                key={ex.requestId}
                className="flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded border border-[#FDE68A] text-[#451A03]"
              >
                <span className="font-mono font-bold text-[#B45309]">{ex.ref}</span>
                <span>Approved by {ex.approvedBy}</span>
                <span className="text-[11px] text-[#78350F]">
                  {ex.approvedAt
                    ? new Date(ex.approvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : 'Recent'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Row: Distinct Approvers & Impact Factor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-4">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-[#FDE68A] text-[#78350F]">
          <Users className="w-4 h-4 text-[#D97706]" />
          <span>
            {distinctApprovers >= 3
              ? `Granted by ${distinctApprovers} different approvers.`
              : `${distinctApprovers} distinct approver(s) involved.`}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-[#FDE68A] text-[#78350F]">
          <Layers className="w-4 h-4 text-[#D97706]" />
          <span>{impactFactor} decision(s) currently rest on this policy.</span>
        </div>
      </div>

      {/* Two-Sided Case Display */}
      <div className="border-t border-[#FCD34D] pt-3 text-xs">
        <h4 className="font-bold text-[#78350F] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#D97706]" /> Two-Sided Reasoning Case
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white p-2.5 rounded border border-[#FDE68A]">
            <span className="block font-bold text-[#92400E] text-[11px]">Cost / Risk of NOT Deciding:</span>
            <p className="text-[#451A03] mt-0.5">{costOfNotDeciding || 'Not stated by requester.'}</p>
          </div>
          <div className="bg-white p-2.5 rounded border border-[#FDE68A]">
            <span className="block font-bold text-[#92400E] text-[11px]">Cost / Risk of Approving:</span>
            <p className="text-[#451A03] mt-0.5">
              {costOfDeciding ? costOfDeciding : 'Cost of approving: not stated by the requester.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
