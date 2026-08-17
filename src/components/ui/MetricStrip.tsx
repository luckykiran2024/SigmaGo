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
  policiesDriftingCount: number;
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
  policiesDriftingCount,
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
      accentColor: 'border-l-[#B42318]', // --err
      href: `/${tenantSubdomain}/approvals`,
    },
    {
      label: 'YOUR REQUESTS IN FLIGHT',
      value: inFlightCount,
      footnote: `${atFinalStageCount} at final stage`,
      accentColor: 'border-l-[#274C77]', // --brand
      href: `/${tenantSubdomain}?filter=my-requests`,
    },
    {
      label: 'SEALED THIS MONTH',
      value: sealedThisMonthCount,
      footnote: `↑ ${sealedIncreaseVsLastMonth} vs last month`,
      accentColor: 'border-l-[#C9A227]', // Gold accent for Sealed card
      href: `/${tenantSubdomain}?filter=sealed`,
    },
    {
      label: 'POLICIES DRIFTING',
      value: policiesDriftingCount,
      footnote:
        driftingPolicyNames.length > 0
          ? driftingPolicyNames.slice(0, 2).join(', ')
          : 'All policies holding',
      accentColor: 'border-l-[#B54708]', // --warn
      href: `/${tenantSubdomain}/admin/policy-health`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
      {cards.map((card, idx) => (
        <Link
          key={card.label}
          href={card.href}
          className={`relative block p-4 bg-white border border-[#E4E7EC] rounded-[8px] border-l-4 ${card.accentColor} shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-[2px] group`}
        >
          <div className="text-[10.5px] font-bold text-[#98A2B3] uppercase tracking-[0.07em]">
            {card.label}
          </div>
          <div className="text-[29px] font-bold text-[#101828] tracking-[-0.02em] mt-1 font-sans">
            {card.value}
          </div>
          <div className="text-[11.5px] font-medium text-[#667085] mt-1 truncate">
            {card.footnote}
          </div>
        </Link>
      ))}
    </div>
  );
}
