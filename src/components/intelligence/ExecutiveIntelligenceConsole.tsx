"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  X,
  Lock,
  Check,
} from 'lucide-react';
import { StepType, StepShareMetric, StepDistributionResult } from '@/lib/intelligence/analytics/distributions';
import { StepMovementAnalysis, WorkflowContribution, ConsequentialDecision } from '@/lib/intelligence/analytics/contributors';
import { IntelligenceSignal } from '@/lib/intelligence/analytics/signals';

interface ExecutiveIntelligenceConsoleProps {
  tenant: string;
  userEmail: string;
  grantScope: string;
  isAdmin: boolean;
  distribution: StepDistributionResult;
  periodDisplayName: string;
  comparatorDisplayName: string;
  signals: IntelligenceSignal[];
  movementAnalyses: Record<StepType, StepMovementAnalysis>;
  sealedDecisions: any[];
  coverage?: {
    percentage: number;
    stepResolutionCoverage: number;
    workflowVersionCoverage: number;
    policyLinkageCoverage: number;
    comparablePeriodsCount: number;
    isReliable: boolean;
    label: string;
  };
}

export default function ExecutiveIntelligenceConsole({
  tenant,
  userEmail,
  grantScope,
  isAdmin,
  distribution,
  periodDisplayName,
  comparatorDisplayName,
  signals,
  movementAnalyses,
  sealedDecisions,
  coverage,
}: ExecutiveIntelligenceConsoleProps) {
  const [activeStepDrawer, setActiveStepDrawer] = useState<StepType | null>(null);

  const stepsList: StepType[] = ['STRUCTURAL', 'TRANSACTIONAL', 'EXCEPTION', 'PROCESS'];

  const stepMeta: Record<StepType, { label: string; dotClass: string; barClass: string }> = {
    STRUCTURAL: {
      label: 'Structural',
      dotClass: 'bg-[#6366F1]',
      barClass: 'bg-[#6366F1]',
    },
    TRANSACTIONAL: {
      label: 'Transactional',
      dotClass: 'bg-[#3B82F6]',
      barClass: 'bg-[#3B82F6]',
    },
    EXCEPTION: {
      label: 'Exception',
      dotClass: 'bg-[#F59E0B]',
      barClass: 'bg-[#F59E0B]',
    },
    PROCESS: {
      label: 'Process',
      dotClass: 'bg-[#0D9488]',
      barClass: 'bg-[#0D9488]',
    },
  };

  const activeAnalysis = activeStepDrawer ? movementAnalyses[activeStepDrawer] : null;

  // Format percentage point movement with sign
  const formatMovement = (pp: number) => {
    const sign = pp > 0 ? '+' : '';
    return `${sign}${pp.toFixed(1)} pp`;
  };

  // Determine status chip for each step
  const getStepStatus = (st: StepType, item: StepShareMetric) => {
    if (distribution.totalComparatorDecisions === 0) {
      return { label: 'Baseline pending', badge: 'badge-normal', desc: 'Awaiting comparable baseline period' };
    }
    if (st === 'EXCEPTION') {
      if (item.movementPp > 2.0) return { label: 'Watch', badge: 'badge-watch', desc: `Higher than ${comparatorDisplayName}` };
      if (item.movementPp > 4.0) return { label: 'Attention', badge: 'badge-attention', desc: `Above baseline (${comparatorDisplayName})` };
      return { label: 'Normal', badge: 'badge-normal', desc: 'Within expected baseline' };
    }
    if (Math.abs(item.movementPp) <= 0.5) return { label: 'Stable', badge: 'badge-normal', desc: `Consistent with ${comparatorDisplayName}` };
    if (item.movementPp > 0) return { label: 'Normal', badge: 'badge-normal', desc: `Higher than ${comparatorDisplayName}` };
    return { label: 'Normal', badge: 'badge-normal', desc: `Lower than ${comparatorDisplayName}` };
  };

  return (
    <div className="space-y-8 font-sans text-[#182230]">
      {/* Admin Notice (Restrained) */}
      {isAdmin && (
        <div className="p-3.5 rounded-[8px] bg-white border border-[#E4E7EC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px] shadow-none">
          <div className="flex items-center gap-2 text-[#475467]">
            <Lock className="w-4 h-4 shrink-0 text-[#274C77]" />
            <span>Administrator access: Manage recipient access grants and issue explicit intelligence permissions.</span>
          </div>
          <Link
            href={`/${tenant}/admin/intelligence`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[6px] border border-[#E4E7EC] bg-[#F9FAFB] hover:bg-[#F2F4F7] text-[#182230] text-[12px] font-medium transition-colors shrink-0"
          >
            <span>Manage access grants</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Page Header & Compact Period Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold text-[#182230] tracking-tight leading-tight">
              Organisational intelligence
            </h1>
            <p className="text-[14px] text-[#475467] mt-1">
              How decision behaviour is changing across the organisation.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#667085]">
            <span>Decoupled access for <strong className="text-[#182230] font-medium">{userEmail}</strong></span>
            <span>·</span>
            <span className="px-2 py-0.5 rounded-[4px] bg-[#F2F4F7] text-[#344054] font-medium uppercase text-[10px]">
              {grantScope}
            </span>
          </div>
        </div>

        {/* Compact Filters Bar (Height: 32–36px) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-[8px] bg-white border border-[#E4E7EC]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#E4E7EC] bg-[#F9FAFB] text-[13px] h-[34px]">
              <span className="text-[#667085] text-[12px]">Period:</span>
              <span className="font-semibold text-[#182230]">{periodDisplayName}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#E4E7EC] bg-white text-[13px] h-[34px]">
              <span className="text-[#667085] text-[12px]">Compare with:</span>
              <span className="font-medium text-[#182230]">{comparatorDisplayName}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#E4E7EC] bg-white text-[13px] h-[34px]">
              <span className="text-[#667085] text-[12px]">Function:</span>
              <span className="font-medium text-[#182230]">All functions</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-[4px] text-[12px] font-medium flex items-center gap-1.5 h-[32px] ${
              coverage?.isReliable ? 'badge-reliable' : 'bg-[#F2F4F7] text-[#475467]'
            }`}>
              {coverage?.isReliable && <Check className="w-3.5 h-3.5" />}
              <span>{coverage?.label || 'Data coverage'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Empty State Banner if no decisions in selected period */}
      {distribution.totalCurrentDecisions === 0 && (
        <div className="p-8 rounded-[8px] bg-white border border-[#E4E7EC] text-center space-y-2">
          <h3 className="text-[15px] font-semibold text-[#182230]">
            No decision data available for {periodDisplayName}
          </h3>
          <p className="text-[13px] text-[#475467] max-w-lg mx-auto leading-relaxed">
            There are no decisions recorded or finalized within this selected timeframe. Historical baseline comparisons and STEP movements will calculate automatically as decisions occur.
          </p>
        </div>
      )}

      {/* Horizontal Stacked Distribution Bar */}
      <div className="bg-white border border-[#E4E7EC] rounded-[8px] p-4 space-y-2.5">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-[#475467]">STEP portfolio distribution</span>
          <span className="text-[#667085] tabular-nums">{distribution.totalCurrentDecisions.toLocaleString()} decisions recorded</span>
        </div>

        {/* Stacked bar */}
        <div className="h-2 w-full rounded-[4px] bg-[#F2F4F7] overflow-hidden flex">
          {stepsList.map((st) => {
            const share = distribution.steps[st]?.currentShare || 0;
            const pct = Math.max(0, Math.round(share * 100));
            return (
              <div
                key={st}
                style={{ width: `${pct}%` }}
                className={`${stepMeta[st].barClass} transition-all duration-300`}
                title={`${stepMeta[st].label}: ${(share * 100).toFixed(1)}%`}
              />
            );
          })}
        </div>

        {/* Compact Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[12px]">
          {stepsList.map((st) => {
            const item = distribution.steps[st];
            return (
              <div key={st} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${stepMeta[st].dotClass}`} />
                <span className="text-[#475467]">{stepMeta[st].label}:</span>
                <span className="font-semibold text-[#182230] tabular-nums">{(item.currentShare * 100).toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Decision Behaviour (4 STEP Cards) */}
      <div className="space-y-3">
        <div className="border-b border-[#E4E7EC] pb-2 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[#182230]">
            Decision behaviour
          </h2>
          <span className="text-[12px] text-[#667085]">Click any card to view drivers</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stepsList.map((st) => {
            const item = distribution.steps[st];
            const meta = stepMeta[st];
            const statusInfo = getStepStatus(st, item);
            const isUp = item.movementPp > 0;
            const isZero = item.movementPp === 0;

            return (
              <div
                key={st}
                onClick={() => setActiveStepDrawer(st)}
                className="bg-white border border-[#E4E7EC] hover:border-[#98A2B3] rounded-[8px] p-5 shadow-none transition-colors cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top: Dot + Sentence-case Name */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                      <span className="text-[14px] font-semibold text-[#182230]">{meta.label}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${statusInfo.badge}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Number & Movement */}
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-[28px] font-semibold text-[#182230] leading-none tabular-nums">
                      {(item.currentShare * 100).toFixed(1)}%
                    </span>
                    <span
                      className={`text-[13px] font-medium tabular-nums ${
                        isZero
                          ? 'text-[#667085]'
                          : st === 'EXCEPTION'
                          ? isUp ? 'text-[#B54708]' : 'text-[#027A48]'
                          : isUp ? 'text-[#027A48]' : 'text-[#475467]'
                      }`}
                    >
                      {formatMovement(item.movementPp)}
                    </span>
                  </div>

                  {/* Decision count */}
                  <p className="text-[13px] text-[#667085] tabular-nums mt-1.5">
                    {item.currentCount.toLocaleString()} decisions
                  </p>

                  {/* Baseline context */}
                  <div className="text-[12px] text-[#475467] mt-3 pt-3 border-t border-[#F2F4F7] space-y-0.5">
                    <p>{statusInfo.desc}</p>
                    <p className="text-[11px] text-[#667085]">
                      {item.historicalRange
                        ? `Observed range (${item.historicalRange.samplePeriodsCount || item.historicalRange.periodCount} periods): ${(item.historicalRange.minShare * 100).toFixed(1)}%–${(item.historicalRange.maxShare * 100).toFixed(1)}%`
                        : distribution.totalComparatorDecisions > 0
                        ? `Prior comparable period: ${(item.comparatorShare * 100).toFixed(1)}%`
                        : 'No historical comparator data'}
                    </p>
                  </div>
                </div>

                {/* Subtle Action Link */}
                <div className="mt-3 pt-2 text-[12px] font-medium text-[#274C77] group-hover:text-[#1E3C60] flex items-center gap-1">
                  <span>View drivers</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: What Needs Attention & What Changed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* What Needs Attention (2 columns) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="border-b border-[#E4E7EC] pb-2 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-[#182230]">
              What needs attention
            </h2>
            <span className="text-[12px] text-[#667085]">Ranked governance signals</span>
          </div>

          <div className="space-y-3">
            {signals.map((sig) => {
              const badgeClass =
                sig.impact === 'HIGH' ? 'badge-attention' : 'badge-watch';
              const badgeText = sig.impact === 'HIGH' ? 'Attention' : 'Review';

              return (
                <div
                  key={sig.id}
                  className="p-4 rounded-[8px] border border-[#E4E7EC] bg-white shadow-none space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[14px] font-semibold text-[#182230]">
                      {sig.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium shrink-0 ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>

                  <p className="text-[13px] text-[#475467] leading-relaxed">
                    {sig.fact} {sig.pattern}
                  </p>

                  <div className="pt-2 border-t border-[#F2F4F7] flex items-center justify-between text-[12px]">
                    <span className="text-[#667085]">
                      Confidence: {sig.confidence.toLowerCase()}
                    </span>
                    <button
                      onClick={() => setActiveStepDrawer('EXCEPTION')}
                      className="text-[#274C77] hover:text-[#1E3C60] font-medium inline-flex items-center gap-1"
                    >
                      <span>Review evidence</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {signals.length === 0 && (
              <div className="p-6 rounded-[8px] border border-[#E4E7EC] bg-white text-center text-[13px] text-[#667085]">
                No elevated governance signals detected for this period.
              </div>
            )}
          </div>
        </div>

        {/* What Changed (1 column) */}
        <div className="space-y-3">
          <div className="border-b border-[#E4E7EC] pb-2 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-[#182230]">
              What changed
            </h2>
            <span className="text-[12px] text-[#667085]">Period movement</span>
          </div>

          <div className="p-4 rounded-[8px] border border-[#E4E7EC] bg-white shadow-none space-y-4">
            {stepsList.map((st) => {
              const item = distribution.steps[st];
              const analysis = movementAnalyses[st];
              const topContributors = (analysis?.contributors || []).slice(0, 2);

              return (
                <div key={st} className="space-y-1.5 pb-3 border-b border-[#F2F4F7] last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${stepMeta[st].dotClass}`} />
                      <span className="font-semibold text-[#182230]">{stepMeta[st].label}</span>
                    </div>
                    <span className="font-medium tabular-nums text-[#182230]">
                      {formatMovement(item.movementPp)}
                    </span>
                  </div>

                  {topContributors.map((c) => (
                    <div key={c.workflowId} className="flex items-center justify-between text-[12px] pl-3.5 text-[#475467]">
                      <span className="truncate pr-2">{c.workflowName}</span>
                      <span className="tabular-nums font-medium text-[#667085] shrink-0">
                        {formatMovement(c.movementContributionPp)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section: Decisions Shaping the Organisation (Audit Trail Table) */}
      <div className="bg-white border border-[#E4E7EC] rounded-[8px] p-5 shadow-none space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-3">
          <div>
            <h2 className="text-[18px] font-semibold text-[#182230]">
              Decisions shaping the organisation
            </h2>
            <p className="text-[13px] text-[#475467] mt-0.5">
              Structured ledger of sealed decisions, downstream reliance, and governance status.
            </p>
          </div>
          <span className="text-[12px] text-[#667085] tabular-nums">
            {(sealedDecisions || []).length} records displayed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] text-[#344054]">
            <thead className="bg-[#F9FAFB] text-[#667085] font-medium text-[12px] border-b border-[#E4E7EC]">
              <tr>
                <th className="py-2.5 px-3 font-medium">Reference</th>
                <th className="py-2.5 px-3 font-medium">Decision subject</th>
                <th className="py-2.5 px-3 font-medium">Domain</th>
                <th className="py-2.5 px-3 text-center font-medium">Blast radius</th>
                <th className="py-2.5 px-3 text-center font-medium">Status</th>
                <th className="py-2.5 px-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              {(sealedDecisions || []).map((item: any) => (
                <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="py-2.5 px-3 font-mono font-medium text-[#274C77] text-[12px]">
                    {item.ref}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[#182230]">
                    {item.subject}
                  </td>
                  <td className="py-2.5 px-3 text-[#475467]">
                    <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-normal bg-[#F2F4F7] text-[#344054]">
                      {item.categories?.domain || 'General'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center tabular-nums">
                    <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#F2F4F7] text-[#344054]">
                      {item.blast_at_seal ?? 0} descendants
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium badge-normal">
                      {item.status === 'sealed' ? 'Sealed' : item.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {grantScope === 'FULL' ? (
                      <Link
                        href={`/${tenant}/requests/${item.id}`}
                        className="text-[12px] font-medium text-[#274C77] hover:text-[#1E3C60] inline-flex items-center gap-0.5"
                      >
                        <span>Inspect</span>
                        <span>→</span>
                      </Link>
                    ) : (
                      <span className="text-[11px] text-[#98A2B3]">Aggregate only</span>
                    )}
                  </td>
                </tr>
              ))}

              {(!sealedDecisions || sealedDecisions.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[13px] text-[#667085]">
                    {grantScope === 'AGGREGATE_ONLY'
                      ? 'Row-level decision ledger is restricted under AGGREGATE_ONLY grant scope.'
                      : 'No decisions recorded for the current filter selection.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Slide-over Drawer for Analytical Drill-down */}
      {activeStepDrawer && activeAnalysis && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setActiveStepDrawer(null)}
            className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-[1px] transition-opacity"
          />

          {/* Slide-over panel */}
          <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white border-l border-[#E4E7EC] shadow-[0_8px_24px_rgba(15,23,42,0.08)] z-50 p-6 overflow-y-auto space-y-6 flex flex-col justify-between font-sans">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-[#E4E7EC] pb-4">
                <div>
                  <div className="flex items-center gap-2 text-[12px] text-[#667085]">
                    <span className={`w-2 h-2 rounded-full ${stepMeta[activeStepDrawer].dotClass}`} />
                    <span className="font-semibold text-[#182230]">{stepMeta[activeStepDrawer].label} movement</span>
                    <span>·</span>
                    <span>{periodDisplayName} vs. {comparatorDisplayName}</span>
                  </div>
                  <h2 className="text-[20px] font-semibold text-[#182230] mt-1">
                    Movement drivers
                  </h2>
                </div>
                <button
                  onClick={() => setActiveStepDrawer(null)}
                  className="p-1.5 rounded-[6px] text-[#667085] hover:bg-[#F2F4F7] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 3-Column Metrics Comparison */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-[8px] bg-[#F9FAFB] border border-[#E4E7EC] text-center">
                <div>
                  <span className="text-[11px] text-[#667085] font-medium">Current share</span>
                  <p className="text-[18px] font-semibold text-[#182230] tabular-nums mt-0.5">
                    {(activeAnalysis.currentShare * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-[#667085] font-medium">{comparatorDisplayName}</span>
                  <p className="text-[18px] font-semibold text-[#667085] tabular-nums mt-0.5">
                    {(activeAnalysis.comparatorShare * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-[#667085] font-medium">Movement</span>
                  <p className="text-[18px] font-semibold text-[#182230] tabular-nums mt-0.5">
                    {formatMovement(activeAnalysis.movementPp)}
                  </p>
                </div>
              </div>

              {/* Contributor Workflows Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-[#182230]">
                    Top contributors
                  </h3>
                  <span className="text-[11px] text-[#667085]">Workflow breakdown</span>
                </div>

                <div className="border border-[#E4E7EC] rounded-[8px] overflow-hidden">
                  <table className="w-full text-left text-[13px] text-[#344054]">
                    <thead className="bg-[#F9FAFB] text-[#667085] font-medium text-[11px] border-b border-[#E4E7EC]">
                      <tr>
                        <th className="py-2 px-3">Workflow</th>
                        <th className="py-2 px-3 text-center">Current</th>
                        <th className="py-2 px-3 text-center">Baseline</th>
                        <th className="py-2 px-3 text-right">Contribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F4F7]">
                      {activeAnalysis.contributors.map((c) => (
                        <tr key={c.workflowId} className="hover:bg-[#F9FAFB]">
                          <td className="py-2 px-3 font-medium text-[#182230]">
                            {c.workflowName}
                          </td>
                          <td className="py-2 px-3 text-center tabular-nums text-[#667085]">
                            {c.currentCount}
                          </td>
                          <td className="py-2 px-3 text-center tabular-nums text-[#667085]">
                            {c.baselineCount}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums font-semibold text-[#182230]">
                            {formatMovement(c.movementContributionPp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Consequential Decisions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-[#182230]">
                    Consequential decisions
                  </h3>
                  <span className="text-[11px] text-[#667085]">Ranked by blast radius</span>
                </div>

                {grantScope === 'FULL' ? (
                  <div className="border border-[#E4E7EC] rounded-[8px] overflow-hidden">
                    <table className="w-full text-left text-[13px] text-[#344054]">
                      <thead className="bg-[#F9FAFB] text-[#667085] font-medium text-[11px] border-b border-[#E4E7EC]">
                        <tr>
                          <th className="py-2 px-3">Ref</th>
                          <th className="py-2 px-3">Subject</th>
                          <th className="py-2 px-3 text-center">Blast radius</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2F4F7]">
                        {(activeAnalysis.topConsequentialDecisions || []).map((d) => (
                          <tr key={d.requestId} className="hover:bg-[#F9FAFB]">
                            <td className="py-2 px-3 font-mono text-[12px] font-medium text-[#274C77]">
                              {d.ref}
                            </td>
                            <td className="py-2 px-3 text-[#182230] font-medium truncate max-w-[200px]">
                              {d.subject}
                            </td>
                            <td className="py-2 px-3 text-center tabular-nums text-[12px]">
                              {d.transitiveDescendants}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <Link
                                href={`/${tenant}/requests/${d.requestId}`}
                                className="text-[12px] font-medium text-[#274C77] hover:text-[#1E3C60]"
                              >
                                View →
                              </Link>
                            </td>
                          </tr>
                        ))}

                        {(!activeAnalysis.topConsequentialDecisions || activeAnalysis.topConsequentialDecisions.length === 0) && (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-[12px] text-[#667085]">
                              No consequential decisions found for this step type.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-[8px] bg-[#F9FAFB] border border-[#E4E7EC] text-[12px] text-[#667085]">
                    Individual decision rows are omitted under AGGREGATE_ONLY grant scope. Aggregate workflow contributions remain fully available.
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-[#E4E7EC] flex justify-end">
              <button
                onClick={() => setActiveStepDrawer(null)}
                className="px-3.5 py-1.5 rounded-[6px] border border-[#E4E7EC] bg-white hover:bg-[#F9FAFB] text-[13px] font-medium text-[#182230] transition-colors"
              >
                Close drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
