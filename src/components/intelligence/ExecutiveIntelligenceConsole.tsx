"use client";

import React, { useState, useMemo } from 'react';
import { StepType, StepDistributionResult } from '@/lib/intelligence/analytics/distributions';
import { StepMovementAnalysis } from '@/lib/intelligence/analytics/contributors';
import { IntelligenceSignal } from '@/lib/intelligence/analytics/signals';
import { generateOverviewSummaries } from '@/lib/intelligence/analytics/summary';
import { getStepStatus } from '@/lib/intelligence/analytics/status';

import IntelligenceHeader from './IntelligenceHeader';
import IntelligenceOverview, { IntelligenceTab } from './IntelligenceOverview';
import ActivityView from './views/ActivityView';
import ChangeView from './views/ChangeView';
import AttentionView from './views/AttentionView';
import ConfidenceView from './views/ConfidenceView';
import IntelligenceEvidenceDrawer from './IntelligenceEvidenceDrawer';

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
  // Determine if there is a meaningful alert state justifying opening Attention first
  const initialTab = useMemo<IntelligenceTab>(() => {
    const hasHighImpactSignal = (signals || []).some((s) => s.impact === 'HIGH');
    const exceptionStatus = getStepStatus(
      'EXCEPTION',
      distribution.steps.EXCEPTION,
      distribution.totalComparatorDecisions,
      comparatorDisplayName
    );
    if (hasHighImpactSignal || exceptionStatus.label === 'Attention') {
      return 'attention';
    }
    return 'activity';
  }, [signals, distribution, comparatorDisplayName]);

  const [activeTab, setActiveTab] = useState<IntelligenceTab>(initialTab);

  // Level 3 Drill-down Drawer State
  const [evidenceTarget, setEvidenceTarget] = useState<{
    type: 'step' | 'signal';
    id: string;
  } | null>(null);

  // Generate deterministic Level 1 overview summaries
  const summaries = useMemo(() => {
    return generateOverviewSummaries({
      distribution,
      periodDisplayName,
      comparatorDisplayName,
      signals,
      coverage,
    });
  }, [distribution, periodDisplayName, comparatorDisplayName, signals, coverage]);

  const tabs: Array<{ id: IntelligenceTab; label: string; question: string }> = [
    { id: 'activity', label: 'Activity', question: 'What is happening?' },
    { id: 'change', label: 'Change', question: 'What changed?' },
    { id: 'attention', label: 'Attention', question: 'Where should I look?' },
    { id: 'confidence', label: 'Evidence', question: 'How strong is the evidence?' },
  ];

  return (
    <div className="space-y-6 font-sans text-[#182B3D]">
      {/* Header & Filter Context */}
      <IntelligenceHeader
        tenant={tenant}
        userEmail={userEmail}
        grantScope={grantScope}
        isAdmin={isAdmin}
        periodDisplayName={periodDisplayName}
        comparatorDisplayName={comparatorDisplayName}
        coverage={coverage}
      />

      {/* Level 1: At a Glance Overview (Above the fold) */}
      <IntelligenceOverview
        summaries={summaries}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Level 2: Explore Tabs Navigation */}
      <section aria-label="Analytical Exploration" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE5EA] pb-2">
          {/* Segmented Control / Tab Row */}
          <div
            role="tablist"
            aria-label="Intelligence Perspectives"
            className="inline-flex p-1 rounded-[8px] bg-[#F6F8F9] border border-[#DCE5EA]"
          >
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-[6px] text-[13px] font-medium transition-all focus:outline-hidden focus:ring-2 focus:ring-[#0B7780] ${
                    isSelected
                      ? 'bg-white text-[#182B3D] shadow-xs font-semibold'
                      : 'text-[#526679] hover:text-[#182B3D] hover:bg-[#EEF2F4]'
                  }`}
                >
                  <span className="block leading-snug">{tab.label}</span>
                  <span className="block text-[11px] text-[#637587] font-normal sm:hidden">
                    {tab.question}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Context subtitle matching the active tab */}
          <div className="text-[12.5px] text-[#526679]">
            Exploring:{' '}
            <strong className="text-[#182B3D] font-medium">
              {tabs.find((t) => t.id === activeTab)?.question}
            </strong>
          </div>
        </div>

        {/* Level 2 Active View Panel (Only ONE expanded at a time) */}
        <div
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="focus:outline-hidden"
        >
          {activeTab === 'activity' && (
            <ActivityView
              distribution={distribution}
              periodDisplayName={periodDisplayName}
              movementAnalyses={movementAnalyses}
              onInspectStep={(st) => setEvidenceTarget({ type: 'step', id: st })}
            />
          )}

          {activeTab === 'change' && (
            <ChangeView
              distribution={distribution}
              periodDisplayName={periodDisplayName}
              comparatorDisplayName={comparatorDisplayName}
              movementAnalyses={movementAnalyses}
              coverage={coverage}
              onOpenDrawer={(st) => setEvidenceTarget({ type: 'step', id: st })}
            />
          )}

          {activeTab === 'attention' && (
            <AttentionView
              signals={signals}
              distribution={distribution}
              comparatorDisplayName={comparatorDisplayName}
              movementAnalyses={movementAnalyses}
              onOpenEvidence={(type, id) => setEvidenceTarget({ type, id })}
            />
          )}

          {activeTab === 'confidence' && (
            <ConfidenceView
              distribution={distribution}
              periodDisplayName={periodDisplayName}
              coverage={coverage}
              signals={signals}
            />
          )}
        </div>
      </section>

      {/* Level 3: Drill-down Evidence Drawer */}
      <IntelligenceEvidenceDrawer
        isOpen={evidenceTarget !== null}
        onClose={() => setEvidenceTarget(null)}
        evidenceTarget={evidenceTarget}
        tenant={tenant}
        grantScope={grantScope}
        periodDisplayName={periodDisplayName}
        comparatorDisplayName={comparatorDisplayName}
        distribution={distribution}
        movementAnalyses={movementAnalyses}
        signals={signals}
        coverage={coverage}
      />
    </div>
  );
}
