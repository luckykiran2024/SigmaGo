"use client";

import React, { useState } from 'react';
import { HelpCircle, Info, ChevronRight } from 'lucide-react';
import { StepType, StepDistributionResult } from '@/lib/intelligence/analytics/distributions';
import { StepMovementAnalysis } from '@/lib/intelligence/analytics/contributors';
import { STEP_DEFINITIONS } from './ActivityView';

interface ChangeViewProps {
  distribution: StepDistributionResult;
  periodDisplayName: string;
  comparatorDisplayName: string;
  movementAnalyses: Record<StepType, StepMovementAnalysis>;
  coverage?: {
    comparablePeriodsCount: number;
  };
  onOpenDrawer: (st: StepType) => void;
}

export default function ChangeView({
  distribution,
  periodDisplayName,
  comparatorDisplayName,
  movementAnalyses,
  coverage,
  onOpenDrawer,
}: ChangeViewProps) {
  const stepsList: StepType[] = ['EXCEPTION', 'TRANSACTIONAL', 'PROCESS', 'STRUCTURAL'];
  const hasComparator = distribution.totalComparatorDecisions > 0;

  // Find step with largest absolute movement
  let primaryStep: StepType = 'EXCEPTION';
  let maxAbsMovement = 0;

  stepsList.forEach((st) => {
    const item = distribution.steps[st];
    if (item && Math.abs(item.movementPp) > maxAbsMovement) {
      maxAbsMovement = Math.abs(item.movementPp);
      primaryStep = st;
    }
  });

  const primaryItem = distribution.steps[primaryStep];
  const isMaterial = hasComparator && maxAbsMovement >= 1.5;

  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState<StepType>(primaryStep);
  const activeAnalysis = movementAnalyses[selectedWorkflowStep];

  const formatMovement = (pp: number) => {
    const sign = pp > 0 ? '+' : '';
    return `${sign}${pp.toFixed(1)} pp`;
  };

  if (!hasComparator) {
    return (
      <div className="p-8 rounded-[8px] bg-white border border-[#DDE5EC] text-center space-y-2">
        <h3 className="text-[15px] font-semibold text-[#132238]">
          No reliable comparable period is available yet
        </h3>
        <p className="text-[13px] text-[#526377] max-w-md mx-auto">
          There is not enough comparable history yet to assess change. Current activity is shown without a historical baseline comparison.
        </p>
      </div>
    );
  }

  // Format historical range text
  const getHistoricalRangeText = (st: StepType) => {
    const item = distribution.steps[st];
    if (item?.historicalRange?.hasHistoricalRange) {
      const minPct = (item.historicalRange.minShare * 100).toFixed(1);
      const maxPct = (item.historicalRange.maxShare * 100).toFixed(1);
      const periods = item.historicalRange.samplePeriodsCount || item.historicalRange.periodCount;
      return {
        range: `${minPct}% to ${maxPct}%`,
        periods: `${periods} comparable periods`,
      };
    }
    const compPeriods = coverage?.comparablePeriodsCount || 1;
    return {
      range: `${((item?.comparatorShare || 0) * 100).toFixed(1)}% (single baseline)`,
      periods: `${compPeriods} comparable period`,
    };
  };

  const primaryRange = getHistoricalRangeText(primaryStep);

  return (
    <div className="space-y-6">
      {/* Primary Analytical Movement Headline Banner */}
      <div className="p-5 rounded-[8px] bg-white border border-[#DDE5EC] space-y-4">
        <div>
          <span className="text-[12px] font-medium text-[#8190A0] uppercase tracking-wider">
            Comparative Movement Analysis
          </span>
          {isMaterial ? (
            <div className="mt-1">
              <h2 className="text-[20px] font-semibold text-[#132238] tracking-tight">
                {STEP_DEFINITIONS[primaryStep].label} decisions {primaryItem.movementPp > 0 ? 'increased' : 'decreased'} by{' '}
                <span className={primaryItem.movementPp > 0 && primaryStep === 'EXCEPTION' ? 'text-[#B54708]' : 'text-[#012F6B]'}>
                  {Math.abs(primaryItem.movementPp).toFixed(1)} percentage points
                </span>{' '}
                compared with {comparatorDisplayName}.
              </h2>
              <p className="text-[13px] text-[#526377] mt-1">
                Primary shift observed between {periodDisplayName} and prior-year comparable baseline.
              </p>
            </div>
          ) : (
            <div className="mt-1">
              <h2 className="text-[18px] font-semibold text-[#132238] tracking-tight">
                No material change detected.
              </h2>
              <p className="text-[13px] text-[#526377] mt-0.5">
                Current decision behaviour is broadly consistent with the comparable historical period ({comparatorDisplayName}).
              </p>
            </div>
          )}
        </div>

        {/* 4-Item Context Grid for Primary Shift */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-[6px] bg-[#F7FAFC] border border-[#EAF0F4] text-[13px]">
          <div>
            <span className="text-[11.5px] text-[#8190A0] block">Current ({periodDisplayName})</span>
            <span className="font-semibold text-[#132238] text-[15px] tabular-nums">
              {((primaryItem.currentShare) * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-[11.5px] text-[#8190A0] block">Baseline ({comparatorDisplayName})</span>
            <span className="font-semibold text-[#526377] text-[15px] tabular-nums">
              {((primaryItem.comparatorShare) * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-[11.5px] text-[#8190A0] block">Usual observed range</span>
            <span className="font-semibold text-[#132238] text-[15px] tabular-nums">
              {primaryRange.range}
            </span>
          </div>
          <div>
            <span className="text-[11.5px] text-[#8190A0] block">Comparable history</span>
            <span className="font-semibold text-[#526377] text-[15px] tabular-nums">
              {primaryRange.periods}
            </span>
          </div>
        </div>
      </div>

      {/* STEP Movement Compact Table */}
      <div className="p-5 rounded-[8px] bg-white border border-[#DDE5EC] space-y-3">
        <div className="flex items-center justify-between border-b border-[#DDE5EC] pb-3">
          <div>
            <h3 className="text-[15px] font-semibold text-[#132238]">
              STEP Movement Breakdown
            </h3>
            <p className="text-[12.5px] text-[#526377] mt-0.5">
              Percentage point shift compared with {comparatorDisplayName}. Always stated in percentage points (pp).
            </p>
          </div>
          <span className="text-[12px] text-[#8190A0]">
            Comparator: {comparatorDisplayName}
          </span>
        </div>

        <div className="border border-[#DDE5EC] rounded-[8px] overflow-hidden">
          <table className="w-full text-left text-[13px] text-[#132238]">
            <caption className="sr-only">STEP Movement comparison in percentage points</caption>
            <thead className="bg-[#F7FAFC] text-[#8190A0] font-semibold text-[11px] uppercase tracking-wider border-b border-[#DDE5EC]">
              <tr>
                <th scope="col" className="py-2.5 px-3.5">Decision Type</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Current ({periodDisplayName})</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Comparator ({comparatorDisplayName})</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Movement</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Observed Range</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF0F4]">
              {stepsList.map((st) => {
                const item = distribution.steps[st];
                const meta = STEP_DEFINITIONS[st];
                const rangeInfo = getHistoricalRangeText(st);
                const isSelected = selectedWorkflowStep === st;

                return (
                  <tr
                    key={st}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#F4F9FB]' : 'hover:bg-[#F9FBFC]'
                    }`}
                    onClick={() => setSelectedWorkflowStep(st)}
                  >
                    <td className="py-2.5 px-3.5 font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
                        <span className="text-[#132238]">{meta.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[#132238]">
                      {((item?.currentShare || 0) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[#526377]">
                      {((item?.comparatorShare || 0) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-semibold tabular-nums">
                      <span
                        className={
                          item.movementPp === 0
                            ? 'text-[#8190A0]'
                            : st === 'EXCEPTION'
                            ? item.movementPp > 0 ? 'text-[#B54708]' : 'text-[#0F7548]'
                            : item.movementPp > 0 ? 'text-[#0F7548]' : 'text-[#526377]'
                        }
                      >
                        {formatMovement(item.movementPp)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-[12px] text-[#526377]">
                      {rangeInfo.range}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDrawer(st);
                        }}
                        className="text-[12px] font-medium text-[#078899] hover:text-[#012F6B] inline-flex items-center gap-0.5"
                      >
                        <span>Why am I seeing this?</span>
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow Contributor Explanation */}
      <div className="p-5 rounded-[8px] bg-white border border-[#DDE5EC] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DDE5EC] pb-3">
          <div>
            <h3 className="text-[15px] font-semibold text-[#132238]">
              What contributed to this change?
            </h3>
            <p className="text-[12.5px] text-[#526377] mt-0.5">
              Workflows that contributed to the observed movement in{' '}
              <strong className="text-[#132238] font-medium">{STEP_DEFINITIONS[selectedWorkflowStep].label}</strong> decisions.
            </p>
          </div>

          <div className="flex items-center gap-1">
            {stepsList.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedWorkflowStep(st)}
                className={`px-2.5 py-1 rounded-[4px] text-[12px] font-medium transition-colors ${
                  selectedWorkflowStep === st
                    ? 'bg-[#012F6B] text-white'
                    : 'bg-[#F3F6F8] text-[#526377] hover:bg-[#EAF0F4]'
                }`}
              >
                {STEP_DEFINITIONS[st].label}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-[#DDE5EC] rounded-[8px] overflow-hidden">
          <table className="w-full text-left text-[13px] text-[#132238]">
            <caption className="sr-only">Workflow contributions to {STEP_DEFINITIONS[selectedWorkflowStep].label} movement</caption>
            <thead className="bg-[#F7FAFC] text-[#8190A0] font-semibold text-[11px] uppercase tracking-wider border-b border-[#DDE5EC]">
              <tr>
                <th scope="col" className="py-2.5 px-3.5">Workflow</th>
                <th scope="col" className="py-2.5 px-3.5 text-center">Current count</th>
                <th scope="col" className="py-2.5 px-3.5 text-center">Comparable baseline</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Contribution to movement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF0F4]">
              {(activeAnalysis?.contributors || []).slice(0, 6).map((c) => (
                <tr key={c.workflowId} className="hover:bg-[#F9FBFC] transition-colors">
                  <td className="py-2.5 px-3.5 font-medium text-[#132238]">
                    {c.workflowName}
                  </td>
                  <td className="py-2.5 px-3.5 text-center font-mono tabular-nums text-[#526377]">
                    {c.currentCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3.5 text-center font-mono tabular-nums text-[#8190A0]">
                    {c.baselineCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-semibold tabular-nums text-[#132238]">
                    {formatMovement(c.movementContributionPp)}
                  </td>
                </tr>
              ))}

              {(!activeAnalysis?.contributors || activeAnalysis.contributors.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#8190A0] text-[13px]">
                    No workflow movement contributors recorded for this decision type.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11.5px] text-[#8190A0] italic">
          * Shows mathematical contribution to observed percentage-point movement. Does not imply single-cause causality.
        </p>
      </div>
    </div>
  );
}
