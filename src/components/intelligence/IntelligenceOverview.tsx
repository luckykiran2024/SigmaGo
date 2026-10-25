"use client";

import React from 'react';
import { ArrowRight, AlertTriangle, CheckCircle, Activity, TrendingUp } from 'lucide-react';
import { OverviewSummaries } from '@/lib/intelligence/analytics/summary';

export type IntelligenceTab = 'activity' | 'change' | 'attention' | 'confidence';

interface IntelligenceOverviewProps {
  summaries: OverviewSummaries;
  activeTab: IntelligenceTab;
  onSelectTab: (tab: IntelligenceTab) => void;
}

export default function IntelligenceOverview({
  summaries,
  activeTab,
  onSelectTab,
}: IntelligenceOverviewProps) {
  const cards: Array<{
    id: IntelligenceTab;
    question: string;
    primaryText: string;
    subText: string;
    actionLabel: string;
    hasAlert?: boolean;
    icon: React.ReactNode;
  }> = [
    {
      id: 'activity',
      question: 'What is happening?',
      primaryText: summaries.activity.primaryText,
      subText: summaries.activity.subText,
      actionLabel: summaries.activity.actionLabel,
      icon: <Activity className="w-4 h-4 text-[#0B7780]" aria-hidden="true" />,
    },
    {
      id: 'change',
      question: 'What changed?',
      primaryText: summaries.change.primaryText,
      subText: summaries.change.subText,
      actionLabel: summaries.change.actionLabel,
      icon: <TrendingUp className="w-4 h-4 text-[#17324D]" aria-hidden="true" />,
    },
    {
      id: 'attention',
      question: 'Where should I look?',
      primaryText: summaries.attention.primaryText,
      subText: summaries.attention.subText,
      actionLabel: summaries.attention.actionLabel,
      hasAlert: summaries.attention.hasAlerts,
      icon: summaries.attention.hasAlerts ? (
        <AlertTriangle className="w-4 h-4 text-[#B54708]" aria-hidden="true" />
      ) : (
        <CheckCircle className="w-4 h-4 text-[#0F7548]" aria-hidden="true" />
      ),
    },
    {
      id: 'confidence',
      question: 'How strong is the evidence?',
      primaryText: summaries.confidence.primaryText,
      subText: summaries.confidence.subText,
      actionLabel: summaries.confidence.actionLabel,
      icon: <CheckCircle className="w-4 h-4 text-[#0F7548]" aria-hidden="true" />,
    },
  ];

  return (
    <section aria-label="Overview Summaries (At a glance)" className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#637587] uppercase">
        <span>Executive Briefing · At a glance</span>
        <span>4 Core Dimensions</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map((card) => {
          const isActive = activeTab === card.id;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectTab(card.id)}
              aria-selected={isActive}
              aria-label={`${card.question}: ${card.primaryText}. ${card.subText}. Click to view details.`}
              className={`text-left p-4 rounded-[8px] border transition-all flex flex-col justify-between h-full group focus:outline-hidden focus:ring-2 focus:ring-[#0B7780] focus:ring-offset-1 ${
                isActive
                  ? 'bg-white border-[#0B7780] shadow-xs'
                  : 'bg-white border-[#DCE5EA] hover:border-[#637587] hover:bg-[#FDFEFE]'
              }`}
            >
              <div>
                {/* Question Label */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-[#526679]">
                    {card.question}
                  </span>
                  {card.icon}
                </div>

                {/* Primary Answer */}
                <div className="mt-2.5">
                  <p className="text-[17px] font-semibold text-[#182B3D] leading-snug tracking-tight">
                    {card.primaryText}
                  </p>
                  <p className="text-[12.5px] text-[#526679] mt-1 leading-normal">
                    {card.subText}
                  </p>
                </div>
              </div>

              {/* Action link */}
              <div className="mt-3 pt-2.5 border-t border-[#EAF0F2] flex items-center justify-between text-[12px] font-medium">
                <span className={isActive ? 'text-[#17324D]' : 'text-[#096A72] group-hover:text-[#17324D]'}>
                  {card.actionLabel}
                </span>
                <ArrowRight
                  className={`w-3.5 h-3.5 transition-transform ${
                    isActive ? 'text-[#17324D] translate-x-0.5' : 'text-[#096A72] group-hover:translate-x-0.5'
                  }`}
                  aria-hidden="true"
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
