"use client";

import { AlertTriangle, ShieldAlert } from 'lucide-react';

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
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm space-y-2">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-amber-900 font-sans tracking-tight">
              Governance & Drift Warning
            </h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-extrabold bg-amber-200/80 text-amber-900 uppercase tracking-wider">
              Exception Category
            </span>
          </div>
          <p className="text-sm font-extrabold text-amber-950 mt-1 font-sans">
            {ordinalText}
          </p>

          {policyReasoning && (
            <div className="mt-2.5 pt-2.5 border-t border-amber-200/60 text-xs text-amber-900/90 font-medium">
              <span className="font-bold text-amber-950">Original Policy Intent: </span>
              {policyReasoning}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
