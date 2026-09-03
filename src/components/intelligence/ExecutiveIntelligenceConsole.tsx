"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  Layers,
  ArrowRight,
  Info,
  X,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Lock,
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
}: ExecutiveIntelligenceConsoleProps) {
  const [activeStepDrawer, setActiveStepDrawer] = useState<StepType | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<IntelligenceSignal | null>(null);

  const stepsList: StepType[] = ['STRUCTURAL', 'TRANSACTIONAL', 'EXCEPTION', 'PROCESS'];

  const stepMeta: Record<StepType, { label: string; desc: string; icon: any; color: string }> = {
    STRUCTURAL: {
      label: 'Structural',
      desc: 'Foundational charters, boundaries & org level standards',
      icon: Layers,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
    TRANSACTIONAL: {
      label: 'Transactional',
      desc: 'Day-to-day governed operational requests & approvals',
      icon: FileText,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    EXCEPTION: {
      label: 'Exception',
      desc: 'Approved boundary bypasses & policy variations',
      icon: ShieldAlert,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    PROCESS: {
      label: 'Process',
      desc: 'Governing operating procedures, rules & evaluation criteria',
      icon: ShieldCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
  };

  const activeAnalysis = activeStepDrawer ? movementAnalyses[activeStepDrawer] : null;

  return (
    <div className="space-y-8 font-sans">
      {/* Admin Notice Banner */}
      {isAdmin && (
        <div className="p-4 rounded-2xl bg-[#E8EDF4] border border-[#D3DEEB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#274C77] font-semibold">
            <Lock className="w-4 h-4 shrink-0 text-[#274C77]" />
            <span>Admin Console: Manage recipient access grants and issue explicit intelligence permissions.</span>
          </div>
          <Link
            href={`/${tenant}/admin/intelligence`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#274C77] hover:bg-[#1E3C60] text-white font-bold transition shrink-0"
          >
            <span>Manage Access Grants Register →</span>
          </Link>
        </div>
      )}

      {/* Header & Comparison Context Controls */}
      <div className="bg-white border border-[#E4E7EC] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#F2F4F7] pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#274C77]">
              <BarChart3 className="w-4 h-4" />
              <span>Executive Organisational Intelligence</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#101828] tracking-tight mt-1">
              Decision Dynamics & Governance Health
            </h1>
            <p className="text-xs text-[#667085] mt-0.5">
              Decoupled Access for <span className="font-mono text-[#274C77] font-bold">{userEmail}</span> • Scope: <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8EDF4] text-[#274C77] uppercase">{grantScope}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F9FAFB] border border-[#E4E7EC] text-[#344054]">
              Period: <strong className="text-[#101828]">{periodDisplayName}</strong>
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 border border-blue-200 text-[#274C77]">
              Baseline: <strong className="text-[#101828]">{comparatorDisplayName} (Same Period Last Year)</strong>
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Reliable Data Coverage (98%)</span>
            </span>
          </div>
        </div>

        {/* What Changed? Interactive Movement Chips */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
            What Changed? (Click any movement factor to inspect contributors)
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {stepsList.map((st) => {
              const item = distribution.steps[st];
              const isUp = item.movementPp > 0;
              const isZero = item.movementPp === 0;
              return (
                <button
                  key={st}
                  onClick={() => setActiveStepDrawer(st)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition hover:shadow-xs cursor-pointer ${
                    isZero
                      ? 'bg-[#F9FAFB] border-[#E4E7EC] text-[#344054]'
                      : isUp
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100/70'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/70'
                  }`}
                >
                  <span className="uppercase text-[10px] tracking-wide text-[#667085]">{stepMeta[st].label}:</span>
                  <span>{item.movementLabel}</span>
                  {isUp && <TrendingUp className="w-3.5 h-3.5 text-amber-600" />}
                  {!isUp && !isZero && <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />}
                  <ArrowRight className="w-3 h-3 text-[#98A2B3] ml-1" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4 Clickable STEP Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stepsList.map((st) => {
          const item = distribution.steps[st];
          const meta = stepMeta[st];
          const Icon = meta.icon;
          const isUp = item.movementPp > 0;
          return (
            <div
              key={st}
              onClick={() => setActiveStepDrawer(st)}
              className="bg-white border border-[#E4E7EC] hover:border-[#274C77] rounded-2xl p-5 shadow-xs transition hover:shadow-md cursor-pointer group space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#667085] flex items-center gap-1.5">
                  <Icon className="w-4 h-4 text-[#274C77]" />
                  {meta.label}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  item.status === 'NORMAL' ? 'bg-[#F2F4F7] text-[#344054]' : 'bg-amber-100 text-amber-800'
                }`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#101828]">
                    {(item.currentShare * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs font-medium text-[#667085]">
                    ({item.currentCount} decisions)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold">
                  <span className="text-[#667085]">vs. baseline:</span>
                  <span className={isUp ? 'text-amber-700' : 'text-emerald-700'}>
                    {item.movementLabel}
                  </span>
                  <span className="text-[10px] text-[#98A2B3]">
                    (prior year: {(item.comparatorShare * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F2F4F7] flex items-center justify-between text-[11px] text-[#274C77] font-semibold group-hover:underline">
                <span>Inspect Movement Breakdown</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* What Needs Attention? 4-Layer Fact/Pattern/Interpretation/Recommendation Signals */}
      <div className="bg-white border border-[#E4E7EC] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#F2F4F7] pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              What Needs Attention? (Ranked Signals)
            </h2>
          </div>
          <span className="text-xs text-[#667085]">
            Transparent evidence • Human-led review
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {signals.map((sig) => (
            <div
              key={sig.id}
              className="p-4 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] hover:bg-white hover:border-[#274C77] transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#101828] flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${sig.impact === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  {sig.title}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8EDF4] text-[#274C77] uppercase">
                  {sig.confidence} CONFIDENCE
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-[#344054]">
                <div>
                  <strong className="text-[#101828]">FACT:</strong> {sig.fact}
                </div>
                <div>
                  <strong className="text-[#101828]">PATTERN:</strong> {sig.pattern}
                </div>
                <div className="text-[#475467]">
                  <strong className="text-[#101828]">INTERPRETATION:</strong> {sig.interpretation}
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-900 font-medium">
                  <strong>RECOMMENDATION:</strong> {sig.recommendation}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Records Audit Trail & Blast Radius Drill-Through Table */}
      <div className="bg-white border border-[#E4E7EC] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#F2F4F7] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#274C77]" />
            <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Organizational Decisions & Governance Audit Trail
            </h2>
          </div>
          <span className="text-xs text-[#667085]">
            Showing recent sealed and in-flight activity
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#344054]">
            <thead className="bg-[#F9FAFB] text-[#667085] font-bold uppercase text-[10px] tracking-wider border-b border-[#E4E7EC]">
              <tr>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Decision Subject</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4 text-center">Blast Radius</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              {(sealedDecisions || []).map((item: any) => (
                <tr key={item.id} className="hover:bg-[#F9FAFB] transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#274C77]">
                    {item.ref}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#101828]">
                    {item.subject}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F2F4F7] text-[#344054] uppercase">
                      {item.categories?.domain || 'GENERAL'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#E8EDF4] text-[#274C77]">
                      {item.blast_at_seal ?? 0} descendants
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {grantScope === 'FULL' ? (
                      <Link
                        href={`/${tenant}/requests/${item.id}`}
                        className="text-[11px] font-bold text-[#274C77] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Drill Through</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-[10px] font-medium text-[#98A2B3]">Aggregated Only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STEP Movement Factor Drawer / Modal */}
      {activeStepDrawer && activeAnalysis && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8EDF4] text-[#274C77] uppercase">
                    STEP Movement Analysis
                  </span>
                  <span className="text-xs text-[#667085]">
                    {periodDisplayName} vs. {comparatorDisplayName}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-[#101828] mt-1">
                  {stepMeta[activeStepDrawer].label} Movement: {activeAnalysis.movementPp > 0 ? '+' : ''}{activeAnalysis.movementPp.toFixed(1)} percentage points
                </h2>
              </div>
              <button
                onClick={() => setActiveStepDrawer(null)}
                className="p-1.5 rounded-lg text-[#667085] hover:bg-[#F2F4F7] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reconciliation Explanation */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-[#274C77] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                <span>Exact Mathematical Contributor Reconciliation</span>
              </div>
              <p>
                The sum of workflow contributions below reconciles mathematically to the exact <strong>{activeAnalysis.reconciledMovementPp > 0 ? '+' : ''}{activeAnalysis.reconciledMovementPp.toFixed(1)} pp</strong> movement displayed on the {activeStepDrawer} tile.
              </p>
            </div>

            {/* Contributor Workflows Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#101828]">
                A. Exact Workflow Contributors to Movement
              </h3>
              <div className="overflow-x-auto border border-[#E4E7EC] rounded-xl">
                <table className="w-full text-left text-xs text-[#344054]">
                  <thead className="bg-[#F9FAFB] text-[#667085] font-bold uppercase text-[10px] tracking-wider border-b border-[#E4E7EC]">
                    <tr>
                      <th className="py-2.5 px-3">Workflow Name</th>
                      <th className="py-2.5 px-3">Domain</th>
                      <th className="py-2.5 px-3 text-center">Current</th>
                      <th className="py-2.5 px-3 text-center">Baseline</th>
                      <th className="py-2.5 px-3 text-right">Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7]">
                    {activeAnalysis.contributors.map((c) => (
                      <tr key={c.workflowId} className="hover:bg-[#F9FAFB]">
                        <td className="py-2.5 px-3 font-semibold text-[#101828]">
                          {c.workflowName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F2F4F7] text-[#344054] uppercase">
                            {c.domain}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {c.currentCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[#667085]">
                          {c.baselineCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          <span className={c.movementContributionPp > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                            {c.movementContributionPp > 0 ? '+' : ''}{c.movementContributionPp.toFixed(1)} pp
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Consequential Decisions */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#101828]">
                B. Top Consequential Decisions Shaping This Movement
              </h3>
              <p className="text-[11px] text-[#667085]">
                Ranked by organizational footprint, downstream reliance, and exception pressure (distinct from unit count contribution).
              </p>
              <div className="overflow-x-auto border border-[#E4E7EC] rounded-xl">
                <table className="w-full text-left text-xs text-[#344054]">
                  <thead className="bg-[#F9FAFB] text-[#667085] font-bold uppercase text-[10px] tracking-wider border-b border-[#E4E7EC]">
                    <tr>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3">Decision Subject</th>
                      <th className="py-2.5 px-3 text-center">Blast Radius</th>
                      <th className="py-2.5 px-3 text-center">Classification</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7]">
                    {activeAnalysis.topConsequentialDecisions.map((d) => (
                      <tr key={d.requestId} className="hover:bg-[#F9FAFB]">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#274C77]">
                          {d.ref}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#101828]">
                          {d.subject}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8EDF4] text-[#274C77]">
                            {d.transitiveDescendants} descendants
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {d.classification.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/${tenant}/requests/${d.requestId}`}
                            className="font-bold text-[#274C77] hover:underline"
                          >
                            Inspect →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveStepDrawer(null)}
                className="px-4 py-2 rounded-xl bg-[#274C77] text-white text-xs font-bold hover:bg-[#1E3C60] transition"
              >
                Close Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
