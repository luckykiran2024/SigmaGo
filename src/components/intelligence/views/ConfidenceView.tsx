"use client";

import React from 'react';
import { CheckCircle2, AlertCircle, ShieldCheck, Database, Calendar } from 'lucide-react';
import { StepDistributionResult } from '@/lib/intelligence/analytics/distributions';
import { IntelligenceSignal } from '@/lib/intelligence/analytics/signals';

interface ConfidenceViewProps {
  distribution: StepDistributionResult;
  periodDisplayName: string;
  coverage?: {
    percentage: number;
    stepResolutionCoverage: number;
    workflowVersionCoverage: number;
    policyLinkageCoverage: number;
    comparablePeriodsCount: number;
    isReliable: boolean;
    label: string;
  };
  signals: IntelligenceSignal[];
}

export default function ConfidenceView({
  distribution,
  periodDisplayName,
  coverage,
  signals,
}: ConfidenceViewProps) {
  const coveragePct = coverage?.percentage ?? 0;
  const comparablePeriods = coverage?.comparablePeriodsCount ?? 0;
  const isReliable = coverage?.isReliable ?? (coveragePct >= 80);

  // Overall signal confidence summary
  let aggregateConfidence = isReliable ? 'Reliable' : 'Developing';
  if (coveragePct >= 90 && comparablePeriods >= 3) {
    aggregateConfidence = 'Strong';
  } else if (coveragePct < 50) {
    aggregateConfidence = 'Developing';
  }

  return (
    <div className="space-y-6">
      {/* Evidence Quality Primary Banner */}
      <div
        className={`p-6 rounded-[8px] border transition-colors ${
          isReliable
            ? 'bg-white border-[#DDE5EC]'
            : 'bg-[#FFFAEB] border-[#FEDF89]'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isReliable
                ? 'bg-[#ECFDF3] text-[#027A48]'
                : 'bg-[#FEF0C7] text-[#B54708]'
            }`}
          >
            {isReliable ? (
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[12px] font-medium text-[#8190A0] uppercase tracking-wider">
              Evidence Quality
            </span>
            <h3 className="text-[20px] font-semibold text-[#132238] tracking-tight">
              {isReliable ? 'Evidence is Reliable' : 'Evidence is Still Developing'}
            </h3>
            <p className="text-[13.5px] text-[#526377] max-w-2xl leading-relaxed">
              {isReliable
                ? `Most decisions in this period have enough structured information for comparison, and sufficient comparable history (${comparablePeriods} comparable periods) is available for the signals shown across this briefing.`
                : `Only ${coveragePct}% of decisions have sufficient classification coverage, so SigmaGo is limiting the conclusions shown until more decision history is recorded.`}
            </p>
          </div>
        </div>
      </div>

      {/* 3 Core Evidence Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* STEP Resolution Coverage */}
        <div className="p-4 rounded-[8px] bg-white border border-[#DDE5EC] space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] text-[#8190A0]">
            <Database className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Classification Coverage</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold text-[#132238] tabular-nums">
              {coveragePct}%
            </span>
            <span className="text-[12px] text-[#526377]">of decisions</span>
          </div>
          <p className="text-[12px] text-[#526377]">
            Decisions with resolved STEP governance type and active schema version.
          </p>
        </div>

        {/* Comparable Historical Periods */}
        <div className="p-4 rounded-[8px] bg-white border border-[#DDE5EC] space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] text-[#8190A0]">
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Comparable History</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold text-[#132238] tabular-nums">
              {comparablePeriods}
            </span>
            <span className="text-[12px] text-[#526377]">periods</span>
          </div>
          <p className="text-[12px] text-[#526377]">
            Prior same-quarter periods used to construct baseline comparisons and observed ranges.
          </p>
        </div>

        {/* Signal Confidence */}
        <div className="p-4 rounded-[8px] bg-white border border-[#DDE5EC] space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] text-[#8190A0]">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Signal Confidence</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold text-[#132238]">
              {aggregateConfidence}
            </span>
          </div>
          <p className="text-[12px] text-[#526377]">
            Human-readable confidence grade based on sample size and policy linkage depth.
          </p>
        </div>
      </div>

      {/* Coverage Breakdown Table */}
      <div className="p-5 rounded-[8px] bg-white border border-[#DDE5EC] space-y-3">
        <div className="border-b border-[#DDE5EC] pb-3">
          <h3 className="text-[15px] font-semibold text-[#132238]">
            Underlying Data Integrity & Verification
          </h3>
          <p className="text-[12.5px] text-[#526377] mt-0.5">
            Breakdown of data resolution criteria supporting executive signals.
          </p>
        </div>

        <div className="border border-[#DDE5EC] rounded-[8px] overflow-hidden">
          <table className="w-full text-left text-[13px] text-[#132238]">
            <caption className="sr-only">Data integrity verification metrics</caption>
            <thead className="bg-[#F7FAFC] text-[#8190A0] font-semibold text-[11px] uppercase tracking-wider border-b border-[#DDE5EC]">
              <tr>
                <th scope="col" className="py-2.5 px-3.5">Integrity Dimension</th>
                <th scope="col" className="py-2.5 px-3.5">Measurement</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Coverage</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Quality Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF0F4]">
              <tr>
                <td className="py-2.5 px-3.5 font-medium text-[#132238]">
                  STEP Resolution Coverage
                </td>
                <td className="py-2.5 px-3.5 text-[12px] text-[#526377]">
                  Decisions categorized into Structural, Transactional, Exception, or Process
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[#132238]">
                  {Math.round((coverage?.stepResolutionCoverage ?? 0) * 100)}%
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${
                    (coverage?.stepResolutionCoverage ?? 0) >= 0.8
                      ? 'bg-[#ECFDF3] text-[#027A48]'
                      : 'bg-[#FFFAEB] text-[#B54708]'
                  }`}>
                    {(coverage?.stepResolutionCoverage ?? 0) >= 0.8 ? 'Complete' : 'Developing'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3.5 font-medium text-[#132238]">
                  Workflow Version Pinning
                </td>
                <td className="py-2.5 px-3.5 text-[12px] text-[#526377]">
                  Decisions explicitly bound to immutable workflow version snapshots
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[#132238]">
                  {Math.round((coverage?.workflowVersionCoverage ?? 0) * 100)}%
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${
                    (coverage?.workflowVersionCoverage ?? 0) >= 0.8
                      ? 'bg-[#ECFDF3] text-[#027A48]'
                      : 'bg-[#FFFAEB] text-[#B54708]'
                  }`}>
                    {(coverage?.workflowVersionCoverage ?? 0) >= 0.8 ? 'Verified' : 'Developing'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3.5 font-medium text-[#132238]">
                  Governing Policy Linkage
                </td>
                <td className="py-2.5 px-3.5 text-[12px] text-[#526377]">
                  Decisions tied directly to enterprise governing policy documents
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[#132238]">
                  {Math.round((coverage?.policyLinkageCoverage ?? 0) * 100)}%
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${
                    (coverage?.policyLinkageCoverage ?? 0) >= 0.8
                      ? 'bg-[#ECFDF3] text-[#027A48]'
                      : 'bg-[#FFFAEB] text-[#B54708]'
                  }`}>
                    {(coverage?.policyLinkageCoverage ?? 0) >= 0.8 ? 'Verified' : 'Developing'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
