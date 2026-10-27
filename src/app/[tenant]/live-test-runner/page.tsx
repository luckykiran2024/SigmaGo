"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Play, RotateCcw, CheckCircle2, AlertCircle, Clock, ShieldCheck, 
  ExternalLink, Layers, Cpu, FileCheck, ArrowRight, Activity, Database
} from 'lucide-react';
import { SCENARIOS_100, ScenarioDefinition } from '@/lib/testing/scenarios100';

interface ScenarioResult {
  id: number;
  ref: string;
  subject: string;
  type: 'STRUCTURAL' | 'PROCESS' | 'EXCEPTION' | 'TRANSACTIONAL';
  dept: string;
  amount: string;
  requesterEmail: string;
  approverEmail: string;
  status: 'approved' | 'rejected' | 'pending';
  checksum: string;
  fullChecksum?: string;
  requestId: string;
  durationMs: number;
}

export default function LiveTestRunnerPage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params.tenant;
  const [isRunning, setIsRunning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [completedResults, setCompletedResults] = useState<ScenarioResult[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState<number>(-1);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to generate isolated QA fixtures.');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as new scenarios execute
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [completedResults.length]);

  const handleReset = async () => {
    setIsResetting(true);
    setStatusMessage('Purging synthetic QA fixtures only...');
    try {
      const res = await fetch('/api/live-test-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', tenant, confirmation: 'PURGE_SYNTHETIC_QA_DATA' })
      });
      const data = await res.json();
      if (data.success) {
        setCompletedResults([]);
        setCurrentScenarioIndex(-1);
        setStatusMessage('Synthetic QA fixtures purged. Ready to generate 100 isolated QA scenarios.');
      } else {
        setStatusMessage(`Reset error: ${data.error}`);
      }
    } catch (e: any) {
      setStatusMessage(`Network error: ${e.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const runAllScenariosLive = async () => {
    setIsRunning(true);
    setCompletedResults([]);
    setStatusMessage('Beginning live sequential execution of 100 enterprise scenarios...');

    // First purge fresh
    try {
      setStatusMessage('Purging synthetic fixtures for a fresh QA dataset...');
      await fetch('/api/live-test-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', tenant, confirmation: 'PURGE_SYNTHETIC_QA_DATA' })
      });
    } catch (err) {
      console.warn('Reset error before run, continuing...', err);
    }

    const total = SCENARIOS_100.length;
    const accumulated: ScenarioResult[] = [];

    for (let i = 0; i < total; i++) {
      const s = SCENARIOS_100[i];
      setCurrentScenarioIndex(i);
      setStatusMessage(`Testing Scenario ${i + 1}/${total}: [${s.ref}] ${s.subject.substring(0, 40)}... (${s.type})`);

      try {
        const res = await fetch('/api/live-test-runner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'execute-scenario',
            scenarioId: s.id,
            tenant
          })
        });

        const data = await res.json();
        if (data.success && data.result) {
          accumulated.push(data.result);
          setCompletedResults([...accumulated]);
        }
      } catch (err: any) {
        console.error(`Failed scenario ${s.id}:`, err);
      }

      // Small delay between scenarios for smooth visual observation on screen
      await new Promise(r => setTimeout(r, 60));
    }

    setCurrentScenarioIndex(-1);
    setIsRunning(false);
    setStatusMessage(`Generated ${total} synthetic QA scenarios. These fixtures are intentionally unsealed and are not end-to-end approvals.`);
  };

  const progressPercent = Math.round((completedResults.length / 100) * 100);

  const structuralCount = completedResults.filter(r => r.type === 'STRUCTURAL').length;
  const processCount = completedResults.filter(r => r.type === 'PROCESS').length;
  const exceptionCount = completedResults.filter(r => r.type === 'EXCEPTION').length;
  const transactionalCount = completedResults.filter(r => r.type === 'TRANSACTIONAL').length;

  const approvedCount = completedResults.filter(r => r.status === 'approved').length;
  const rejectedCount = completedResults.filter(r => r.status === 'rejected').length;
  const pendingCount = completedResults.filter(r => r.status === 'pending').length;

  const filteredResults = filterType === 'ALL' 
    ? completedResults 
    : completedResults.filter(r => r.type === filterType);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              E2E Test Engine
            </span>
            <span className="text-xs text-slate-400">Meridian Corp (Production Mirror)</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="h-7 w-7 text-indigo-400" />
            100 Enterprise Scenarios Live Functional Test Suite
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Live multi-persona validation spanning Structural (20), Process (20), Exception (30), and Transactional (30) governance paths.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={isRunning || isResetting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition disabled:opacity-50 border border-slate-700"
          >
            <RotateCcw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? 'Purging Old Data...' : 'Purge Old Data'}
          </button>

          <button
            onClick={runAllScenariosLive}
            disabled={isRunning || isResetting}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            <Play className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
            {isRunning ? `Testing Scenario ${currentScenarioIndex + 1}/100...` : 'Execute All 100 Scenarios Live'}
          </button>
        </div>
      </div>

      {/* Progress Bar & Status Line */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex justify-between items-center text-sm font-medium">
          <span className="text-slate-300 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isRunning ? 'bg-indigo-400 animate-ping' : progressPercent === 100 ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            {statusMessage}
          </span>
          <span className="text-indigo-400 font-mono font-bold text-base">
            {completedResults.length} / 100 Scenarios ({progressPercent}%)
          </span>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-3 rounded-full transition-all duration-150 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Metric Counters Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Structural</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{structuralCount} <span className="text-xs text-slate-500 font-normal">/ 20</span></div>
          <div className="text-xs text-slate-400 mt-1">M&A, Entity, Bylaws</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Process</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{processCount} <span className="text-xs text-slate-500 font-normal">/ 20</span></div>
          <div className="text-xs text-slate-400 mt-1">SOC2, SOX, Audits</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Exception</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{exceptionCount} <span className="text-xs text-slate-500 font-normal">/ 30</span></div>
          <div className="text-xs text-slate-400 mt-1">Overrides & Variances</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transactional</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{transactionalCount} <span className="text-xs text-slate-500 font-normal">/ 30</span></div>
          <div className="text-xs text-slate-400 mt-1">SaaS & Infrastructure</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">QA Evidence</div>
          <div className="text-2xl font-bold text-teal-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="h-5 w-5 text-teal-400" />
            {approvedCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">Synthetic QA Fixtures</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Guard Rejections</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{rejectedCount}</div>
          <div className="text-xs text-slate-400 mt-1">Policy Ceiling Enforced</div>
        </div>
      </div>

      {/* Navigation Shortcuts */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 mr-1">Filter View:</span>
          {['ALL', 'STRUCTURAL', 'PROCESS', 'EXCEPTION', 'TRANSACTIONAL'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filterType === type 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/meridian/decisions"
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
          >
            <span>Open Decision Vault</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <span className="text-slate-700">|</span>
          <Link
            href="/meridian/intelligence"
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition"
          >
            <span>Executive Intelligence Console</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Live Stream Table / Cards */}
      <div 
        ref={scrollContainerRef}
        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-h-[580px] overflow-y-auto"
      >
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-5 py-3 grid grid-cols-12 text-xs font-semibold text-slate-400 uppercase tracking-wider z-10">
          <div className="col-span-1"># Ref</div>
          <div className="col-span-2">Step Type</div>
          <div className="col-span-4">Subject & Capital Amount</div>
          <div className="col-span-2">Requester / Approver</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Evidence Status</div>
        </div>

        {completedResults.length === 0 ? (
          <div className="text-center py-20 text-slate-500 space-y-3">
            <Cpu className="h-10 w-10 mx-auto text-slate-600 animate-pulse" />
            <p className="text-sm">Generate all 100 isolated scenarios to validate dashboard calculations. Run end-to-end workflow tests separately.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredResults.map((r) => {
              const typeColor = 
                r.type === 'STRUCTURAL' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                r.type === 'PROCESS' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                r.type === 'EXCEPTION' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

              const statusColor = 
                r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                r.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                'bg-amber-500/10 text-amber-400 border-amber-500/30';

              return (
                <div 
                  key={r.id} 
                  className="px-5 py-3.5 grid grid-cols-12 items-center text-xs hover:bg-slate-800/40 transition font-sans"
                >
                  {/* Ref & ID */}
                  <div className="col-span-1 font-mono font-medium text-slate-300">
                    <span className="text-slate-500 text-[10px] mr-1">#{r.id}</span>
                    {r.ref}
                  </div>

                  {/* Step Type Pill */}
                  <div className="col-span-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${typeColor}`}>
                      {r.type}
                    </span>
                    <span className="ml-1.5 text-slate-400 text-[11px] font-medium">{r.dept}</span>
                  </div>

                  {/* Subject & Amount */}
                  <div className="col-span-4 pr-3">
                    <div className="text-slate-200 font-medium truncate">{r.subject}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5 font-mono">{r.amount}</div>
                  </div>

                  {/* Personas */}
                  <div className="col-span-2">
                    <div className="text-slate-300 truncate text-[11px]">{r.requesterEmail.split('@')[0]}</div>
                    <div className="text-slate-500 text-[10px] flex items-center gap-1 mt-0.5 truncate">
                      <span>↳ apprv:</span>
                      <span className="text-slate-400">{r.approverEmail.split('@')[0]}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="col-span-1">
                    <span className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold border ${statusColor}`}>
                      {r.status}
                    </span>
                  </div>

                  {/* Checksum & Certificate Link */}
                  <div className="col-span-2 text-right">
                    {r.status === 'approved' ? (
                      <Link 
                        href={`/meridian/records/${r.requestId}`}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-teal-400 hover:text-teal-300 transition"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                        <span className="truncate max-w-[100px]">{r.checksum}</span>
                      </Link>
                    ) : (
                      <span className="text-slate-600 text-[11px] font-mono">Unsealed</span>
                    )}
                    <span className="ml-2 text-slate-500 text-[10px] font-mono">({r.durationMs}ms)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

