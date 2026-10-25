"use client";

import React from 'react';
import { AlertTriangle, Eye, CheckCircle2, ArrowRight } from 'lucide-react';
import { IntelligenceSignal } from '@/lib/intelligence/analytics/signals';
import { StepType, StepDistributionResult } from '@/lib/intelligence/analytics/distributions';
import { StepMovementAnalysis } from '@/lib/intelligence/analytics/contributors';
import { getStepStatus } from '@/lib/intelligence/analytics/status';

interface AttentionViewProps {
  signals: IntelligenceSignal[];
  distribution: StepDistributionResult;
  comparatorDisplayName: string;
  movementAnalyses: Record<StepType, StepMovementAnalysis>;
  onOpenEvidence: (type: 'signal' | 'step', id: string) => void;
}

export default function AttentionView({
  signals,
  distribution,
  comparatorDisplayName,
  movementAnalyses,
  onOpenEvidence,
}: AttentionViewProps) {
  // Find STEP types that have Watch or Attention status
  const stepsList: StepType[] = ['EXCEPTION', 'STRUCTURAL', 'TRANSACTIONAL', 'PROCESS'];
  const stepAlerts = stepsList
    .map((st) => {
      const item = distribution.steps[st];
      const statusInfo = getStepStatus(st, item, distribution.totalComparatorDecisions, comparatorDisplayName);
      return {
        stepType: st,
        statusInfo,
        item,
      };
    })
    .filter((s) => s.statusInfo.label === 'Attention' || s.statusInfo.label === 'Watch');

  // Filter signals: only HIGH or MEDIUM impact or EXCEPTION_PRESSURE
  const qualifiedSignals = (signals || []).filter(
    (sig) => sig.impact === 'HIGH' || sig.impact === 'MEDIUM' || sig.signalType === 'EXCEPTION_PRESSURE'
  );

  // Combine and sort by impact semantics (HIGH / Attention first, then MEDIUM / Watch, then confidence)
  const confidenceWeight = {
    INSTITUTIONAL: 5,
    STRONG: 4,
    RELIABLE: 3,
    DEVELOPING: 2,
    EMERGING: 1,
  };

  const sortedSignals = [...qualifiedSignals].sort((a, b) => {
    const impactA = a.impact === 'HIGH' ? 2 : 1;
    const impactB = b.impact === 'HIGH' ? 2 : 1;
    if (impactB !== impactA) return impactB - impactA;
    return (confidenceWeight[b.confidence] || 0) - (confidenceWeight[a.confidence] || 0);
  });

  const totalAttentionItems = sortedSignals.length + stepAlerts.length;

  // Empty state: Nothing requires attention right now
  if (totalAttentionItems === 0) {
    return (
      <div className="p-8 rounded-[8px] bg-white border border-[#DCE5EA] text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-[#ECFDF3] text-[#027A48] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-[16px] font-semibold text-[#182B3D]">
            Nothing requires attention right now
          </h3>
          <p className="text-[13px] text-[#526679] max-w-md mx-auto leading-relaxed">
            Current decision behaviour is broadly consistent with the observed historical range. No policies are under elevated exception pressure.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Note */}
      <div className="flex items-baseline justify-between border-b border-[#DCE5EA] pb-3">
        <div>
          <h3 className="text-[15px] font-semibold text-[#182B3D]">
            Areas Warranting Review
          </h3>
          <p className="text-[12.5px] text-[#526679] mt-0.5">
            Displaying only policies and decision streams currently outside normal historical thresholds.
          </p>
        </div>
        <span className="text-[12px] text-[#637587]">
          {totalAttentionItems} item{totalAttentionItems === 1 ? '' : 's'} identified
        </span>
      </div>

      {/* Ranked Attention Items List */}
      <div className="space-y-3">
        {/* Step-Level Alerts (e.g. Exception Attention/Watch) */}
        {stepAlerts.map(({ stepType, statusInfo, item }) => {
          const isAttention = statusInfo.label === 'Attention';
          const topAnalysis = movementAnalyses[stepType];
          const topConsequential = topAnalysis?.topConsequentialDecisions?.[0];
          const downstreamCount = topConsequential?.transitiveDescendants ?? 0;

          return (
            <div
              key={`step-alert-${stepType}`}
              className={`p-4 rounded-[8px] bg-white border transition-colors ${
                isAttention ? 'border-[#FECDCA] shadow-xs' : 'border-[#DCE5EA]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-[4px] text-[11.5px] font-medium flex items-center gap-1 ${
                      isAttention
                        ? 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]'
                        : 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]'
                    }`}
                  >
                    {isAttention ? (
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{statusInfo.label}</span>
                  </span>
                  <h4 className="text-[14.5px] font-semibold text-[#182B3D]">
                    {stepType === 'EXCEPTION' ? 'Exception Decisions' : `${stepType} Decisions`}
                  </h4>
                </div>

                <div className="flex items-center gap-3 text-[12px] text-[#637587]">
                  <span>Impact: <strong className="text-[#182B3D] font-medium">{isAttention ? 'High' : 'Moderate'}</strong></span>
                  {downstreamCount > 0 && (
                    <span>
                      Downstream reliance: <strong className="text-[#182B3D] font-medium">{downstreamCount} related decisions</strong>
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[13px] text-[#526679] mt-2 leading-relaxed">
                Exception activity is above the comparable historical range ({item.movementPp > 0 ? '+' : ''}{item.movementPp.toFixed(1)} pp vs {comparatorDisplayName}). This area warrants review to determine whether operating boundaries should be updated.
              </p>

              <div className="mt-3 pt-2.5 border-t border-[#EAF0F2] flex items-center justify-between text-[12px]">
                <span className="text-[#637587]">
                  Evidence: {item.currentCount} current decisions · {statusInfo.desc}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenEvidence('step', stepType)}
                  className="text-[12px] font-medium text-[#096A72] hover:text-[#17324D] inline-flex items-center gap-1"
                >
                  <span>View evidence</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Signals (e.g. Policy Exception Pressure) */}
        {sortedSignals.map((sig) => {
          const isHigh = sig.impact === 'HIGH';
          const statusLabel = isHigh ? 'Attention' : 'Watch';

          return (
            <div
              key={sig.id}
              className={`p-4 rounded-[8px] bg-white border transition-colors ${
                isHigh ? 'border-[#FECDCA] shadow-xs' : 'border-[#DCE5EA]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-[4px] text-[11.5px] font-medium flex items-center gap-1 ${
                      isHigh
                        ? 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]'
                        : 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]'
                    }`}
                  >
                    {isHigh ? (
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{statusLabel}</span>
                  </span>
                  <h4 className="text-[14.5px] font-semibold text-[#182B3D]">
                    {sig.title.replace('Rising Exception Pressure on ', '')}
                  </h4>
                </div>

                <div className="flex items-center gap-3 text-[12px] text-[#637587]">
                  <span>Impact: <strong className="text-[#182B3D] font-medium">{isHigh ? 'High' : 'Moderate'}</strong></span>
                  <span>Evidence strength: <strong className="text-[#182B3D] font-medium capitalize">{sig.confidence.toLowerCase()}</strong></span>
                </div>
              </div>

              <div className="mt-2 text-[13px] text-[#526679] space-y-1 leading-relaxed">
                <p>
                  This policy is experiencing higher exception pressure. {sig.fact}
                </p>
                <p className="text-[12.5px] text-[#637587]">
                  {sig.pattern}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#EAF0F2] flex items-center justify-between text-[12px]">
                <span className="text-[#637587]">
                  Observed samples: {sig.confidenceBasis?.sampleSize || 0} current and {sig.confidenceBasis?.baselineSampleSize || 0} comparator decisions · {sig.confidenceBasis?.comparablePeriodsCount || 0} comparable period(s)
                </span>
                <button
                  type="button"
                  onClick={() => onOpenEvidence('signal', sig.id)}
                  className="text-[12px] font-medium text-[#096A72] hover:text-[#17324D] inline-flex items-center gap-1"
                >
                  <span>View evidence</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
