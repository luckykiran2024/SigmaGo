"use client";

import Link from 'next/link';
import StepBadge from './StepBadge';
import InlineExceptionBanner from './InlineExceptionBanner';

export interface DwellRequestCardProps {
  tenantSubdomain: string;
  requestId: string;
  refCode: string;
  subject: string;
  requesterName: string;
  department?: string;
  stepType?: 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS';
  enteredAt?: string | null;
  targetDaysOverride?: number;
  currentStageIndex: number;
  totalStages: number;
  exceptionSummary?: {
    ordinalText: string;
    policyTitle?: string;
    policyReasoning?: string;
  } | null;
  onApprove?: (id: string) => void;
}

export function formatDwellDuration(enteredAtIso?: string | null): { text: string; days: number } {
  if (!enteredAtIso) return { text: 'unavailable', days: 0 };

  const entered = new Date(enteredAtIso).getTime();
  if (!Number.isFinite(entered)) return { text: 'unavailable', days: 0 };
  const now = new Date().getTime();
  const diffMs = Math.max(0, now - entered);
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Number((diffMs / (1000 * 60 * 60 * 24)).toFixed(1));

  if (minutes < 90) {
    return { text: minutes < 1 ? 'less than 1 min' : `${minutes} min`, days };
  }
  if (hours < 24) {
    return { text: `${hours} hrs`, days };
  }
  return { text: `${Math.max(1, Math.floor(days))} ${Math.floor(days) === 1 ? 'day' : 'days'}`, days };
}

export default function DwellRequestCard({
  tenantSubdomain,
  requestId,
  refCode,
  subject,
  requesterName,
  department = 'General',
  stepType = 'TRANSACTIONAL',
  enteredAt,
  targetDaysOverride,
  currentStageIndex,
  totalStages,
  exceptionSummary,
  onApprove,
}: DwellRequestCardProps) {
  // 1. STEP Target Dwell Defaults
  const targetDefaults: Record<string, number> = {
    TRANSACTIONAL: 2,
    EXCEPTION: 3,
    STRUCTURAL: 5,
    PROCESS: 7,
  };

  const targetDays = targetDaysOverride || targetDefaults[stepType] || 2;
  const { text: dwellText, days: dwellDays } = formatDwellDuration(enteredAt);

  const ratio = dwellDays / targetDays;
  const barWidth = Math.min(1, ratio) * 100;

  // 2. State Threshold Colors
  let barColor = 'bg-[#0B7780]';
  let statusTextClass = 'text-[#17324D]';

  if (ratio >= 0.5 && ratio <= 1.0) {
    barColor = 'bg-[#B54708]';
    statusTextClass = 'text-[#B54708]';
  } else if (ratio > 1.0) {
    barColor = 'bg-[#B42318]';
    statusTextClass = 'text-[#B42318]';
  }

  return (
    <article className="p-5 bg-white border border-[#DCE5EA] rounded-[10px] shadow-xs space-y-4 font-sans hover:shadow-card hover:border-[#0B7780]/40 transition-all duration-150">
      {/* 1. Header: Title, Reference, and STEP Badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h3 className="text-[14.5px] font-semibold text-[#182B3D] tracking-tight leading-snug truncate">
            {subject}
          </h3>
          <div className="flex items-center gap-2 text-[12px] text-[#637587]">
            <span className="font-mono text-[#526679] font-medium">{refCode}</span>
            <span>·</span>
            <span className="font-medium text-[#182B3D]">{requesterName}</span>
            <span>·</span>
            <span>{department}</span>
          </div>
        </div>

        <StepBadge type={stepType} size="sm" />
      </div>

      {/* 2. The Aging Block (Dwell Progress Bar) */}
      <div className="space-y-1.5 bg-[#F6F8F9] p-3 rounded-[6px] border border-[#EAF0F2]">
        <div className="flex items-center justify-between text-[11.5px] font-medium">
          <span className={`font-semibold ${statusTextClass}`}>
            {dwellText === 'unavailable' ? 'Waiting time unavailable' : `Waiting ${dwellText} on you`}
          </span>
          <span className="text-[#637587]">Target {targetDays} days</span>
        </div>
        <div className="w-full h-1.5 bg-[#DCE5EA] rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-700 ease-out`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* 3. Contextual Notice (Inline Exception Warning) */}
      {exceptionSummary && (
        <InlineExceptionBanner
          ordinalText={exceptionSummary.ordinalText}
          policyTitle={exceptionSummary.policyTitle}
          policyReasoning={exceptionSummary.policyReasoning}
        />
      )}

      {/* 4. Stage Indicator Dots */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalStages }).map((_, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;

            return (
              <span
                key={idx}
                aria-label={`Stage ${idx + 1} of ${totalStages}`}
                className={`w-2 h-2 rounded-full transition-all ${
                  isCompleted
                    ? 'bg-[#0F7548]'
                    : isCurrent
                    ? 'bg-[#0B7780] ring-2 ring-[#D7ECEA]'
                    : 'border border-[#DCE5EA] bg-transparent'
                }`}
              />
            );
          })}
          <span className="ml-2 text-[11.5px] font-medium text-[#526679]">
            {currentStageIndex === totalStages - 1
              ? 'You are the final approver'
              : `Stage ${currentStageIndex + 1} of ${totalStages}`}
          </span>
        </div>

        {/* 5. Footer Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/${tenantSubdomain}/requests/${requestId}`}
            className="px-3 py-1.5 rounded-[6px] border border-[#DCE5EA] text-[#526679] hover:bg-[#F6F8F9] hover:text-[#17324D] text-[12.5px] font-medium transition-colors"
          >
            Open
          </Link>
          {onApprove && (
            <button
              onClick={() => onApprove(requestId)}
              className="px-3.5 py-1.5 rounded-[6px] bg-[#17324D] hover:bg-[#224564] text-white text-[12.5px] font-semibold shadow-xs transition-colors"
            >
              Approve
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
