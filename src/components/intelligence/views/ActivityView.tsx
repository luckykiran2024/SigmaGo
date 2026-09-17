"use client";

import React, { useState } from 'react';
import { HelpCircle, Info } from 'lucide-react';
import { StepType, StepDistributionResult } from '@/lib/intelligence/analytics/distributions';
import { StepMovementAnalysis } from '@/lib/intelligence/analytics/contributors';

interface ActivityViewProps {
  distribution: StepDistributionResult;
  periodDisplayName: string;
  movementAnalyses: Record<StepType, StepMovementAnalysis>;
  onInspectStep?: (st: StepType) => void;
}

export const STEP_DEFINITIONS: Record<StepType, { label: string; description: string; color: string; dotClass: string; barClass: string }> = {
  STRUCTURAL: {
    label: 'Structural',
    description: 'Changes organisational shape, authority, or design.',
    color: '#012F6B',
    dotClass: 'bg-[#012F6B]',
    barClass: 'bg-[#012F6B]',
  },
  TRANSACTIONAL: {
    label: 'Transactional',
    description: 'Executes within an established rule or boundary.',
    color: '#059DB0',
    dotClass: 'bg-[#059DB0]',
    barClass: 'bg-[#059DB0]',
  },
  EXCEPTION: {
    label: 'Exception',
    description: 'Operates outside an established boundary.',
    color: '#B54708',
    dotClass: 'bg-[#B54708]',
    barClass: 'bg-[#B54708]',
  },
  PROCESS: {
    label: 'Process',
    description: 'Changes or revises how the rule or workflow works.',
    color: '#526377',
    dotClass: 'bg-[#526377]',
    barClass: 'bg-[#526377]',
  },
};

export default function ActivityView({
  distribution,
  periodDisplayName,
  movementAnalyses,
  onInspectStep,
}: ActivityViewProps) {
  const [showStepPopover, setShowStepPopover] = useState(false);
  const [showAllWorkflows, setShowAllWorkflows] = useState(false);

  const stepsList: StepType[] = ['TRANSACTIONAL', 'PROCESS', 'EXCEPTION', 'STRUCTURAL'];
  const totalDecisions = distribution.totalCurrentDecisions;

  // Aggregate current workflow contributions across all STEP types
  const workflowMap = new Map<string, { name: string; domain: string; currentCount: number }>();
  stepsList.forEach((st) => {
    const analysis = movementAnalyses[st];
    if (analysis && analysis.contributors) {
      analysis.contributors.forEach((c) => {
        const existing = workflowMap.get(c.workflowId);
        if (existing) {
          existing.currentCount += c.currentCount;
        } else {
          workflowMap.set(c.workflowId, {
            name: c.workflowName,
            domain: c.domain,
            currentCount: c.currentCount,
          });
        }
      });
    }
  });

  const sortedWorkflows = Array.from(workflowMap.values())
    .filter((w) => w.currentCount > 0)
    .sort((a, b) => b.currentCount - a.currentCount);

  const displayedWorkflows = showAllWorkflows
    ? sortedWorkflows
    : sortedWorkflows.slice(0, 6);

  if (totalDecisions === 0) {
    return (
      <div className="p-8 rounded-[8px] bg-white border border-[#DDE5EC] text-center space-y-2">
        <h3 className="text-[15px] font-semibold text-[#132238]">
          No decisions recorded for {periodDisplayName}
        </h3>
        <p className="text-[13px] text-[#526377] max-w-md mx-auto">
          No decisions have been submitted or recorded for this period. Current decision mix will display once activity is registered.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Number Banner */}
      <div className="p-5 rounded-[8px] bg-white border border-[#DDE5EC] flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <div>
          <span className="text-[12px] font-medium text-[#8190A0] uppercase tracking-wider">
            Total Decision Volume
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[32px] font-bold text-[#132238] tracking-tight tabular-nums">
              {totalDecisions.toLocaleString()}
            </span>
            <span className="text-[14px] font-medium text-[#526377]">
              decisions in {periodDisplayName}
            </span>
          </div>
        </div>
        <p className="text-[12.5px] text-[#526377] max-w-md">
          Current organisational operating tempo reflected across all recorded governance boundaries and operational workflows.
        </p>
      </div>

      {/* Decision Mix & STEP Distribution */}
      <div className="p-5 rounded-[8px] bg-white border border-[#DDE5EC] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-[#132238]">
                Decision Mix
              </h3>
              <button
                type="button"
                onClick={() => setShowStepPopover(!showStepPopover)}
                className="inline-flex items-center gap-1 text-[12px] text-[#078899] hover:text-[#012F6B] font-medium"
                aria-expanded={showStepPopover}
                aria-label="What is STEP framework?"
              >
                <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>What is STEP?</span>
              </button>
            </div>
            <p className="text-[12.5px] text-[#526377] mt-0.5">
              How the organisation&apos;s decisions are distributed across Structural, Transactional, Exception, and Process decisions.
            </p>
          </div>

          <span className="text-[12px] text-[#8190A0] tabular-nums">
            100% of recorded decisions
          </span>
        </div>

        {/* What is STEP Explainer Popover */}
        {showStepPopover && (
          <div className="p-4 rounded-[8px] bg-[#F7FAFC] border border-[#DDE5EC] space-y-2 text-[12.5px]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#132238]">The STEP Decision Framework</span>
              <button
                type="button"
                onClick={() => setShowStepPopover(false)}
                className="text-[12px] text-[#8190A0] hover:text-[#132238]"
              >
                Dismiss
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {stepsList.map((st) => (
                <div key={st} className="p-2.5 rounded-[6px] bg-white border border-[#EAF0F4]">
                  <div className="flex items-center gap-1.5 font-medium text-[#132238]">
                    <span className={`w-2 h-2 rounded-full ${STEP_DEFINITIONS[st].dotClass}`} aria-hidden="true" />
                    <span>{STEP_DEFINITIONS[st].label}</span>
                  </div>
                  <p className="text-[11.5px] text-[#526377] mt-1 leading-snug">
                    {STEP_DEFINITIONS[st].description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 100% Horizontal Stacked Bar */}
        <div
          role="img"
          aria-label="STEP Distribution Stacked Bar"
          className="h-3 w-full rounded-[4px] bg-[#F3F6F8] overflow-hidden flex"
        >
          {stepsList.map((st) => {
            const share = distribution.steps[st]?.currentShare || 0;
            const pct = Math.max(0, Math.round(share * 100));
            return (
              <div
                key={st}
                style={{ width: `${pct}%` }}
                className={`${STEP_DEFINITIONS[st].barClass} transition-all duration-300`}
                title={`${STEP_DEFINITIONS[st].label}: ${(share * 100).toFixed(1)}%`}
              />
            );
          })}
        </div>

        {/* 4-Row Compact Distribution Table */}
        <div className="border border-[#DDE5EC] rounded-[8px] overflow-hidden">
          <table className="w-full text-left text-[13px] text-[#132238]">
            <caption className="sr-only">Decision Mix Distribution by STEP type</caption>
            <thead className="bg-[#F7FAFC] text-[#8190A0] font-semibold text-[11px] uppercase tracking-wider border-b border-[#DDE5EC]">
              <tr>
                <th scope="col" className="py-2.5 px-3.5">Decision Type</th>
                <th scope="col" className="py-2.5 px-3.5">First-time Definition</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Count</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Share</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF0F4]">
              {stepsList.map((st) => {
                const item = distribution.steps[st];
                const meta = STEP_DEFINITIONS[st];
                const sharePct = ((item?.currentShare || 0) * 100).toFixed(1);

                return (
                  <tr key={st} className="hover:bg-[#F9FBFC] transition-colors">
                    <td className="py-2.5 px-3.5 font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
                        <span className="text-[#132238]">{meta.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#526377] text-[12px]">
                      {meta.description}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[#526377]">
                      {(item?.currentCount || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-semibold tabular-nums text-[#132238]">
                      {sharePct}%
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      {onInspectStep && (
                        <button
                          type="button"
                          onClick={() => onInspectStep(st)}
                          className="text-[12px] font-medium text-[#078899] hover:text-[#012F6B]"
                        >
                          Drivers →
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow Current-Period Contribution Table */}
      <div className="p-5 rounded-[8px] bg-white border border-[#DDE5EC] space-y-3">
        <div className="flex items-center justify-between border-b border-[#DDE5EC] pb-3">
          <div>
            <h3 className="text-[15px] font-semibold text-[#132238]">
              Workflow Contribution
            </h3>
            <p className="text-[12.5px] text-[#526377] mt-0.5">
              Workflows contributing most to current decision activity in this period.
            </p>
          </div>
          <span className="text-[12px] text-[#8190A0]">
            {sortedWorkflows.length} workflows active
          </span>
        </div>

        <div className="border border-[#DDE5EC] rounded-[8px] overflow-hidden">
          <table className="w-full text-left text-[13px] text-[#132238]">
            <caption className="sr-only">Workflow Current-period Contribution Count and Share</caption>
            <thead className="bg-[#F7FAFC] text-[#8190A0] font-semibold text-[11px] uppercase tracking-wider border-b border-[#DDE5EC]">
              <tr>
                <th scope="col" className="py-2.5 px-3.5">Workflow</th>
                <th scope="col" className="py-2.5 px-3.5">Domain</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Decisions</th>
                <th scope="col" className="py-2.5 px-3.5 text-right">Share of Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF0F4]">
              {displayedWorkflows.map((w, idx) => {
                const sharePct = totalDecisions > 0
                  ? ((w.currentCount / totalDecisions) * 100).toFixed(1)
                  : '0.0';

                return (
                  <tr key={`${w.name}-${idx}`} className="hover:bg-[#F9FBFC] transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-[#132238]">
                      {w.name}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#526377] text-[12px]">
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#F3F6F8] text-[#526377] border border-[#DDE5EC]">
                        {w.domain}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-[#526377]">
                      {w.currentCount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-semibold tabular-nums text-[#132238]">
                      {sharePct}%
                    </td>
                  </tr>
                );
              })}

              {displayedWorkflows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#8190A0] text-[13px]">
                    No workflow activity recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sortedWorkflows.length > 6 && (
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => setShowAllWorkflows(!showAllWorkflows)}
              className="text-[12px] font-medium text-[#078899] hover:text-[#012F6B]"
            >
              {showAllWorkflows ? 'Show top 6 workflows' : `View all ${sortedWorkflows.length} workflows →`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
