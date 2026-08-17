"use client";

import Link from 'next/link';
import { ShieldCheck, Award } from 'lucide-react';

export interface SealedItem {
  id: string;
  refCode: string;
  subject: string;
  finalizedAt: string;
  checksum: string;
}

interface RecentlySealedPanelProps {
  tenantSubdomain: string;
  sealedDecisions: SealedItem[];
  sealedRateText?: string;
}

export default function RecentlySealedPanel({
  tenantSubdomain,
  sealedDecisions,
  sealedRateText = '18 of 19 decisions finalised this month carry a tamper-evident certificate.',
}: RecentlySealedPanelProps) {
  return (
    <div className="p-5 bg-[#FDF6E3] border border-[#E8DDB0] rounded-[8px] space-y-4 font-sans shadow-xs">
      {/* Header with Double-Ring Seal Glyph */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8DDB0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#C9A227] text-white flex items-center justify-center shadow-xs ring-4 ring-[#FDF6E3] border border-[#C9A227]">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[14.5px] font-bold text-[#101828] tracking-tight">
              Recently Sealed Decisions
            </h3>
            <p className="text-[11.5px] text-[#667085] font-medium">
              Cryptographically verified & tamper-evident certificates
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-[4px] bg-[#C9A227]/15 text-[#C9A227] border border-[#C9A227]/30 text-[10.5px] font-extrabold uppercase tracking-wider">
          Cryptographic Seal
        </span>
      </div>

      {/* List of Sealed Items */}
      <div className="space-y-2.5">
        {sealedDecisions.length === 0 ? (
          <p className="text-xs text-[#667085] font-medium py-2">
            No decisions finalized this month yet.
          </p>
        ) : (
          sealedDecisions.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              href={`/${tenantSubdomain}/requests/${item.id}/certificate`}
              className="flex items-center justify-between p-2.5 bg-white/80 hover:bg-white rounded-[6px] border border-[#E8DDB0]/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#C9A227] shrink-0" />
                <span className="font-mono text-[11.5px] font-semibold text-[#101828]">
                  {item.refCode}
                </span>
                <span className="text-[12.5px] text-[#344054] font-medium truncate group-hover:text-[#101828]">
                  {item.subject}
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#667085] shrink-0 ml-2">
                {new Date(item.finalizedAt).toLocaleDateString(undefined, {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
            </Link>
          ))
        )}
      </div>

      {/* Footer Seal Rate Disclaimer */}
      <div className="pt-2 border-t border-[#E8DDB0]/60 flex items-center gap-2 text-[11.5px] font-medium text-[#101828]">
        <ShieldCheck className="w-4 h-4 text-[#C9A227] shrink-0" />
        <span>{sealedRateText}</span>
      </div>
    </div>
  );
}
