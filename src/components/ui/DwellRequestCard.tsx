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
  if (!enteredAtIso) return { text: '1 hr', days: 0.04 };

  const entered = new Date(enteredAtIso).getTime();
  const now = new Date().getTime();
  const diffMs = Math.max(0, now - entered);
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Number((diffMs / (1000 * 60 * 60 * 24)).toFixed(1));

  if (minutes < 90) {
    return { text: `${Math.max(1, minutes)} min`, days: days || 0.04 };
  }
  if (hours < 24) {
    return { text: `${hours} hrs`, days: days || 0.04 };
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
  let barColor = 'bg-[#059DB0]';
  let statusTextClass = 'text-[#012F6B]';

  if (ratio >= 0.5 && ratio <= 1.0) {
    barColor = 'bg-[#B54708]';
    statusTextClass = 'text-[#B54708]';
  } else if (ratio > 1.0) {
    barColor = 'bg-[#B42318]';
    statusTextClass = 'text-[#B42318]';
  }

  return (
    <article className="p-5 bg-white border border-[#DDE5EC] rounded-[10px] shadow-xs space-y-4 font-sans hover:shadow-card hover:border-[#059DB0]/40 transition-all duration-150">
      {/* 1. Header: Title, Reference, and STEP Badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h3 className="text-[14.5px] font-semibold text-[#132238] tracking-tight leading-snug truncate">
            {subject}
          </h3>
          <div className="flex items-center gap-2 text-[12px] text-[#8190A0]">
            <span className="font-mono text-[#526377] font-medium">{refCode}</span>
            <span>·</span>
            <span className="font-medium text-[#132238]">{requesterName}</span>
            <span>·</span>
            <span>{department}</span>
          </div>
        </div>

        <StepBadge type={stepType} size="sm" />
      </div>

      {/* 2. The Aging Block (Dwell Progress Bar) */}
      <div className="space-y-1.5 bg-[#F7FAFC] p-3 rounded-[6px] border border-[#EAF0F4]">
        <div className="flex items-center justify-between text-[11.5px] font-medium">
          <span className={`font-semibold ${statusTextClass}`}>
            Waiting {dwellText} on you
          </span>
          <span className="text-[#8190A0]">Target {targetDays} days</span>
        </div>
        <div className="w-full h-1.5 bg-[#DDE5EC] rounded-full overflow-hidden">
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
                    ? 'bg-[#059DB0] ring-2 ring-[#DDF5F7]'
                    : 'border border-[#DDE5EC] bg-transparent'
                }`}
              />
            );
          })}
          <span className="ml-2 text-[11.5px] font-medium text-[#526377]">
            {currentStageIndex === totalStages - 1
              ? 'You are the final approver'
              : `Stage ${currentStageIndex + 1} of ${totalStages}`}
          </span>
        </div>

        {/* 5. Footer Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/${tenantSubdomain}/requests/${requestId}`}
            className="px-3 py-1.5 rounded-[6px] border border-[#DDE5EC] text-[#526377] hover:bg-[#F7FAFC] hover:text-[#012F6B] text-[12.5px] font-medium transition-colors"
          >
            Open
          </Link>
          {onApprove && (
            <button
              onClick={() => onApprove(requestId)}
              className="px-3.5 py-1.5 rounded-[6px] bg-[#012F6B] hover:bg-[#033E79] text-white text-[12.5px] font-semibold shadow-xs transition-colors"
            >
              Approve
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
