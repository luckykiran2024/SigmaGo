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
    <div className="p-4 bg-white border border-[#E4E7EC] rounded-[8px] shadow-xs space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-[0.08em]">
          Decision Lifecycle & Integrity
        </h4>
        <span className="text-[11px] text-[#667085] font-medium">
          RRRR Protocol
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {states.map((item) => {
          const isFull = item.state === 'full';
          const isPartial = item.state === 'partial';
          const isProvableFull = item.label === 'PROVABLE' && isFull;

          // Gold Rule (§3 & §7): Only Provable when sealed may use --seal styling
          let cardStyle = 'bg-[#F9FAFB] border-[#E4E7EC] text-[#667085]';
          let badgeStyle = 'bg-[#F4F6F8] text-[#667085]';

          if (isProvableFull) {
            cardStyle = 'bg-[#FDF6E3] border-[#E8DDB0] text-[#101828]';
            badgeStyle = 'bg-[#C9A227] text-white';
          } else if (isFull) {
            cardStyle = 'bg-[#E6F4ED] border-[#0F7548]/20 text-[#0F7548]';
            badgeStyle = 'bg-[#0F7548] text-white';
          } else if (isPartial) {
            cardStyle = 'bg-[#FEF3E5] border-[#FDE3C0] text-[#B54708]';
            badgeStyle = 'bg-[#B54708] text-white';
          }

          return (
            <div
              key={item.label}
              className={`p-3 rounded-[6px] border ${cardStyle} space-y-1.5 transition-colors relative group`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-extrabold uppercase tracking-[0.07em]">
                  {item.label}
                </span>

                <div className="flex items-center gap-1">
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
                    <HelpCircle className="w-3.5 h-3.5 text-[#98A2B3] cursor-help hover:text-[#344054]" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-48 p-2 bg-[#101828] text-white text-[11px] rounded-[6px] shadow-lg z-50 pointer-events-none leading-tight font-medium">
                      {item.tooltip}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11.5px] font-semibold leading-tight">
                {item.copy}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
