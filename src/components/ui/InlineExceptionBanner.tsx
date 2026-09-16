"use client";

import { AlertTriangle } from 'lucide-react';

interface InlineExceptionBannerProps {
  ordinalText: string;
  policyTitle?: string;
  policyReasoning?: string;
}

export default function InlineExceptionBanner({
  ordinalText,
  policyTitle,
  policyReasoning
}: InlineExceptionBannerProps) {
  if (!ordinalText) return null;

  return (
    <div className="rounded-[8px] border border-[#FEDF89] bg-[#FFFAEB] p-4 shadow-xs space-y-2 font-sans">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-[6px] bg-[#FEF0C7] text-[#B54708] shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-semibold text-[#B54708] tracking-tight">
              Governance & Drift Warning
            </h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-[#FEDF89] text-[#B54708] uppercase tracking-wider">
              Exception Category
            </span>
          </div>
          <p className="text-[13px] font-medium text-[#7A2E0E] mt-1">
            {ordinalText}
          </p>

          {policyReasoning && (
            <div className="mt-2.5 pt-2 border-t border-[#FEDF89]/60 text-[12px] text-[#7A2E0E]/90">
              <span className="font-semibold text-[#7A2E0E]">Original Policy Intent: </span>
              {policyReasoning}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
