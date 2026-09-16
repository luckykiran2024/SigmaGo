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
    <div className="bg-[#FFFAEB] border border-[#FEDF89] rounded-[10px] p-5 mb-6 shadow-xs font-sans space-y-4">
      {/* Policy Quoted Header */}
      <div className="flex items-start gap-3 pb-3 border-b border-[#FEDF89]">
        <ShieldAlert className="w-5 h-5 text-[#B54708] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="text-[11px] uppercase font-semibold text-[#B54708] tracking-wider">
            Exception Request Policy Context
          </span>
          <h3 className="text-[15px] font-bold text-[#132238]">{policyTitle}</h3>
          <blockquote className="mt-1.5 text-[13px] text-[#526377] italic bg-white/80 px-3.5 py-2.5 rounded-[6px] border-l-2 border-[#B54708] border border-[#EAF0F4]">
            &quot;{policyStatement}&quot;
          </blockquote>
        </div>
      </div>

      {/* Large Ordinal Display */}
      <div className="py-4 px-4 text-center bg-white rounded-[8px] border border-[#FEDF89]/80 shadow-xs">
        <span className="block text-[20px] font-bold text-[#B54708] tracking-tight">
          This is the {ordinalFormatted} exception to this policy this year.
        </span>
        <p className="text-[12px] text-[#526377] mt-1 font-medium">
          Organizational intelligence pattern detection active.
        </p>
      </div>

      {/* Ordinal >= 4 Revision Warning */}
      {ordinalThisYear >= 4 && (
        <div className="flex items-center gap-2.5 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-[12.5px] font-medium px-3.5 py-2.5 rounded-[6px]">
          <AlertTriangle className="w-4 h-4 text-[#B42318] shrink-0" />
          <span>Consider whether this policy needs revising rather than bending again.</span>
        </div>
      )}

      {/* Prior Exceptions List */}
      {priorExceptions && priorExceptions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider">
            Prior Exceptions Granted This Year ({priorExceptions.length})
          </h4>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {priorExceptions.map((ex) => (
              <div
                key={ex.requestId}
                className="flex items-center justify-between text-[12px] bg-white px-3 py-2 rounded-[6px] border border-[#FEDF89]/60 text-[#132238]"
              >
                <span className="font-mono font-semibold text-[#012F6B]">{ex.ref}</span>
                <span className="text-[#526377]">Approved by {ex.approvedBy}</span>
                <span className="text-[11.5px] text-[#8190A0]">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px]">
        <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-[6px] border border-[#FEDF89]/60 text-[#526377]">
          <Users className="w-4 h-4 text-[#B54708]" />
          <span>
            {distinctApprovers >= 3
              ? `Granted by ${distinctApprovers} different approvers.`
              : `${distinctApprovers} distinct approver(s) involved.`}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-[6px] border border-[#FEDF89]/60 text-[#526377]">
          <Layers className="w-4 h-4 text-[#B54708]" />
          <span>{impactFactor} decision(s) currently rest on this policy.</span>
        </div>
      </div>

      {/* Two-Sided Case Display */}
      <div className="border-t border-[#FEDF89] pt-3 text-[12.5px]">
        <h4 className="font-semibold text-[#132238] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#B54708]" /> Two-Sided Reasoning Case
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-[6px] border border-[#FEDF89]/60 space-y-1">
            <span className="block font-semibold text-[#B54708] text-[11px] uppercase tracking-wide">Cost / Risk of NOT Deciding:</span>
            <p className="text-[#526377]">{costOfNotDeciding || 'Not stated by requester.'}</p>
          </div>
          <div className="bg-white p-3 rounded-[6px] border border-[#FEDF89]/60 space-y-1">
            <span className="block font-semibold text-[#B54708] text-[11px] uppercase tracking-wide">Cost / Risk of Approving:</span>
            <p className="text-[#526377]">
              {costOfDeciding ? costOfDeciding : 'Cost of approving: not stated by the requester.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
