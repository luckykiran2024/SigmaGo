"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, ShieldCheck, Database, Calendar, GitFork, Link2, ExternalLink, AlertTriangle } from 'lucide-react';
import { StepDistributionResult } from '@/lib/intelligence/analytics/distributions';
import { IntelligenceSignal } from '@/lib/intelligence/analytics/signals';
import { OrphanMetrics } from '@/lib/intelligence/chain/structure';

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
    orphanScore?: number;
    orphanCount?: number;
    connectedCount?: number;
    connectedRate?: number;
    orphanStatus?: 'HEALTHY' | 'WATCH' | 'CRITICAL';
    orphanIds?: string[];
  };
  signals: IntelligenceSignal[];
  orphanMetrics?: OrphanMetrics;
  tenant?: string;
  sealedDecisions?: any[];
  onOpenEvidence?: (type: 'step' | 'signal', id: string) => void;
}

export default function ConfidenceView({
  distribution,
  periodDisplayName,
  coverage,
  signals,
  orphanMetrics,
  tenant,
  sealedDecisions = [],
  onOpenEvidence,
}: ConfidenceViewProps) {
  const [showOrphanDetails, setShowOrphanDetails] = useState(false);

  const coveragePct = coverage?.percentage ?? 0;
  const comparablePeriods = coverage?.comparablePeriodsCount ?? 0;
  const isReliable = coverage?.isReliable ?? (coveragePct >= 80);

  // Orphan Score metrics resolution
  const totalDecisions = orphanMetrics?.totalDecisions ?? distribution.totalCurrentDecisions;
  const orphanCount = orphanMetrics?.orphanCount ?? coverage?.orphanCount ?? 0;
  const connectedCount = orphanMetrics?.connectedCount ?? coverage?.connectedCount ?? (totalDecisions - orphanCount);
  const orphanScore = orphanMetrics?.orphanScore ?? coverage?.orphanScore ?? (totalDecisions > 0 ? Number(((orphanCount / totalDecisions) * 100).toFixed(1)) : 0);
  const connectedRate = orphanMetrics?.connectedRate ?? coverage?.connectedRate ?? (totalDecisions > 0 ? Number(((connectedCount / totalDecisions) * 100).toFixed(1)) : 100);
  const orphanStatus = orphanMetrics?.status ?? coverage?.orphanStatus ?? (orphanScore <= 10 ? 'HEALTHY' : orphanScore <= 25 ? 'WATCH' : 'CRITICAL');
  const orphanIds = orphanMetrics?.orphanIds ?? coverage?.orphanIds ?? [];

  // Match orphan decisions with sealed records
  const orphanDecisions = (sealedDecisions || []).filter((d: any) => orphanIds.includes(d.id));

  return (
    <div className="space-y-6 font-sans">
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
              Evidence Quality & Graph Integrity
            </span>
            <h3 className="text-[20px] font-semibold text-[#182B3D] tracking-tight">
              {isReliable ? 'Coverage and Connectivity support verified comparison' : 'Coverage is still developing'}
            </h3>
            <p className="text-[13.5px] text-[#526679] max-w-2xl leading-relaxed">
              {isReliable
                ? `${coveragePct}% of decisions have verified classification coverage and ${connectedRate}% are anchored to precedent rules or policies (Orphan Score: ${orphanScore}%). Recorded data compares observed history; it does not speculate.`
                : `Only ${coveragePct}% of decisions have sufficient classification coverage, so comparisons remain limited until more decision history is recorded.`}
            </p>
          </div>
        </div>
      </div>

      {/* 4 Core Evidence & Connectivity Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Orphan Score Metric */}
        <div className="p-4 rounded-[8px] bg-white border border-[#DCE5EA] space-y-1">
          <div className="flex items-center justify-between text-[12px] text-[#637587]">
            <div className="flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5 text-[#0B7780]" aria-hidden="true" />
              <span>Orphan Score</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold uppercase ${
              orphanStatus === 'HEALTHY'
                ? 'bg-[#ECFDF3] text-[#027A48]'
                : orphanStatus === 'WATCH'
                ? 'bg-[#FFFAEB] text-[#B54708]'
                : 'bg-[#FEF3F2] text-[#B42318]'
            }`}>
              {orphanStatus}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold text-[#182B3D] tabular-nums">
              {orphanScore}%
            </span>
            <span className="text-[12px] text-[#526679]">({orphanCount} unreferenced)</span>
          </div>
          <p className="text-[12px] text-[#526679]">
            {connectedCount} of {totalDecisions} approvals anchored into organizational decision graph.
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
            Prior same-quarter periods used to construct baseline comparisons.
          </p>
        </div>

        {/* Observed Signals */}
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
            Verified statistical deviations across current and comparator samples.
          </p>
        </div>
      </div>

      {/* DEDICATED GOVERNANCE HYGIENE & ORPHAN SCORE PANEL */}
      <section aria-labelledby="orphan-score-heading" className="p-5 rounded-[8px] bg-white border border-[#DCE5EA] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE5EA] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#0B7780]" />
              <h3 id="orphan-score-heading" className="text-[15px] font-semibold text-[#182B3D]">
                Decision References & Orphan Score Analysis
              </h3>
            </div>
            <p className="text-[12.5px] text-[#526679] mt-0.5">
              Approvals without a precedent reference are called <strong>orphans</strong>. In sound organizational governance, almost all approvals reference a parent standard operating procedure, strategic policy, or precedent.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#637587]">Hygiene Benchmark</div>
              <div className="text-[13px] font-bold text-[#182B3D]">{orphanScore}% (Target ≤ 10%)</div>
            </div>
            <span className={`px-2 py-1 rounded-[4px] text-[12px] font-semibold uppercase tracking-wider border ${
              orphanStatus === 'HEALTHY'
                ? 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]'
                : orphanStatus === 'WATCH'
                ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
                : 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]'
            }`}>
              {orphanStatus}
            </span>
          </div>
        </div>

        {/* Arithmetic & Graph Distribution Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-[#526679]">
              Connected Approvals: <strong className="text-[#182B3D]">{connectedCount} ({connectedRate}%)</strong>
            </span>
            <span className="text-[#526679]">
              Orphan Approvals: <strong className="text-[#B54708]">{orphanCount} ({orphanScore}%)</strong>
            </span>
          </div>

          {/* Visual Connectivity Bar */}
          <div className="h-3 w-full bg-[#FEF0C7] rounded-full overflow-hidden flex">
            <div
              className="bg-[#0B7780] h-full transition-all duration-500 rounded-l-full"
              style={{ width: `${connectedRate}%` }}
              title={`${connectedCount} connected decisions (${connectedRate}%)`}
            />
            <div
              className="bg-[#F79009] h-full transition-all duration-500"
              style={{ width: `${orphanScore}%` }}
              title={`${orphanCount} orphan decisions (${orphanScore}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#637587]">
            <span>Formula: <code className="font-mono text-[#182B3D]">Orphan Score = (Orphan Decisions ÷ Total Eligible Decisions) × 100</code></span>
            <span>Healthy threshold: ≤ 10.0%</span>
          </div>
        </div>

        {/* Orphan Decisions Drill-down / Inspection */}
        {orphanCount > 0 ? (
          <div className="border border-[#FEDF89] bg-[#FFFAEB]/60 rounded-[8px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#B54708]" />
                <h4 className="text-[13.5px] font-semibold text-[#B54708]">
                  {orphanCount} Unreferenced Decision{orphanCount > 1 ? 's' : ''} Require Linkage
                </h4>
              </div>
            </div>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[12px] text-[#7A2E0E] font-medium">
                {orphanCount} approvals lack precedent or SOP parent linkage.
              </span>
              {onOpenEvidence && (
                <button
                  type="button"
                  onClick={() => onOpenEvidence('step', 'TRANSACTIONAL')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#FEDF89] rounded-[6px] text-[12px] font-medium text-[#B54708] hover:bg-[#FEF0C7]/50 shadow-2xs transition"
                >
                  <span>Review Evidence in Drawer →</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-[#ECFDF3] border border-[#A6F4C5] rounded-[6px] flex items-center gap-2 text-[13px] text-[#027A48]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Complete Precedent Anchor: 100% of approvals in this period have established decision references. Orphan Score is 0.0%.</span>
          </div>
        )}
      </section>

      {/* Signals with observed comparison evidence */}
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
            Breakdown of data resolution and graph connectivity criteria supporting executive signals.
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
              <tr>
                <td className="py-2.5 px-3.5 font-medium text-[#182B3D]">
                  Decision Reference Connectivity
                </td>
                <td className="py-2.5 px-3.5 text-[12px] text-[#526679]">
                  Approvals linked to parent rules, SOPs, or precedents (Orphan Score: {orphanScore}%)
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[#182B3D]">
                  {connectedRate}% Connected
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${
                    orphanScore <= 10
                      ? 'bg-[#ECFDF3] text-[#027A48]'
                      : orphanScore <= 25
                      ? 'bg-[#FFFAEB] text-[#B54708]'
                      : 'bg-[#FEF3F2] text-[#B42318]'
                  }`}>
                    {orphanScore <= 10 ? 'Healthy (≤ 10%)' : orphanScore <= 25 ? 'Watch (11-25%)' : 'Critical (> 25%)'}
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
