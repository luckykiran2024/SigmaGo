"use client";

import Link from 'next/link';

interface MetricStripProps {
  tenantSubdomain: string;
  needsApprovalCount: number;
  oldestWaitingDays?: number;
  inFlightCount: number;
  sealedThisMonthCount: number;
}

export default function MetricStrip({
  tenantSubdomain,
  needsApprovalCount,
  oldestWaitingDays = 0,
  inFlightCount,
  sealedThisMonthCount,
}: MetricStripProps) {
  const cards = [
    {
      label: 'NEEDS YOUR APPROVAL',
      value: needsApprovalCount,
      footnote:
        needsApprovalCount > 0
          ? oldestWaitingDays === 0 ? 'Oldest waiting less than a day' : `Oldest waiting ${oldestWaitingDays} ${oldestWaitingDays === 1 ? 'day' : 'days'}`
          : 'Nothing waiting on you',
      accentColor: 'border-t-[#B54708]',
      badgeColor: needsApprovalCount > 0 ? 'text-[#B54708] bg-[#FFFAEB]' : 'text-[#526679] bg-[#EEF2F4]',
      href: `/${tenantSubdomain}/approvals`,
    },
    {
      label: 'YOUR REQUESTS IN FLIGHT',
      value: inFlightCount,
      footnote: inFlightCount > 0 ? 'Awaiting a final outcome' : 'No open submissions',
      accentColor: 'border-t-[#17324D]',
      badgeColor: 'text-[#17324D] bg-[#E7EDF0]',
      href: `/${tenantSubdomain}?filter=my-requests`,
    },
    {
      label: 'SEALED THIS MONTH',
      value: sealedThisMonthCount,
      footnote: 'Finalized with an integrity seal',
      accentColor: 'border-t-[#0B7780]',
      badgeColor: 'text-[#0B7780] bg-[#ECF6F5]',
      href: `/${tenantSubdomain}?filter=sealed`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className={`relative block p-5 bg-white border border-[#DCE5EA] border-t-2 ${card.accentColor} rounded-[10px] shadow-xs hover:shadow-card hover:border-[#0B7780]/50 transition-all duration-150 group`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#637587] uppercase tracking-[0.06em]">
              {card.label}
            </span>
          </div>
          <div className="text-[32px] font-bold text-[#182B3D] tracking-tight mt-2 tabular-nums font-sans">
            {card.value}
          </div>
          <div className="text-[12px] font-medium text-[#526679] mt-1.5 truncate">
            {card.footnote}
          </div>
        </Link>
      ))}
    </div>
  );
}
