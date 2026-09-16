"use client";

import { decisionLifecycle, RequestLifecycleInput } from '@/lib/vocabulary/lifecycle';
import { Check, HelpCircle } from 'lucide-react';

interface LifecycleStripProps {
  request: RequestLifecycleInput;
}

export default function LifecycleStrip({ request }: LifecycleStripProps) {
  const lifecycle = decisionLifecycle(request);

  const states = [
    lifecycle.recorded,
    lifecycle.retrievable,
    lifecycle.provable,
    lifecycle.reusable,
  ];

  return (
    <div className="p-5 bg-white border border-[#DDE5EC] rounded-[10px] shadow-xs space-y-3.5 font-sans">
      <div className="flex items-center justify-between pb-2 border-b border-[#EAF0F4]">
        <h4 className="text-[11px] font-semibold text-[#8190A0] uppercase tracking-[0.08em]">
          Decision Lifecycle & Integrity
        </h4>
        <span className="text-[11.5px] text-[#526377] font-mono font-medium">
          RRRR Protocol
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {states.map((item) => {
          const isFull = item.state === 'full';
          const isPartial = item.state === 'partial';
          const isProvableFull = item.label === 'PROVABLE' && isFull;

          let cardStyle = 'bg-[#F7FAFC] border-[#EAF0F4] text-[#526377]';
          let badgeStyle = 'bg-[#EDF2F6] text-[#8190A0]';

          if (isProvableFull) {
            cardStyle = 'bg-[#FDF6E3]/60 border-[#E8DDB0] text-[#132238]';
            badgeStyle = 'bg-[#C9A227] text-white';
          } else if (isFull) {
            cardStyle = 'bg-[#ECFDF3] border-[#A6F4C5] text-[#027A48]';
            badgeStyle = 'bg-[#0F7548] text-white';
          } else if (isPartial) {
            cardStyle = 'bg-[#FFFAEB] border-[#FEDF89] text-[#B54708]';
            badgeStyle = 'bg-[#B54708] text-white';
          }

          return (
            <div
              key={item.label}
              className={`p-3.5 rounded-[8px] border ${cardStyle} space-y-2 transition-colors relative group`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em]">
                  {item.label}
                </span>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${badgeStyle}`}
                  >
                    {isFull ? (
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    ) : (
                      '—'
                    )}
                  </span>
                  <div className="relative group/tooltip">
                    <HelpCircle className="w-3.5 h-3.5 text-[#8190A0] cursor-help hover:text-[#132238]" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-52 p-2.5 bg-[#07182F] text-white text-[11px] rounded-[6px] shadow-dropdown z-50 pointer-events-none leading-relaxed font-normal">
                      {item.tooltip}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[12px] font-medium leading-snug">
                {item.copy}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
