"use client";

import React, { useState } from 'react';
import ExecutiveIntelligenceConsole from '@/components/intelligence/ExecutiveIntelligenceConsole';
import { StepDistributionResult } from '@/lib/intelligence/analytics/distributions';
import { IntelligenceSignal } from '@/lib/intelligence/analytics/signals';

export default function IntelligenceDemoPage() {
  const [scenario, setScenario] = useState<'standard' | 'no-attention' | 'low-confidence' | 'empty'>('standard');

  // Standard scenario (AMJ 2026, 286 decisions, +7.5 pp Exception shift)
  const standardDistribution: StepDistributionResult = {
    totalCurrentDecisions: 286,
    totalComparatorDecisions: 250,
    steps: {
      STRUCTURAL: {
        stepType: 'STRUCTURAL',
        currentCount: 18,
        currentShare: 0.063,
        comparatorCount: 21,
        comparatorShare: 0.084,
        movementPp: -2.1,
        movementLabel: '-2.1 pp',
        status: 'NORMAL',
        confidence: 'RELIABLE',
        historicalRange: {
          minShare: 0.05,
          maxShare: 0.09,
          periodCount: 4,
          samplePeriodsCount: 4,
          hasHistoricalRange: true,
        },
      },
      TRANSACTIONAL: {
        stepType: 'TRANSACTIONAL',
        currentCount: 177,
        currentShare: 0.619,
        comparatorCount: 160,
        comparatorShare: 0.640,
        movementPp: -2.1,
        movementLabel: '-2.1 pp',
        status: 'NORMAL',
        confidence: 'INSTITUTIONAL',
        historicalRange: {
          minShare: 0.58,
          maxShare: 0.66,
          periodCount: 4,
          samplePeriodsCount: 4,
          hasHistoricalRange: true,
        },
      },
      EXCEPTION: {
        stepType: 'EXCEPTION',
        currentCount: 43,
        currentShare: 0.150,
        comparatorCount: 19,
        comparatorShare: 0.076,
        movementPp: 7.4,
        movementLabel: '+7.4 pp',
        status: 'SIGNIFICANT_CHANGE',
        confidence: 'RELIABLE',
        historicalRange: {
          minShare: 0.06,
          maxShare: 0.09,
          periodCount: 4,
          samplePeriodsCount: 4,
          hasHistoricalRange: true,
        },
      },
      PROCESS: {
        stepType: 'PROCESS',
        currentCount: 48,
        currentShare: 0.168,
        comparatorCount: 50,
        comparatorShare: 0.200,
        movementPp: -3.2,
        movementLabel: '-3.2 pp',
        status: 'NORMAL',
        confidence: 'RELIABLE',
        historicalRange: {
          minShare: 0.15,
          maxShare: 0.22,
          periodCount: 4,
          samplePeriodsCount: 4,
          hasHistoricalRange: true,
        },
      },
    },
  };

  const standardSignals: IntelligenceSignal[] = [
    {
      id: 'sig-exp-1',
      signalType: 'EXCEPTION_PRESSURE',
      title: 'Rising Exception Pressure on Promotion Policy',
      fact: '24 of 48 comparable decisions were exceptions under Promotion Policy.',
      pattern: 'Exception rate is 18.5 percentage points above historical comparable baseline.',
      interpretation: 'Operating behaviour consistently deviates from configured promotion boundaries.',
      recommendation: 'Conduct a policy review of Promotion Policy criteria with domain owners.',
      magnitude: 18.5,
      persistence: 2,
      impact: 'HIGH',
      confidence: 'RELIABLE',
      confidenceBasis: { sampleSize: 48, comparablePeriodsCount: 4, policyCoverage: 0.93 },
    },
    {
      id: 'sig-exp-2',
      signalType: 'EXCEPTION_PRESSURE',
      title: 'Rising Exception Pressure on Travel & Expense Policy',
      fact: '12 of 35 decisions were exceptions under Travel & Expense Policy.',
      pattern: 'Exception rate increased for the second consecutive comparable period.',
      interpretation: 'Approvals frequently bypass automated expense thresholds.',
      recommendation: 'Inspect exception patterns in the travel booking workflow.',
      magnitude: 8.2,
      persistence: 2,
      impact: 'MEDIUM',
      confidence: 'RELIABLE',
      confidenceBasis: { sampleSize: 35, comparablePeriodsCount: 4, policyCoverage: 0.91 },
    },
  ];

  const standardMovementAnalyses: any = {
    EXCEPTION: {
      stepType: 'EXCEPTION',
      currentShare: 0.15,
      comparatorShare: 0.076,
      movementPp: 7.4,
      totalCurrentAll: 286,
      totalBaselineAll: 250,
      reconciledMovementPp: 7.4,
      contributors: [
        {
          workflowId: 'wf-1',
          workflowName: 'Executive Promotion Workflow',
          domain: 'HR',
          currentCount: 24,
          baselineCount: 11,
          currentShareContribution: 0.084,
          baselineShareContribution: 0.044,
          movementContributionPp: 4.0,
          direction: 'UP',
        },
        {
          workflowId: 'wf-2',
          workflowName: 'Off-cycle Equity Grant Approval',
          domain: 'FINANCE',
          currentCount: 12,
          baselineCount: 5,
          currentShareContribution: 0.042,
          baselineShareContribution: 0.020,
          movementContributionPp: 2.2,
          direction: 'UP',
        },
        {
          workflowId: 'wf-3',
          workflowName: 'Vendor Contract Exception Path',
          domain: 'LEGAL',
          currentCount: 7,
          baselineCount: 3,
          currentShareContribution: 0.024,
          baselineShareContribution: 0.012,
          movementContributionPp: 1.2,
          direction: 'UP',
        },
      ],
      topConsequentialDecisions: [
        {
          requestId: 'req-1',
          ref: 'EXP-2026-088',
          subject: 'EMEA Senior VP Engineering Exception Promotion',
          stepType: 'EXCEPTION',
          directDescendants: 5,
          transitiveDescendants: 14,
          basedOnCount: 2,
          exceptionCount: 1,
          footprintScore: 16,
          classification: 'STABLE_FOUNDATION',
          whySurfaced: '14 downstream decisions rely on this node (multi-hop graph reach)',
        },
        {
          requestId: 'req-2',
          ref: 'EXP-2026-042',
          subject: 'Enterprise Cloud Provider Sole-Source Exemption',
          stepType: 'EXCEPTION',
          directDescendants: 3,
          transitiveDescendants: 8,
          basedOnCount: 1,
          exceptionCount: 1,
          footprintScore: 9,
          classification: 'EMERGING',
          whySurfaced: '8 downstream decisions rely on this node',
        },
      ],
    },
    TRANSACTIONAL: {
      stepType: 'TRANSACTIONAL',
      currentShare: 0.619,
      comparatorShare: 0.640,
      movementPp: -2.1,
      totalCurrentAll: 286,
      totalBaselineAll: 250,
      reconciledMovementPp: -2.1,
      contributors: [
        {
          workflowId: 'wf-4',
          workflowName: 'Standard Purchase Requisition',
          domain: 'PROCUREMENT',
          currentCount: 110,
          baselineCount: 102,
          currentShareContribution: 0.384,
          baselineShareContribution: 0.408,
          movementContributionPp: -2.4,
          direction: 'DOWN',
        },
        {
          workflowId: 'wf-5',
          workflowName: 'Employee Travel Authorization',
          domain: 'OPERATIONS',
          currentCount: 67,
          baselineCount: 58,
          currentShareContribution: 0.234,
          baselineShareContribution: 0.232,
          movementContributionPp: 0.2,
          direction: 'STABLE',
        },
      ],
      topConsequentialDecisions: [],
    },
    PROCESS: {
      stepType: 'PROCESS',
      currentShare: 0.168,
      comparatorShare: 0.200,
      movementPp: -3.2,
      totalCurrentAll: 286,
      totalBaselineAll: 250,
      reconciledMovementPp: -3.2,
      contributors: [
        {
          workflowId: 'wf-6',
          workflowName: 'Approval Matrix Routing Amendment',
          domain: 'OPERATIONS',
          currentCount: 48,
          baselineCount: 50,
          currentShareContribution: 0.168,
          baselineShareContribution: 0.200,
          movementContributionPp: -3.2,
          direction: 'DOWN',
        },
      ],
      topConsequentialDecisions: [],
    },
    STRUCTURAL: {
      stepType: 'STRUCTURAL',
      currentShare: 0.063,
      comparatorShare: 0.084,
      movementPp: -2.1,
      totalCurrentAll: 286,
      totalBaselineAll: 250,
      reconciledMovementPp: -2.1,
      contributors: [
        {
          workflowId: 'wf-7',
          workflowName: 'Global Entity Restructuring',
          domain: 'GOVERNANCE',
          currentCount: 18,
          baselineCount: 21,
          currentShareContribution: 0.063,
          baselineShareContribution: 0.084,
          movementContributionPp: -2.1,
          direction: 'DOWN',
        },
      ],
      topConsequentialDecisions: [],
    },
  };

  // No-attention scenario
  const noAttentionDistribution: StepDistributionResult = {
    ...standardDistribution,
    steps: {
      STRUCTURAL: { ...standardDistribution.steps.STRUCTURAL, movementPp: -0.4 },
      TRANSACTIONAL: { ...standardDistribution.steps.TRANSACTIONAL, movementPp: 0.6 },
      EXCEPTION: { ...standardDistribution.steps.EXCEPTION, movementPp: 0.8 },
      PROCESS: { ...standardDistribution.steps.PROCESS, movementPp: -1.0 },
    },
  };

  // Empty scenario (0 decisions)
  const emptyDistribution: StepDistributionResult = {
    totalCurrentDecisions: 0,
    totalComparatorDecisions: 0,
    steps: {
      STRUCTURAL: { stepType: 'STRUCTURAL', currentCount: 0, currentShare: 0, comparatorCount: 0, comparatorShare: 0, movementPp: 0, movementLabel: '0.0 pp', status: 'NORMAL', confidence: 'EMERGING' },
      TRANSACTIONAL: { stepType: 'TRANSACTIONAL', currentCount: 0, currentShare: 0, comparatorCount: 0, comparatorShare: 0, movementPp: 0, movementLabel: '0.0 pp', status: 'NORMAL', confidence: 'EMERGING' },
      EXCEPTION: { stepType: 'EXCEPTION', currentCount: 0, currentShare: 0, comparatorCount: 0, comparatorShare: 0, movementPp: 0, movementLabel: '0.0 pp', status: 'NORMAL', confidence: 'EMERGING' },
      PROCESS: { stepType: 'PROCESS', currentCount: 0, currentShare: 0, comparatorCount: 0, comparatorShare: 0, movementPp: 0, movementLabel: '0.0 pp', status: 'NORMAL', confidence: 'EMERGING' },
    },
  };

  let activeDist = standardDistribution;
  let activeSignals = standardSignals;
  let activeCoverage: any = {
    percentage: 93,
    stepResolutionCoverage: 0.93,
    workflowVersionCoverage: 0.91,
    policyLinkageCoverage: 0.88,
    comparablePeriodsCount: 4,
    isReliable: true,
    label: 'Reliable data coverage (93%)',
  };

  if (scenario === 'no-attention') {
    activeDist = noAttentionDistribution;
    activeSignals = [];
  } else if (scenario === 'low-confidence') {
    activeCoverage = {
      percentage: 41,
      stepResolutionCoverage: 0.41,
      workflowVersionCoverage: 0.38,
      policyLinkageCoverage: 0.30,
      comparablePeriodsCount: 1,
      isReliable: false,
      label: 'Partial data coverage (41%)',
    };
  } else if (scenario === 'empty') {
    activeDist = emptyDistribution;
    activeSignals = [];
    activeCoverage = {
      percentage: 0,
      stepResolutionCoverage: 0,
      workflowVersionCoverage: 0,
      policyLinkageCoverage: 0,
      comparablePeriodsCount: 0,
      isReliable: false,
      label: 'No period decisions recorded',
    };
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] p-6 sm:p-8">
      {/* Interactive Scenario Switcher */}
      <div className="max-w-[1400px] mx-auto mb-6 p-3 rounded-[8px] bg-white border border-[#DDE5EC] flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#132238]">Executive Dashboard Scenarios:</span>
          <div className="inline-flex rounded-[6px] border border-[#DDE5EC] p-0.5 bg-[#F3F6F8]">
            <button
              onClick={() => setScenario('standard')}
              className={`px-3 py-1 rounded-[4px] font-medium transition-colors ${
                scenario === 'standard' ? 'bg-white text-[#012F6B] shadow-xs' : 'text-[#526377] hover:text-[#132238]'
              }`}
            >
              Standard (+7.5 pp Attention)
            </button>
            <button
              onClick={() => setScenario('no-attention')}
              className={`px-3 py-1 rounded-[4px] font-medium transition-colors ${
                scenario === 'no-attention' ? 'bg-white text-[#012F6B] shadow-xs' : 'text-[#526377] hover:text-[#132238]'
              }`}
            >
              No-Attention (Normal / Quiet)
            </button>
            <button
              onClick={() => setScenario('low-confidence')}
              className={`px-3 py-1 rounded-[4px] font-medium transition-colors ${
                scenario === 'low-confidence' ? 'bg-white text-[#012F6B] shadow-xs' : 'text-[#526377] hover:text-[#132238]'
              }`}
            >
              Low-Confidence (Developing)
            </button>
            <button
              onClick={() => setScenario('empty')}
              className={`px-3 py-1 rounded-[4px] font-medium transition-colors ${
                scenario === 'empty' ? 'bg-white text-[#012F6B] shadow-xs' : 'text-[#526377] hover:text-[#132238]'
              }`}
            >
              Empty State (0 Decisions)
            </button>
          </div>
        </div>

        <span className="text-[12px] text-[#8190A0]">
          16 metrics · 4 human questions · Zero new metrics
        </span>
      </div>

      {/* Render the Executive Intelligence Console */}
      <main className="max-w-[1400px] mx-auto">
        <ExecutiveIntelligenceConsole
          tenant="acme-corp"
          userEmail="executive@sigmago.com"
          grantScope="FULL"
          isAdmin={true}
          distribution={activeDist}
          periodDisplayName="AMJ 2026"
          comparatorDisplayName="AMJ 2025"
          signals={activeSignals}
          movementAnalyses={standardMovementAnalyses}
          sealedDecisions={[]}
          coverage={activeCoverage}
        />
      </main>
    </div>
  );
}
