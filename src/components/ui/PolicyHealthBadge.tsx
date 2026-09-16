import React from 'react';

export type PolicyHealthState = 'HEALTHY' | 'WATCH' | 'DRIFTING' | 'REVISED' | string;

interface PolicyHealthBadgeProps {
  status: PolicyHealthState;
  className?: string;
}

export default function PolicyHealthBadge({ status, className = '' }: PolicyHealthBadgeProps) {
  const norm = (status || 'HEALTHY').toUpperCase();

  let label = 'Healthy';
  let badgeStyle = 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]';
  let dotColor = 'bg-[#0F7548]';

  if (norm === 'WATCH') {
    label = 'Watch';
    badgeStyle = 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]';
    dotColor = 'bg-[#B54708]';
  } else if (norm === 'DRIFTING') {
    label = 'Drifting';
    badgeStyle = 'bg-[#FEF6EE] text-[#B93815] border-[#F9DBAF]';
    dotColor = 'bg-[#B93815]';
  } else if (norm === 'REVISED') {
    label = 'Revised';
    badgeStyle = 'bg-[#EDF2F6] text-[#012F6B] border-[#DDE5EC]';
    dotColor = 'bg-[#012F6B]';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11.5px] font-medium border rounded-[4px] tracking-tight ${badgeStyle} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
}
