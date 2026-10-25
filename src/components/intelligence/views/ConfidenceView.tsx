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



  return (
    <div className="space-y-6">
      {/* Evidence Quality Primary Banner */}
      <div
        className={`p-6 rounded-[8px] border transition-colors ${
          isReliable
            ? 'bg-white border-[#DCE5EA]'
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
            <span className="text-[12px] font-medium text-[#637587] uppercase tracking-wider">
              Evidence Quality
            </span>
            <h3 className="text-[20px] font-semibold text-[#182B3D] tracking-tight">
              {isReliable ? 'Coverage supports comparison' : 'Coverage is still developing'}
            </h3>
            <p className="text-[13.5px] text-[#526679] max-w-2xl leading-relaxed">
              {isReliable
                ? `${coveragePct}% of decisions have sufficient classification coverage. The briefing compares recorded data across ${comparablePeriods} comparable period(s); it does not predict future outcomes.`
                : `Only ${coveragePct}% of decisions have sufficient classification coverage, so comparisons remain limited until more decision history is recorded.`}
            </p>
          </div>
        </div>
      </div>

      {/* 3 Core Evidence Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* STEP Resolution Coverage */}
        <div className="p-4 rounded-[8px] bg-white border border-[#DCE5EA] space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] text-[#637587]">
            <Database className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Classification Coverage</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold text-[#182B3D] tabular-nums">
              {coveragePct}%
            </span>
            <span className="text-[12px] text-[#526679]">of decisions</span>
          </div>
          <p className="text-[12px] text-[#526679]">
            Decisions with resolved STEP governance type and active schema version.
          </p>
        </div>

        {/* Comparable Historical Periods */}
        <div className="p-4 rounded-[8px] bg-white border border-[#DCE5EA] space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] text-[#637587]">
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Comparable History</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold text-[#182B3D] tabular-nums">
              {comparablePeriods}
            </span>
            <span className="text-[12px] text-[#526679]">periods</span>
          </div>
          <p className="text-[12px] text-[#526679]">
            Prior same-quarter periods used to construct baseline comparisons and observed ranges.
          </p>
        </div>

        {/* Signals with observed comparison evidence */}
        <div className="p-4 rounded-[8px] bg-white border border-[#DCE5EA] space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] text-[#637587]">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Observed Signals</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold text-[#182B3D] tabular-nums">{signals.length}</span>
            <span className="text-[12px] text-[#526679]">in this period</span>
          </div>
          <p className="text-[12px] text-[#526679]">
            Each signal below includes current and comparator sample counts.
          </p>
        </div>
      </div>

      <section aria-labelledby="signal-evidence-heading" className="p-5 rounded-[8px] bg-white border border-[#DCE5EA] space-y-3">
        <div className="border-b border-[#DCE5EA] pb-3">
          <h3 id="signal-evidence-heading" className="text-[15px] font-semibold text-[#182B3D]">Evidence behind observed signals</h3>
          <p className="text-[12.5px] text-[#526679] mt-0.5">
            These are historical rates and sample counts, not forecasts. Compare the current and baseline denominators before acting.
          </p>
        </div>
        {signals.length === 0 ? (
          <p className="text-[13px] text-[#637587]">No signals meet the current evidence thresholds for this period.</p>
        ) : (
          <ul className="divide-y divide-[#EAF0F2]">
            {signals.map((signal) => (
              <li key={signal.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-[#182B3D]">{signal.title}</p>
                    <p className="text-[12px] text-[#526679] mt-1">{signal.fact}</p>
                    <p className="text-[12px] text-[#637587] mt-1">{signal.pattern}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-[4px] bg-[#EEF2F4] text-[#526679] text-[11px] font-medium">
                    Evidence: {signal.confidence.toLowerCase()}
                  </span>
                </div>
                <p className="text-[11.5px] text-[#637587] mt-2">
                  Samples: {signal.confidenceBasis.sampleSize} current · {signal.confidenceBasis.baselineSampleSize} comparator · {signal.confidenceBasis.comparablePeriodsCount} comparable period(s) · {Math.round(signal.confidenceBasis.policyCoverage * 100)}% policy coverage
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Coverage Breakdown Table */}
      <div className="p-5 rounded-[8px] bg-white border border-[#DCE5EA] space-y-3">
        <div className="border-b border-[#DCE5EA] pb-3">
          <h3 className="text-[15px] font-semibold text-[#182B3D]">
            Underlying Data Integrity & Verification
          </h3>
          <p className="text-[12.5px] text-[#526679] mt-0.5">
            Breakdown of data resolution criteria supporting executive signals.
          </p>
        </div>

        <div className="border border-[#DCE5EA] rounded-[8px] overflow-hidden">
          <table className="w-full text-left text-[13px] text-[#182B3D]">
            <caption className="sr-only">Data integrity verification metrics</caption>
            <thead className="bg-[#F6F8F9] text-[#637587] font-semibold text-[11px] uppercase tracking-wider border-b border-[#DCE5EA]">
              <tr>
                <th scope="col" className="py-2.5 px-3.5">Integrity Dimension</th>
                <th scope="col" className="py-2.5 px-3.5">Measurement</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Coverage</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Quality Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF0F2]">
              <tr>
                <td className="py-2.5 px-3.5 font-medium text-[#182B3D]">
                  STEP Resolution Coverage
                </td>
                <td className="py-2.5 px-3.5 text-[12px] text-[#526679]">
                  Decisions categorized into Structural, Transactional, Exception, or Process
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[#182B3D]">
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
                <td className="py-2.5 px-3.5 font-medium text-[#182B3D]">
                  Workflow Version Pinning
                </td>
                <td className="py-2.5 px-3.5 text-[12px] text-[#526679]">
                  Decisions explicitly bound to immutable workflow version snapshots
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[#182B3D]">
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
                <td className="py-2.5 px-3.5 font-medium text-[#182B3D]">
                  Governing Policy Linkage
                </td>
                <td className="py-2.5 px-3.5 text-[12px] text-[#526679]">
                  Decisions tied directly to enterprise governing policy documents
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[#182B3D]">
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
