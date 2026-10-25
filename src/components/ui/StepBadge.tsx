import React from 'react';

export type StepCategoryType = 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'EXCEPTIONAL' | 'PROCESS' | string;

interface StepBadgeProps {
  type: StepCategoryType;
  showLetter?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export default function StepBadge({
  type,
  showLetter = true,
  className = '',
  size = 'md',
}: StepBadgeProps) {
  const normalized = (type || 'TRANSACTIONAL').toUpperCase();

  let letter = 'T';
  let label = 'Transactional';
  let badgeClasses = 'bg-[#ECF6F5] text-[#096A72] border-[#D7ECEA]';
  let letterBg = 'bg-[#0B7780] text-white';

  if (normalized.startsWith('STRUCT')) {
    letter = 'S';
    label = 'Structural';
    badgeClasses = 'bg-[#E7EDF0] text-[#17324D] border-[#DCE5EA]';
    letterBg = 'bg-[#17324D] text-white';
  } else if (normalized.startsWith('EXCEPT')) {
    letter = 'E';
    label = 'Exceptional';
    badgeClasses = 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]';
    letterBg = 'bg-[#B54708] text-white';
  } else if (normalized.startsWith('PROC')) {
    letter = 'P';
    label = 'Process';
    badgeClasses = 'bg-[#EEF2F4] text-[#475467] border-[#DCE5EA]';
    letterBg = 'bg-[#526679] text-white';
  }

  const padClass = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-[12px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-[4px] tracking-tight ${padClass} ${badgeClasses} ${className}`}
    >
      {showLetter && (
        <span
          className={`w-3.5 h-3.5 rounded-[2px] flex items-center justify-center text-[9px] font-bold shrink-0 ${letterBg}`}
        >
          {letter}
        </span>
      )}
      <span>{label}</span>
    </span>
  );
}
