"use client";

import Link from 'next/link';

interface MetricStripProps {
  tenantSubdomain: string;
  needsApprovalCount: number;
  oldestWaitingDays?: number;
  inFlightCount: number;
  atFinalStageCount: number;
  sealedThisMonthCount: number;
  sealedIncreaseVsLastMonth?: number;
  policiesDriftingCount?: number;
  driftingPolicyNames?: string[];
}

export default function MetricStrip({
  tenantSubdomain,
  needsApprovalCount,
  oldestWaitingDays = 0,
  inFlightCount,
  atFinalStageCount,
  sealedThisMonthCount,
  sealedIncreaseVsLastMonth = 0,
  policiesDriftingCount = 0,
  driftingPolicyNames = [],
}: MetricStripProps) {
  const cards = [
    {
      label: 'NEEDS YOUR APPROVAL',
      value: needsApprovalCount,
      footnote:
        needsApprovalCount > 0
          ? `Oldest waiting ${oldestWaitingDays} ${oldestWaitingDays === 1 ? 'day' : 'days'}`
          : 'Nothing waiting on you',
      accentColor: 'border-t-[#B54708]',
      badgeColor: needsApprovalCount > 0 ? 'text-[#B54708] bg-[#FFFAEB]' : 'text-[#526377] bg-[#F3F6F8]',
      href: `/${tenantSubdomain}/approvals`,
    },
    {
      label: 'YOUR REQUESTS IN FLIGHT',
      value: inFlightCount,
      footnote: `${atFinalStageCount} at final stage`,
      accentColor: 'border-t-[#012F6B]',
      badgeColor: 'text-[#012F6B] bg-[#EDF2F6]',
      href: `/${tenantSubdomain}?filter=my-requests`,
    },
    {
      label: 'SEALED THIS MONTH',
      value: sealedThisMonthCount,
      footnote: `↑ ${sealedIncreaseVsLastMonth} vs last month`,
      accentColor: 'border-t-[#C9A227]',
      badgeColor: 'text-[#C9A227] bg-[#FDF6E3]',
      href: `/${tenantSubdomain}?filter=sealed`,
    },
    {
      label: 'POLICIES DRIFTING',
      value: policiesDriftingCount,
      footnote:
        driftingPolicyNames.length > 0
          ? driftingPolicyNames.slice(0, 2).join(', ')
          : 'All policies holding',
      accentColor: 'border-t-[#078899]',
      badgeColor: policiesDriftingCount > 0 ? 'text-[#B54708] bg-[#FFFAEB]' : 'text-[#078899] bg-[#F1FBFC]',
      href: `/${tenantSubdomain}/admin/policy-health`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className={`relative block p-5 bg-white border border-[#DDE5EC] border-t-2 ${card.accentColor} rounded-[10px] shadow-xs hover:shadow-card hover:border-[#059DB0]/50 transition-all duration-150 group`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8190A0] uppercase tracking-[0.06em]">
              {card.label}
            </span>
          </div>
          <div className="text-[32px] font-bold text-[#132238] tracking-tight mt-2 tabular-nums font-sans">
            {card.value}
          </div>
          <div className="text-[12px] font-medium text-[#526377] mt-1.5 truncate">
            {card.footnote}
          </div>
        </Link>
      ))}
    </div>
  );
}
