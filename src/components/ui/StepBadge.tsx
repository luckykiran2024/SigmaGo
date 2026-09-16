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
  let badgeClasses = 'bg-[#F1FBFC] text-[#078899] border-[#DDF5F7]';
  let letterBg = 'bg-[#059DB0] text-white';

  if (normalized.startsWith('STRUCT')) {
    letter = 'S';
    label = 'Structural';
    badgeClasses = 'bg-[#EDF2F6] text-[#012F6B] border-[#DDE5EC]';
    letterBg = 'bg-[#012F6B] text-white';
  } else if (normalized.startsWith('EXCEPT')) {
    letter = 'E';
    label = 'Exceptional';
    badgeClasses = 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]';
    letterBg = 'bg-[#B54708] text-white';
  } else if (normalized.startsWith('PROC')) {
    letter = 'P';
    label = 'Process';
    badgeClasses = 'bg-[#F3F6F8] text-[#475467] border-[#DDE5EC]';
    letterBg = 'bg-[#526377] text-white';
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
