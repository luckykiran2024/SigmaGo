"use client";

import React from 'react';
import Link from 'next/link';
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface IntelligenceHeaderProps {
  tenant: string;
  userEmail: string;
  grantScope: string;
  isAdmin: boolean;
  periodDisplayName: string;
  comparatorDisplayName: string;
  coverage?: {
    percentage: number;
    isReliable: boolean;
    label: string;
  };
}

export default function IntelligenceHeader({
  tenant,
  userEmail,
  grantScope,
  isAdmin,
  periodDisplayName,
  comparatorDisplayName,
  coverage,
}: IntelligenceHeaderProps) {
  return (
    <header className="space-y-4" role="banner">
      {/* Admin Notice */}
      {isAdmin && (
        <div
          role="region"
          aria-label="Administrator Notice"
          className="p-3.5 rounded-[8px] bg-[#F7FAFC] border border-[#DDE5EC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px]"
        >
          <div className="flex items-center gap-2 text-[#526377]">
            <Lock className="w-4 h-4 shrink-0 text-[#012F6B]" aria-hidden="true" />
            <span>Administrator access: Manage recipient access grants and intelligence permissions.</span>
          </div>
          <Link
            href={`/${tenant}/admin/intelligence`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] border border-[#DDE5EC] bg-white hover:bg-[#F3F6F8] text-[#012F6B] text-[12px] font-medium transition-colors shrink-0"
          >
            <span>Manage access grants</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Page Title & Scope */}
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 border-b border-[#DDE5EC] pb-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#132238] tracking-tight">
            Organisational Intelligence
          </h1>
          <p className="text-[13.5px] text-[#526377] mt-0.5">
            Decision activity, structural shifts, and governance patterns across the enterprise.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-[#8190A0]">
          <span>Decoupled access for <strong className="text-[#132238] font-medium">{userEmail}</strong></span>
          <span aria-hidden="true">·</span>
          <span className="px-2 py-0.5 rounded-[4px] bg-[#F3F6F8] text-[#526377] font-medium uppercase text-[10px] border border-[#DDE5EC]">
            {grantScope}
          </span>
        </div>
      </div>

      {/* Visible Context Filters Bar */}
      <nav aria-label="Context Filters" className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[8px] bg-white border border-[#DDE5EC]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#DDE5EC] bg-[#F7FAFC] text-[13px]">
            <span className="text-[#8190A0] text-[12px]">Period:</span>
            <span className="font-semibold text-[#132238]">{periodDisplayName}</span>
          </div>

          {/* Explicit Comparator Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#DDE5EC] bg-white text-[13px]">
            <span className="text-[#8190A0] text-[12px]">Compare with:</span>
            <span className="font-medium text-[#132238]">{comparatorDisplayName}</span>
          </div>

          {/* Organisational Scope */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#DDE5EC] bg-white text-[13px]">
            <span className="text-[#8190A0] text-[12px]">Scope:</span>
            <span className="font-medium text-[#132238]">All Functions · All Workflows</span>
          </div>
        </div>

        {/* Evidence Quality Status */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-[4px] text-[12px] font-medium flex items-center gap-1.5 ${
              coverage?.isReliable
                ? 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]'
                : 'bg-[#F3F6F8] text-[#526377] border border-[#DDE5EC]'
            }`}
          >
            {coverage?.isReliable ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{coverage?.label || 'Data coverage'}</span>
          </span>
        </div>
      </nav>
    </header>
  );
}
