"use client";

import React from 'react';
import Link from 'next/link';
import { X, ExternalLink, HelpCircle, ShieldAlert } from 'lucide-react';
import { StepType, StepDistributionResult } from '@/lib/intelligence/analytics/distributions';
import { StepMovementAnalysis, ConsequentialDecision } from '@/lib/intelligence/analytics/contributors';
import { IntelligenceSignal } from '@/lib/intelligence/analytics/signals';
import { STEP_DEFINITIONS } from './views/ActivityView';

interface IntelligenceEvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  evidenceTarget: {
    type: 'step' | 'signal';
    id: string;
  } | null;
  tenant: string;
  grantScope: string;
  periodDisplayName: string;
  comparatorDisplayName: string;
  distribution: StepDistributionResult;
  movementAnalyses: Record<StepType, StepMovementAnalysis>;
  signals: IntelligenceSignal[];
  coverage?: {
    comparablePeriodsCount: number;
  };
}

export default function IntelligenceEvidenceDrawer({
  isOpen,
  onClose,
  evidenceTarget,
  tenant,
  grantScope,
  periodDisplayName,
  comparatorDisplayName,
  distribution,
  movementAnalyses,
  signals,
  coverage,
}: IntelligenceEvidenceDrawerProps) {
  if (!isOpen || !evidenceTarget) return null;

  const isStep = evidenceTarget.type === 'step';
  const stepType = isStep ? (evidenceTarget.id as StepType) : 'EXCEPTION';
  const activeAnalysis = movementAnalyses[stepType];
  const stepItem = distribution.steps[stepType];
  const meta = STEP_DEFINITIONS[stepType];

  const matchedSignal = !isStep
    ? signals.find((s) => s.id === evidenceTarget.id)
    : null;

  const formatMovement = (pp: number) => {
    const sign = pp > 0 ? '+' : '';
    return `${sign}${pp.toFixed(1)} pp`;
  };

  const isAggregateOnly = grantScope === 'AGGREGATE_ONLY';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#07182F]/40 backdrop-blur-[1px] transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white border-l border-[#DDE5EC] shadow-xl z-50 p-6 overflow-y-auto space-y-6 flex flex-col justify-between font-sans">
        <div className="space-y-6">
          {/* Drawer Header */}
          <div className="flex items-start justify-between border-b border-[#DDE5EC] pb-4">
            <div>
              <div className="flex items-center gap-2 text-[12px] text-[#8190A0]">
                <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} aria-hidden="true" />
                <span className="font-semibold text-[#132238]">{meta.label} Evidence</span>
                <span aria-hidden="true">·</span>
                <span>{periodDisplayName} vs {comparatorDisplayName}</span>
              </div>
              <h2 id="drawer-title" className="text-[20px] font-semibold text-[#132238] mt-1">
                {matchedSignal ? matchedSignal.title : `${meta.label} Decision Drivers`}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[6px] text-[#8190A0] hover:text-[#132238] hover:bg-[#F3F6F8] transition-colors"
              aria-label="Close evidence panel"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Signal Detail (if opened from an attention signal) */}
          {matchedSignal && (
            <div className="p-4 rounded-[8px] bg-[#F7FAFC] border border-[#DDE5EC] space-y-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#132238]">Observed Signal Summary</span>
                <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${
                  matchedSignal.impact === 'HIGH' ? 'bg-[#FEF3F2] text-[#B42318]' : 'bg-[#FFFAEB] text-[#B54708]'
                }`}>
                  {matchedSignal.impact} Impact
                </span>
              </div>
              <p className="text-[#526377] leading-relaxed">
                {matchedSignal.fact} {matchedSignal.pattern}
              </p>
              <div className="text-[12px] text-[#8190A0] pt-1">
                Confidence basis: {matchedSignal.confidenceBasis?.sampleSize || 0} decisions across {matchedSignal.confidenceBasis?.comparablePeriodsCount || 1} comparable period(s).
              </div>
            </div>
          )}

          {/* Level 3 Methodology: 4-Column Context Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-semibold text-[#132238]">How is this calculated?</span>
              <span className="text-[#8190A0]">Observed evidence baseline</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-[8px] bg-[#F7FAFC] border border-[#EAF0F4] text-center text-[12.5px]">
              <div>
                <span className="text-[11px] text-[#8190A0] font-medium block">Current period</span>
                <p className="text-[17px] font-semibold text-[#132238] tabular-nums mt-0.5">
                  {((stepItem?.currentShare || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-[11px] text-[#8190A0] font-medium block">Comparable period</span>
                <p className="text-[17px] font-semibold text-[#526377] tabular-nums mt-0.5">
                  {((stepItem?.comparatorShare || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-[11px] text-[#8190A0] font-medium block">Movement</span>
                <p className="text-[17px] font-semibold text-[#132238] tabular-nums mt-0.5">
                  {formatMovement(stepItem?.movementPp || 0)}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-[#8190A0] font-medium block">Observed range</span>
                <p className="text-[14px] font-semibold text-[#526377] tabular-nums mt-1">
                  {stepItem?.historicalRange?.hasHistoricalRange
                    ? `${(stepItem.historicalRange.minShare * 100).toFixed(1)}%–${(stepItem.historicalRange.maxShare * 100).toFixed(1)}%`
                    : `${((stepItem?.comparatorShare || 0) * 100).toFixed(1)}%`}
                </p>
              </div>
            </div>
          </div>

          {/* Workflow Contributors Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[13.5px] font-semibold text-[#132238]">
                Workflow Contributions
              </h3>
              <span className="text-[11.5px] text-[#8190A0]">Mathematical decomposition</span>
            </div>

            <div className="border border-[#DDE5EC] rounded-[8px] overflow-hidden">
              <table className="w-full text-left text-[13px] text-[#132238]">
                <thead className="bg-[#F7FAFC] text-[#8190A0] font-semibold text-[11px] uppercase tracking-wider border-b border-[#DDE5EC]">
                  <tr>
                    <th scope="col" className="py-2 px-3">Workflow</th>
                    <th scope="col" className="py-2 px-3 text-center">Current</th>
                    <th scope="col" className="py-2 px-3 text-center">Baseline</th>
                    <th scope="col" className="py-2 px-3 text-right">Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF0F4]">
                  {(activeAnalysis?.contributors || []).map((c) => (
                    <tr key={c.workflowId} className="hover:bg-[#F9FBFC]">
                      <td className="py-2 px-3 font-medium text-[#132238]">
                        {c.workflowName}
                      </td>
                      <td className="py-2 px-3 text-center font-mono tabular-nums text-[#8190A0]">
                        {c.currentCount}
                      </td>
                      <td className="py-2 px-3 text-center font-mono tabular-nums text-[#8190A0]">
                        {c.baselineCount}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-[#132238]">
                        {formatMovement(c.movementContributionPp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Consequential Decisions (Downstream Reliance / Decision Blast Radius) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[13.5px] font-semibold text-[#132238]">
                  Downstream Reliance
                </h3>
                <span className="text-[11px] text-[#8190A0]">
                  Also known as Decision Blast Radius
                </span>
              </div>
              <span className="text-[11.5px] text-[#8190A0]">
                Multi-hop graph reach
              </span>
            </div>

            {!isAggregateOnly ? (
              <div className="border border-[#DDE5EC] rounded-[8px] overflow-hidden">
                <table className="w-full text-left text-[13px] text-[#132238]">
                  <thead className="bg-[#F7FAFC] text-[#8190A0] font-semibold text-[11px] uppercase tracking-wider border-b border-[#DDE5EC]">
                    <tr>
                      <th scope="col" className="py-2 px-3">Ref</th>
                      <th scope="col" className="py-2 px-3">Subject</th>
                      <th scope="col" className="py-2 px-3 text-center" title="How many later decisions depend on this node">
                        Downstream Reliance
                      </th>
                      <th scope="col" className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAF0F4]">
                    {(activeAnalysis?.topConsequentialDecisions || []).map((d) => (
                      <tr key={d.requestId} className="hover:bg-[#F9FBFC]">
                        <td className="py-2 px-3 font-mono text-[12px] font-medium text-[#012F6B]">
                          {d.ref}
                        </td>
                        <td className="py-2 px-3 text-[#132238] font-medium truncate max-w-[180px]">
                          {d.subject}
                        </td>
                        <td className="py-2 px-3 text-center font-mono tabular-nums text-[12px]">
                          {d.transitiveDescendants} related
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Link
                            href={`/${tenant}/requests/${d.requestId}`}
                            className="text-[12px] font-medium text-[#078899] hover:text-[#012F6B] inline-flex items-center gap-0.5"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}

                    {(!activeAnalysis?.topConsequentialDecisions || activeAnalysis.topConsequentialDecisions.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[12px] text-[#8190A0]">
                          No consequential decisions recorded for this decision type.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-[8px] bg-[#F7FAFC] border border-[#DDE5EC] text-[12px] text-[#526377] space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-[#132238]">
                  <ShieldAlert className="w-4 h-4 text-[#B54708]" aria-hidden="true" />
                  <span>Privacy Preservation (AGGREGATE_ONLY Scope)</span>
                </div>
                <p>
                  Row-level decision records and individual identifiers are omitted to preserve employee privacy under aggregate grant permissions. Aggregate workflow contributions remain fully available.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="pt-4 border-t border-[#DDE5EC] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[6px] border border-[#DDE5EC] bg-white hover:bg-[#F7FAFC] text-[13px] font-medium text-[#132238] transition-colors"
          >
            Close evidence panel
          </button>
        </div>
      </div>
    </div>
  );
}
