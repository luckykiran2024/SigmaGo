"use client";

import React, { useState } from 'react';
import { 
  GitFork, 
  Share2, 
  Globe2, 
  Repeat, 
  ShieldCheck, 
  AlertTriangle, 
  Percent, 
  Activity, 
  FileCheck2, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  PieChart, 
  Layers, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { StepType, StepDistributionResult } from '@/lib/intelligence/analytics/distributions';
import { OrphanMetrics } from '@/lib/intelligence/chain/structure';
import { IntelligenceSignal } from '@/lib/intelligence/analytics/signals';

export type MetricCategoryKey = 'all' | 'reach' | 'governance' | 'consensus' | 'step';

interface CategorizedMetricsDashboardProps {
  distribution: StepDistributionResult;
  periodDisplayName: string;
  comparatorDisplayName: string;
  coverage?: any;
  orphanMetrics?: OrphanMetrics;
  signals: IntelligenceSignal[];
  onOpenEvidence: (type: 'step' | 'signal', id: string) => void;
}

export default function CategorizedMetricsDashboard({
  distribution,
  periodDisplayName,
  comparatorDisplayName,
  coverage,
  orphanMetrics,
  signals,
  onOpenEvidence,
}: CategorizedMetricsDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<MetricCategoryKey>('all');

  // Resolved dynamic values
  const totalCurrent = distribution.totalCurrentDecisions;
  const totalComparator = distribution.totalComparatorDecisions;
  const orphanScore = orphanMetrics?.orphanScore ?? coverage?.orphanScore ?? 0;
  const connectedRate = orphanMetrics?.connectedRate ?? coverage?.connectedRate ?? 0;
  const orphanCount = orphanMetrics?.orphanCount ?? coverage?.orphanCount ?? 0;
  const orphanStatus = totalCurrent > 0
    ? (orphanMetrics?.status ?? coverage?.orphanStatus ?? 'CRITICAL')
    : 'NO DATA';
  const unavailableClass = 'bg-[#F2F4F7] text-[#475467] border-[#D0D5DD]';
  const classificationCoverage = totalCurrent > 0
    ? Math.round((coverage?.stepResolutionCoverage ?? 0) * 1000) / 10
    : null;
  const classifiedCount = classificationCoverage === null
    ? 0
    : Math.round((classificationCoverage / 100) * totalCurrent);

  const curExceptions = distribution.steps.EXCEPTION.currentCount;
  const curExceptionRate = totalCurrent > 0 ? (curExceptions / totalCurrent) * 100 : null;
  const compExceptions = distribution.steps.EXCEPTION.comparatorCount;
  const compExceptionRate = totalComparator > 0 ? (compExceptions / totalComparator) * 100 : null;
  const exceptionPressure = curExceptionRate !== null && compExceptionRate !== null && compExceptionRate > 0
    ? Number((curExceptionRate / compExceptionRate).toFixed(2))
    : null;

  const exceptionMovementPp = distribution.steps.EXCEPTION.movementPp;
  const structuralShare = (distribution.steps.STRUCTURAL.currentShare * 100).toFixed(1);
  const processShare = (distribution.steps.PROCESS.currentShare * 100).toFixed(1);
  const transactionalShare = (distribution.steps.TRANSACTIONAL.currentShare * 100).toFixed(1);
  const exceptionShare = (distribution.steps.EXCEPTION.currentShare * 100).toFixed(1);

  // 4 Core Categories Definition
  const categories = [
    {
      id: 'reach' as MetricCategoryKey,
      name: '1. Reach & Graph Dynamics',
      shortName: 'Graph Reach',
      icon: <GitFork className="w-4 h-4 text-[#0B7780]" />,
      description: 'Downstream precedent footprint, blast radius, and decision linkage hygiene.',
      metrics: [
        {
          id: 'blast-radius',
          name: 'Blast Radius',
          value: 'Not measured',
          status: 'DATA REQUIRED',
          statusClass: unavailableClass,
          arithmetic: 'Unique transitive downstream decisions',
          answers: 'How far does this decision reach through multi-hop reliance?',
          benchmark: 'Requires transitive reference-graph evidence',
          actionType: 'step' as const,
          actionId: 'STRUCTURAL',
          actionText: 'View Drivers →',
        },
        {
          id: 'impact-factor',
          name: 'Impact Factor',
          value: 'Not measured',
          status: 'DATA REQUIRED',
          statusClass: unavailableClass,
          arithmetic: 'Blast Radius ÷ eligible downstream population × 100',
          answers: 'What % of the relevant decision system is influenced?',
          benchmark: 'Requires blast-radius and eligible-population evidence',
          actionType: 'step' as const,
          actionId: 'STRUCTURAL',
          actionText: 'Review Evidence →',
        },
        {
          id: 'cross-domain-reach',
          name: 'Cross-Domain Reach',
          value: 'Not measured',
          status: 'DATA REQUIRED',
          statusClass: unavailableClass,
          arithmetic: 'Affected domains ÷ relevant domains × 100',
          answers: 'How widely does it spread organisationally across departments?',
          benchmark: 'Requires affected-domain evidence',
          actionType: 'step' as const,
          actionId: 'STRUCTURAL',
          actionText: 'View Drivers →',
        },
        {
          id: 'precedent-reuse-rate',
          name: 'Precedent Reuse Rate',
          value: `${connectedRate}%`,
          status: 'STRONG',
          statusClass: 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]',
          arithmetic: 'Decisions referencing precedent ÷ eligible decisions × 100',
          answers: 'How frequently do decisions anchor to prior approved standards?',
          benchmark: `${Math.max(0, totalCurrent - orphanCount)} of ${totalCurrent} decisions have a recorded reference`,
          actionType: 'step' as const,
          actionId: 'PROCESS',
          actionText: 'Review Evidence →',
        },
        {
          id: 'orphan-score',
          name: 'Orphan Score & Hygiene',
          value: `${orphanScore}%`,
          status: orphanStatus,
          statusClass: orphanStatus === 'HEALTHY' ? 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]' : 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
          arithmetic: 'Orphan decisions ÷ total decisions × 100',
          answers: 'What % of decisions are isolated without any organizational reference?',
          benchmark: `Target ≤ 10% · ${orphanCount} unreferenced decisions`,
          actionType: 'step' as const,
          actionId: 'TRANSACTIONAL',
          actionText: 'Review Evidence →',
        },
      ],
    },
    {
      id: 'governance' as MetricCategoryKey,
      name: '2. Policy Governance & Exception Risk',
      shortName: 'Policy & Risk',
      icon: <ShieldCheck className="w-4 h-4 text-[#17324D]" />,
      description: 'Compliance rates, policy deviations, and exception pressure over time.',
      metrics: [
        {
          id: 'governance-rate',
          name: 'Governance Rate',
          value: 'Not measured',
          status: 'DATA REQUIRED',
          statusClass: unavailableClass,
          arithmetic: 'Governance-compliant decisions ÷ eligible decisions × 100',
          answers: 'What % of decisions execute strictly within approved policy boundaries?',
          benchmark: 'Requires policy-bound evaluation evidence',
          actionType: 'step' as const,
          actionId: 'TRANSACTIONAL',
          actionText: 'View Drivers →',
        },
        {
          id: 'deviation-factor',
          name: 'Deviation Factor',
          value: curExceptionRate === null ? 'No data' : `${curExceptionRate.toFixed(1)}%`,
          status: curExceptionRate === null ? 'NO DATA' : 'MONITOR',
          statusClass: curExceptionRate === null ? unavailableClass : 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
          arithmetic: 'Decisions outside expected boundary ÷ comparable eligible × 100',
          answers: 'How often is the expected standard rule or procedure bypassed?',
          benchmark: 'Operating within tolerance threshold',
          actionType: 'step' as const,
          actionId: 'EXCEPTION',
          actionText: 'Review Evidence →',
        },
        {
          id: 'exception-rate',
          name: 'Exception Rate',
          value: curExceptionRate === null ? 'No data' : `${curExceptionRate.toFixed(1)}%`,
          status: curExceptionRate === null ? 'NO DATA' : 'MONITOR',
          statusClass: curExceptionRate === null ? unavailableClass : 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
          arithmetic: 'Exceptions ÷ comparable eligible decisions × 100',
          answers: 'How frequently are explicit exceptions requested and approved?',
          benchmark: `${curExceptions} of ${totalCurrent} decisions in this period`,
          actionType: 'step' as const,
          actionId: 'EXCEPTION',
          actionText: 'View Drivers →',
        },
        {
          id: 'exception-pressure',
          name: 'Exception Pressure',
          value: exceptionPressure === null ? 'Baseline unavailable' : `${exceptionPressure}x`,
          status: exceptionPressure === null ? 'NO BASELINE' : exceptionPressure > 1.2 ? 'WATCH' : 'NORMAL',
          statusClass: exceptionPressure === null ? unavailableClass : exceptionPressure > 1.2 ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]' : 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]',
          arithmetic: 'Current exception rate ÷ historical comparable exception rate',
          answers: 'How abnormal is today’s exception activity compared to last year?',
          benchmark: exceptionPressure === null ? `No comparable evidence in ${comparatorDisplayName}` : `${curExceptionRate!.toFixed(1)}% vs ${compExceptionRate!.toFixed(1)}% in ${comparatorDisplayName}`,
          actionType: 'step' as const,
          actionId: 'EXCEPTION',
          actionText: 'Review Evidence →',
        },
        {
          id: 'policy-health',
          name: 'Policy Health Index',
          value: 'Not measured',
          status: 'DATA REQUIRED',
          statusClass: unavailableClass,
          arithmetic: 'Deviation + persistence + volume load + reason concentration',
          answers: 'Is the governing policy framework performing within stable parameters?',
          benchmark: 'Requires policy-level deviation evidence',
          actionType: 'step' as const,
          actionId: 'PROCESS',
          actionText: 'View Drivers →',
        },
      ],
    },
    {
      id: 'consensus' as MetricCategoryKey,
      name: '3. Consensus Alignment & Velocity',
      shortName: 'Alignment & Velocity',
      icon: <Activity className="w-4 h-4 text-[#0B7780]" />,
      description: 'Stakeholder stance agreement, hesitation rates, and cycle dwell times.',
      metrics: [
        {
          id: 'confidence-alignment',
          name: 'Confidence / Alignment',
          value: 'Not measured',
          status: 'DATA REQUIRED',
          statusClass: unavailableClass,
          arithmetic: '(Approvals + 0.5 × Reservations) ÷ total stances × 100',
          answers: 'How aligned are decision makers across all approval tiers?',
          benchmark: 'Requires recorded approver stances',
          actionType: 'step' as const,
          actionId: 'STRUCTURAL',
          actionText: 'Review Evidence →',
        },
        {
          id: 'reservation-rate',
          name: 'Reservation Rate',
          value: 'Not measured',
          status: 'DATA REQUIRED',
          statusClass: unavailableClass,
          arithmetic: 'Reservations ÷ approval stances × 100',
          answers: 'How often do approvers record caveats, friction, or reservations?',
          benchmark: 'Requires reservation and dissent evidence',
          actionType: 'step' as const,
          actionId: 'PROCESS',
          actionText: 'View Drivers →',
        },
        {
          id: 'decision-friction',
          name: 'Decision Friction',
          value: 'Not measured',
          status: 'DATA REQUIRED',
          statusClass: unavailableClass,
          arithmetic: 'Cycle time + stage dwell + rework + SLA deviation',
          answers: 'How fast do decisions progress from creation to sealing?',
          benchmark: 'Requires cycle-time and stage-dwell evidence',
          actionType: 'step' as const,
          actionId: 'TRANSACTIONAL',
          actionText: 'Review Evidence →',
        },
        {
          id: 'signal-persistence',
          name: 'Signal Persistence',
          value: totalComparator > 0 ? 'Not measured' : 'Baseline unavailable',
          status: totalComparator > 0 ? 'DATA REQUIRED' : 'NO BASELINE',
          statusClass: unavailableClass,
          arithmetic: 'Periods signal persists ÷ comparable periods × 100',
          answers: 'Is observed variance a transient blip or an established multi-quarter trend?',
          benchmark: totalComparator > 0 ? 'Requires multi-period signal evidence' : `No comparable evidence in ${comparatorDisplayName}`,
          actionType: 'step' as const,
          actionId: 'EXCEPTION',
          actionText: 'Review Evidence →',
        },
      ],
    },
    {
      id: 'step' as MetricCategoryKey,
      name: '4. STEP Architecture & Shape',
      shortName: 'STEP Architecture',
      icon: <PieChart className="w-4 h-4 text-[#B54708]" />,
      description: 'Composition and movements across Structural, Process, Transactional, and Exception steps.',
      metrics: [
        {
          id: 'step-share',
          name: 'STEP Distribution Share',
          value: `${transactionalShare}% Trx`,
          status: 'BALANCED',
          statusClass: 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]',
          arithmetic: 'STEP decisions ÷ all included decisions × 100',
          answers: 'What is the organizational resource split between routine and design decisions?',
          benchmark: `Str ${structuralShare}% · Prc ${processShare}% · Trx ${transactionalShare}% · Exp ${exceptionShare}%`,
          actionType: 'step' as const,
          actionId: 'TRANSACTIONAL',
          actionText: 'View Drivers →',
        },
        {
          id: 'step-movement',
          name: 'STEP Movement',
          value: `${exceptionMovementPp > 0 ? '+' : ''}${exceptionMovementPp.toFixed(1)} pp`,
          status: Math.abs(exceptionMovementPp) >= 5 ? 'NOTABLE SHIFT' : 'STABLE',
          statusClass: Math.abs(exceptionMovementPp) >= 5 ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]' : 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]',
          arithmetic: 'Current STEP share − baseline STEP share (pp)',
          answers: 'How has organizational behavior shifted compared with the baseline period?',
          benchmark: `Exception share shifted by ${exceptionMovementPp.toFixed(1)} pp vs ${comparatorDisplayName}`,
          actionType: 'step' as const,
          actionId: 'EXCEPTION',
          actionText: 'Review Evidence →',
        },
        {
          id: 'decision-concentration',
          name: 'Decision Concentration (HHI)',
          value: 'Not measured',
          status: 'DATA REQUIRED',
          statusClass: unavailableClass,
          arithmetic: 'Top-N workflow volume share / Herfindahl-Hirschman Index',
          answers: 'Are decisions concentrated in a single bottleneck workflow or dispersed?',
          benchmark: 'Requires per-workflow volume evidence',
          actionType: 'step' as const,
          actionId: 'TRANSACTIONAL',
          actionText: 'View Drivers →',
        },
        {
          id: 'classification-coverage',
          name: 'Classification Coverage',
          value: classificationCoverage === null ? 'No data' : `${classificationCoverage.toFixed(1)}%`,
          status: classificationCoverage === null ? 'NO DATA' : classificationCoverage === 100 ? 'VERIFIED' : 'PARTIAL',
          statusClass: classificationCoverage === 100 ? 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]' : unavailableClass,
          arithmetic: 'Classified STEP decisions ÷ total period decisions × 100',
          answers: 'How complete is the underlying STEP classification data?',
          benchmark: `${classifiedCount} of ${totalCurrent} decisions have a resolved STEP classification`,
          actionType: 'step' as const,
          actionId: 'STRUCTURAL',
          actionText: 'Review Evidence →',
        },
      ],
    },
  ];

  const displayedCategories = selectedCategory === 'all'
    ? categories
    : categories.filter((c) => c.id === selectedCategory);

  return (
    <div className="space-y-6 font-sans">
      {/* Category Segmented Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-[8px] border border-[#DCE5EA] shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[#637587] mr-2">
            Metric Categories:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-[6px] text-[12.5px] font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-[#17324D] text-white shadow-xs'
                : 'text-[#526679] hover:bg-[#F6F8F9] hover:text-[#182B3D]'
            }`}
          >
            All 4 Categories (18 Metrics)
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12.5px] font-medium transition ${
                selectedCategory === c.id
                  ? 'bg-[#0B7780] text-white shadow-xs'
                  : 'text-[#526679] hover:bg-[#F6F8F9] hover:text-[#182B3D]'
              }`}
            >
              {c.icon}
              <span>{c.shortName}</span>
            </button>
          ))}
        </div>

        <div className="text-[12px] text-[#637587]">
          Showing <strong className="text-[#182B3D]">{displayedCategories.reduce((acc, c) => acc + c.metrics.length, 0)}</strong> verified metrics
        </div>
      </div>

      {/* Render Categorized Groups */}
      {displayedCategories.map((cat) => (
        <section
          key={cat.id}
          aria-labelledby={`cat-${cat.id}-title`}
          className="bg-white border border-[#DCE5EA] rounded-[10px] p-5 space-y-4 shadow-xs"
        >
          {/* Category Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAF0F2] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-[6px] bg-[#F6F8F9] border border-[#DCE5EA]">
                {cat.icon}
              </div>
              <div>
                <h3 id={`cat-${cat.id}-title`} className="text-[16px] font-semibold text-[#182B3D]">
                  {cat.name}
                </h3>
                <p className="text-[12.5px] text-[#526679] mt-0.5">
                  {cat.description}
                </p>
              </div>
            </div>

            <span className="text-[11.5px] font-medium text-[#637587] uppercase tracking-wider bg-[#F6F8F9] px-2.5 py-1 rounded-[4px] border border-[#DCE5EA] shrink-0 self-start sm:self-auto">
              {cat.metrics.length} Core Formulas
            </span>
          </div>

          {/* Metrics Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {cat.metrics.map((m) => (
              <div
                key={m.id}
                className="bg-[#FCFDFD] border border-[#DCE5EA] hover:border-[#0B7780]/60 rounded-[8px] p-4 flex flex-col justify-between space-y-3 transition group shadow-2xs hover:shadow-xs"
              >
                <div>
                  {/* Top Bar: Metric Name & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[#182B3D] group-hover:text-[#0B7780] transition">
                      {m.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-[4px] text-[10.5px] font-semibold font-mono uppercase tracking-wider border shrink-0 ${m.statusClass}`}>
                      {m.status}
                    </span>
                  </div>

                  {/* Primary Metric Value */}
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-[26px] font-bold text-[#182B3D] tabular-nums tracking-tight">
                      {m.value}
                    </span>
                  </div>

                  {/* Arithmetic & Answers Callout */}
                  <div className="mt-2.5 space-y-1.5 text-[11.5px] bg-white p-2.5 rounded-[6px] border border-[#EAF0F2]">
                    <div className="text-[#17324D] font-mono leading-relaxed">
                      <span className="text-[#637587] font-sans">Formula: </span>
                      {m.arithmetic}
                    </div>
                    <div className="text-[#526679] italic leading-relaxed">
                      &quot;{m.answers}&quot;
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Benchmark & Action Drawer Trigger */}
                <div className="pt-2 border-t border-[#EAF0F2] flex items-center justify-between gap-2 text-[11.5px]">
                  <span className="text-[#637587] truncate max-w-[170px]" title={m.benchmark}>
                    {m.benchmark}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenEvidence(m.actionType, m.actionId)}
                    className="inline-flex items-center gap-1 font-medium text-[#0B7780] hover:text-[#085359] hover:underline shrink-0"
                  >
                    <span>{m.actionText}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

