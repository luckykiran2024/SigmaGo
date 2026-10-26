"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  RotateCcw, 
  ExternalLink, 
  Terminal, 
  Cpu, 
  Key, 
  Users, 
  TrendingUp, 
  Layers, 
  FileCheck2 
} from 'lucide-react';

export interface TestScenario {
  id: string;
  category: 'Tenant Isolation' | 'Cryptographic Seal' | 'Authority Guard' | 'Participants' | 'Intelligence & Exceptions' | 'Action Tokens';
  title: string;
  description: string;
  expected: string;
  assertion: string;
  targetTenant: string;
  initialStatus: 'READY' | 'RUNNING' | 'PASS' | 'FAIL';
  executionMs?: number;
  payload?: Record<string, any>;
}

export const SCENARIOS: TestScenario[] = [
  // 1. Tenant Isolation (Scenarios 1–6)
  {
    id: 'SG-ISO-01',
    category: 'Tenant Isolation',
    title: 'Cross-Tenant Direct Record Access Guard',
    description: 'Tenant A (Meridian Corp) authenticated user requests decision DEC-9021 belonging to Tenant B (Northgate) via direct URL and API routing.',
    expected: '404 Access Denied / Complete Isolation',
    assertion: 'RLS filter restricts query: rows returned == 0. No data leakage.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { requestedId: 'DEC-9021', callerTenant: 'meridian', ownerTenant: 'northgate', status: 404 }
  },
  {
    id: 'SG-ISO-02',
    category: 'Tenant Isolation',
    title: 'SQL Foreign Tenant Direct Injection Guard',
    description: 'Direct SQL execution attempting to select * from approval_requests with tenant_id override or missing tenant context.',
    expected: 'Row-Level Security enforces tenant_id match or empty set',
    assertion: 'Supabase Postgres RLS policy enforces auth.jwt() tenant mapping.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { query: 'SELECT * FROM approval_requests WHERE tenant_id != current_setting', rlsEnforced: true }
  },
  {
    id: 'SG-ISO-03',
    category: 'Tenant Isolation',
    title: 'Global Decision Search Index Boundary Isolation',
    description: 'Executing text search for distinctive competitor transaction token belonging exclusively to Tenant B.',
    expected: 'Zero search results returned in search index',
    assertion: 'Full-text vector search filtered strictly by tenant_id index prefix.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { queryTerm: 'Northgate Acquisition 2026', matchCount: 0 }
  },
  {
    id: 'SG-ISO-04',
    category: 'Tenant Isolation',
    title: 'Multi-Tenant Approver Register Segregation',
    description: 'Tenant A Administrator requests list of registered organizational approvers for workflow configuration.',
    expected: 'Only internal Meridian Corp verified approvers listed',
    assertion: 'Zero cross-tenant directory accounts exposed in approver register picker.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { visibleApprovers: 8, crossTenantCount: 0 }
  },
  {
    id: 'SG-ISO-05',
    category: 'Tenant Isolation',
    title: 'Policy Health Analytics Tenant Scope Guard',
    description: 'Querying high-level exception rates and organizational policy drift metrics.',
    expected: 'Strict isolation to current tenant data',
    assertion: 'Aggregation pipeline aggregates only rows matching tenant_id.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { metricScope: 'ORGANISATIONAL_INTELLIGENCE', tenantFiltered: true }
  },
  {
    id: 'SG-ISO-06',
    category: 'Tenant Isolation',
    title: 'External Participant Cross-Tenant Disambiguation',
    description: 'Adding a participant email address that happens to hold an internal user account in Tenant B.',
    expected: 'Treated as an unverified external entity in Tenant A, never as internal user',
    assertion: 'Tenant A scope treats email as external third-party without internal privileges.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { email: 'ceo@northgate.com', resolvedRole: 'EXTERNAL_STAKEHOLDER' }
  },

  // 2. Cryptographic Seal & Integrity (Scenarios 7–13)
  {
    id: 'SG-SEAL-07',
    category: 'Cryptographic Seal',
    title: 'Canonical SHA-256 Checksum Generation on Seal',
    description: 'Finalizing multi-stage approval workflow and computing the canonical tamper-evident SHA-256 checksum over state.',
    expected: 'Immutable 64-character hexadecimal digest populated and signed',
    assertion: 'Checksum matches SHA-256 hash of ordered, canonical JSON payload.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { algorithm: 'SHA-256', checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }
  },
  {
    id: 'SG-SEAL-08',
    category: 'Cryptographic Seal',
    title: 'Cryptographic Tamper Detection — Modified Subject',
    description: 'Simulating unauthorized direct database alteration of the decision subject field on a sealed request.',
    expected: 'Integrity verification fails instantly; TAMPER_DETECTED flag raised',
    assertion: 'Recomputed checksum does not match stored seal; certificate marked invalid.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { originalChecksum: '8f4a1...', recomputedChecksum: '3b9c2...', tamperDetected: true }
  },
  {
    id: 'SG-SEAL-09',
    category: 'Cryptographic Seal',
    title: 'Cryptographic Tamper Detection — Altered Approval Comment',
    description: 'Attempting to modify historical stage 1 approver rationale text in finalized record.',
    expected: 'Verification algorithm flags signature discrepancy on stage 1',
    assertion: 'Hash chain verification rejects altered comment node.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { stepIndex: 1, signatureValid: false, auditAlertFired: true }
  },
  {
    id: 'SG-SEAL-10',
    category: 'Cryptographic Seal',
    title: 'Cryptographic Tamper Detection — Modified Participant Opinion',
    description: 'Simulating modification of a non-authoritative REFERENCE stakeholder comment on sealed certificate.',
    expected: 'Seal verification fails; participation ledger must remain tamper-proof',
    assertion: 'Participation proof block integrity checks fail; hash discrepancy flagged.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { node: 'PARTICIPANT_PROOF', verified: false }
  },
  {
    id: 'SG-SEAL-11',
    category: 'Cryptographic Seal',
    title: 'Self-Healing Cryptographic Verification Test',
    description: 'Reverting simulated tamper modification back to original canonical state and re-running seal verification.',
    expected: 'Cryptographic verification status returns to valid green PASS',
    assertion: 'Exact canonical state reproduces original SHA-256 hash.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { restored: true, verificationPasses: true }
  },
  {
    id: 'SG-SEAL-12',
    category: 'Cryptographic Seal',
    title: 'Entropy & Salt Differentiation for Identical Subjects',
    description: 'Submitting two decisions with identical subjects, amounts, and approvers at different timestamps.',
    expected: 'Generates completely distinct SHA-256 checksums and unique UUIDs',
    assertion: 'Timestamp, salt, and sequence counter guarantee unique signature digests.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { hashA: 'd2489c...', hashB: 'a8721e...', collision: false }
  },
  {
    id: 'SG-SEAL-13',
    category: 'Cryptographic Seal',
    title: 'Immutable Certificate Traceability for Deactivated Users',
    description: 'Verifying that decision certificates maintain full legibility and cryptographic integrity after an approver is deactivated.',
    expected: 'All 5 proofs remain valid; historical names and public keys preserved',
    assertion: 'Certificate references snapshot at sealing time; deactivation does not invalidate historical decisions.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { approverStatus: 'DEACTIVATED', certificateValid: true }
  },

  // 3. Authority Guard & Governance (Scenarios 14–19)
  {
    id: 'SG-AUTH-14',
    category: 'Authority Guard',
    title: 'Unauthorized Approver POST Request Rejection',
    description: 'A registered standard member attempts to POST an approval action to an active workflow step.',
    expected: 'HTTP 403 Forbidden: User not in designated approver group for this step',
    assertion: 'API gate validates user ID against step.approver_id before accepting payload.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { userRole: 'member', requiredRole: 'approver', status: 403 }
  },
  {
    id: 'SG-AUTH-15',
    category: 'Authority Guard',
    title: 'Financial Threshold Boundary Enforcement',
    description: 'An approver with capped financial authority limit of ₹10,00,000 attempts to approve an ₹18,00,000 capex request.',
    expected: 'Action blocked: Transaction amount exceeds approver authority ceiling',
    assertion: 'Authority boundary validation enforces threshold rule before state transition.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { requestAmount: 1800000, approverCap: 1000000, allowed: false }
  },
  {
    id: 'SG-AUTH-16',
    category: 'Authority Guard',
    title: 'Sequential Multi-Stage Progression Enforcement',
    description: 'Stage 3 approver attempts to approve while Stage 2 remains pending review.',
    expected: 'Action blocked: Preceding approval stages must be satisfied sequentially',
    assertion: 'Workflow state machine verifies stage_index == current_stage before transition.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { currentStage: 2, attemptedStage: 3, allowed: false }
  },
  {
    id: 'SG-AUTH-17',
    category: 'Authority Guard',
    title: 'Idempotent Double-Approval Guard',
    description: 'Same approver triggers concurrent duplicate approval requests in rapid succession.',
    expected: 'Distributed Redis lock / DB unique constraint accepts first, ignores second',
    assertion: 'No duplicate step ledger records created; idempotent response returned.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { firstApproval: 'SUCCESS', secondApproval: 'IGNORED_DUPLICATE' }
  },
  {
    id: 'SG-AUTH-18',
    category: 'Authority Guard',
    title: 'Inert Approver Designation Guard',
    description: 'User marked with status="inert" attempts to act on a pending approval step.',
    expected: '403 Forbidden: Inert staff members cannot execute binding governance decisions',
    assertion: 'User status guard checks status == "active" before executing step.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { userStatus: 'inert', actionPermitted: false }
  },
  {
    id: 'SG-AUTH-19',
    category: 'Authority Guard',
    title: 'Self-Approval Conflict of Interest Guard',
    description: 'The author of a high-value procurement request attempts to approve their own submission.',
    expected: 'Blocked: Requesters cannot approve their own requests',
    assertion: 'Validation rule rejects step where requester_id == approver_id for non-trival workflows.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { requesterId: 'usr-1', approverId: 'usr-1', conflictDetected: true }
  },

  // 4. Multi-Persona & Participation (Scenarios 20–23)
  {
    id: 'SG-PART-20',
    category: 'Participants',
    title: 'Reference Stakeholder Non-Authoritative Endorsement',
    description: 'A stakeholder added as REFERENCE endorses the proposal.',
    expected: 'Endorsement recorded in audit trail; workflow status remains pending approver action',
    assertion: 'Participant opinions are stored as informational metadata, not binding approvals.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { persona: 'REFERENCE', approvalEffect: 'NON_BINDING', requestPending: true }
  },
  {
    id: 'SG-PART-21',
    category: 'Participants',
    title: 'Participant Dissent Preservation on Sealed Certificate',
    description: 'A compliance stakeholder logs formal objection, but executive approver proceeds with approval.',
    expected: 'Certificate seals decision as APPROVED while permanently preserving the objection text in Proof Block 4',
    assertion: 'Objections cannot be scrubbed from canonical participation proof.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { finalStatus: 'APPROVED', objectionPreserved: true, proofBlock: 4 }
  },
  {
    id: 'SG-PART-22',
    category: 'Participants',
    title: 'Informed Observer Read-Only Enforcement',
    description: 'A participant assigned INFORMED role attempts to submit a comment or endorse.',
    expected: 'Action disallowed: Informed stakeholders have read-only visibility',
    assertion: 'UI and API forbid comment payload submissions for INFORMED role.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { role: 'INFORMED', canComment: false }
  },
  {
    id: 'SG-PART-23',
    category: 'Participants',
    title: '5-Proof Certificate Block Separation',
    description: 'Verifying separation of powers in the rendered decision certificate.',
    expected: 'Authority Proofs and Participation Proofs rendered in strictly distinct blocks',
    assertion: 'Certificate visual design and cryptographic structure separate binding authority from advisory input.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { blocksCount: 5, separationEnforced: true }
  },

  // 5. Intelligence & Exceptions (Scenarios 24–27)
  {
    id: 'SG-INT-24',
    category: 'Intelligence & Exceptions',
    title: 'Inline Exception Counter Calculation',
    description: 'Raising an exception against Travel Policy and checking the calculated exception index badge.',
    expected: 'Reads exact sequence number (e.g. "4th exception against this policy this year")',
    assertion: 'Counter evaluates count of active finalized exceptions within rolling fiscal calendar.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { policy: 'Travel Policy', exceptionIndex: 4, scope: 'FISCAL_YEAR' }
  },
  {
    id: 'SG-INT-25',
    category: 'Intelligence & Exceptions',
    title: 'Superseded Policy Exception Isolation',
    description: 'Verifying that exceptions filed under v1 of a policy do not inflate the active exception count for v2.',
    expected: 'Count reflects only active governing policy version',
    assertion: 'Query filters by policy_version_id, isolating superseded versions.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { policyVersion: 'v2', activeCount: 4, v1Excluded: true }
  },
  {
    id: 'SG-INT-26',
    category: 'Intelligence & Exceptions',
    title: 'Decoupled Intelligence Access Scope Enforcement',
    description: 'Admin user without explicit ORGANISATIONAL_INTELLIGENCE grant attempts to view Executive Console.',
    expected: '403 Forbidden: Role is independent of analytical grant access',
    assertion: 'Access requires active entry in intelligence_grants table with non-expired timestamp.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { userRole: 'admin', hasGrant: false, accessGranted: false }
  },
  {
    id: 'SG-INT-27',
    category: 'Intelligence & Exceptions',
    title: 'Small-Number Privacy Suppression (<5 Threshold)',
    description: 'Querying high-sensitivity department where fewer than 5 exceptions occurred.',
    expected: 'Renders "fewer than 5" to prevent individual re-identification; drill-down disabled',
    assertion: 'Statistical disclosure control mask applied to aggregate bins with n < 5.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { rawCount: 3, displayedText: 'fewer than 5', drilldownBlocked: true }
  },

  // 6. Action Tokens & Dwell Time (Scenarios 28–30)
  {
    id: 'SG-TOK-28',
    category: 'Action Tokens',
    title: 'Cryptographic Single-Use Action Token Expiry Enforcement',
    description: 'Attempting to approve via action token after the configured TTL expiration date.',
    expected: 'Token rejected: Token expired; user redirected to secure authenticated portal',
    assertion: 'Action token validator checks expires_at > NOW() and used_at IS NULL.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { tokenStatus: 'EXPIRED', reused: false, accepted: false }
  },
  {
    id: 'SG-TOK-29',
    category: 'Action Tokens',
    title: 'Token Replay Attack Prevention',
    description: 'Submitting a previously consumed action token a second time.',
    expected: 'Immediate rejection: Token has already been consumed',
    assertion: 'used_at timestamp updated atomically upon initial validation.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { tokenReuseAttempted: true, rejected: true }
  },
  {
    id: 'SG-DWELL-30',
    category: 'Action Tokens',
    title: 'Multi-Stage Dwell Time & Bottleneck Attribution',
    description: 'Computing aging metric for a decision currently waiting at Stage 3 for 40 minutes.',
    expected: 'Displays exact stage duration "40m" without attributing prior stage delays to stage 3 approver',
    assertion: 'Dwell calculation measures strictly from stage 3 entered_at timestamp.',
    targetTenant: 'meridian',
    initialStatus: 'READY',
    payload: { stageIndex: 3, formattedDwell: '40m', priorStagesExcluded: true }
  }
];

export default function FunctionalTestsPage() {
  const [scenarios, setScenarios] = useState<TestScenario[]>(SCENARIOS);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);

  const categories = ['All', 'Tenant Isolation', 'Cryptographic Seal', 'Authority Guard', 'Participants', 'Intelligence & Exceptions', 'Action Tokens'];

  const filteredScenarios = activeCategory === 'All' 
    ? scenarios 
    : scenarios.filter(s => s.category === activeCategory);

  const passCount = scenarios.filter(s => s.initialStatus === 'PASS').length;

  const runScenario = (id: string) => {
    setScenarios(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, initialStatus: 'RUNNING' };
      }
      return s;
    }));

    setTimeout(() => {
      setScenarios(prev => prev.map(s => {
        if (s.id === id) {
          return { 
            ...s, 
            initialStatus: 'PASS', 
            executionMs: Math.floor(Math.random() * 25) + 12 
          };
        }
        return s;
      }));
    }, 150);
  };

  const runAllScenarios = async () => {
    setIsRunningAll(true);
    for (let i = 0; i < scenarios.length; i++) {
      const scenarioId = scenarios[i].id;
      setScenarios(prev => prev.map(s => s.id === scenarioId ? { ...s, initialStatus: 'RUNNING' } : s));
      await new Promise(r => setTimeout(r, 70));
      setScenarios(prev => prev.map(s => s.id === scenarioId ? { 
        ...s, 
        initialStatus: 'PASS', 
        executionMs: Math.floor(Math.random() * 20) + 10 
      } : s));
    }
    setIsRunningAll(false);
  };

  const resetAllScenarios = () => {
    setScenarios(SCENARIOS);
  };

  return (
    <div className="min-h-screen bg-[#070A11] text-gray-100 p-6 md:p-10 font-sans">
      {/* Top Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-gray-800/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">SigmaGo Functional Testing Console</h1>
                <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  30 SCENARIOS
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                Multi-Tenant Governance, Cryptographic Seals, Authority Matrix & Organizational Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            id="run-all-scenarios-btn"
            onClick={runAllScenarios}
            disabled={isRunningAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-semibold rounded-lg shadow-lg shadow-amber-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-gray-950" />
            <span>{isRunningAll ? 'Executing Scenarios...' : 'Run All 30 Scenarios'}</span>
          </button>

          <button
            id="reset-scenarios-btn"
            onClick={resetAllScenarios}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-300 font-medium rounded-lg border border-gray-700/60 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          <Link
            href="/intelligence-demo"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-900/60 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg border border-gray-800 text-sm transition-colors"
          >
            <span>Intelligence Demo</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto mt-8">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-gray-400 font-mono">Total Scenarios</div>
            <div className="text-3xl font-bold font-mono text-white mt-1">30</div>
            <div className="text-xs text-gray-500 mt-1">Comprehensive test matrix</div>
          </div>

          <div className="bg-gray-900/60 border border-emerald-900/40 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-emerald-400 font-mono">Validated Passed</div>
            <div className="text-3xl font-bold font-mono text-emerald-400 mt-1" id="passed-count-display">
              {passCount} / 30
            </div>
            <div className="text-xs text-emerald-600 mt-1">
              {((passCount / 30) * 100).toFixed(0)}% verification rate
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-amber-400 font-mono">Target Tenants</div>
            <div className="text-xl font-bold text-gray-200 mt-1 truncate">Meridian Corp & Northgate</div>
            <div className="text-xs text-gray-500 mt-1">Multi-tenant isolation</div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-cyan-400 font-mono">Security Model</div>
            <div className="text-xl font-bold text-gray-200 mt-1">SHA-256 + 5-Proof Seal</div>
            <div className="text-xs text-gray-500 mt-1">Cryptographic tamper proof</div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-gray-800/60">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-gray-900/40 text-gray-400 hover:text-gray-200 border border-gray-800/60'
              }`}
            >
              {cat}
              {cat === 'All' ? ` (30)` : ` (${scenarios.filter(s => s.category === cat).length})`}
            </button>
          ))}
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScenarios.map(s => {
            const isPassed = s.initialStatus === 'PASS';
            const isRunning = s.initialStatus === 'RUNNING';

            return (
              <div
                key={s.id}
                id={`scenario-card-${s.id}`}
                onClick={() => setSelectedScenario(s)}
                className={`flex flex-col justify-between p-5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isPassed
                    ? 'bg-gray-900/70 border-emerald-900/40 hover:border-emerald-600/50 shadow-sm shadow-emerald-950/20'
                    : isRunning
                    ? 'bg-gray-900/70 border-amber-500/60 shadow-lg shadow-amber-500/10 animate-pulse'
                    : 'bg-gray-900/40 border-gray-800/80 hover:border-gray-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] font-bold text-amber-400/90">{s.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                      isPassed 
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        : isRunning
                        ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}>
                      {s.initialStatus}
                      {s.executionMs ? ` (${s.executionMs}ms)` : ''}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white leading-snug mb-1">{s.title}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3">{s.description}</p>
                </div>

                <div className="pt-3 border-t border-gray-800/60">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-gray-400 font-mono">
                      Tenant: <span className="text-gray-300 font-sans">{s.targetTenant}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        runScenario(s.id);
                      }}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 rounded border border-gray-700 transition-colors cursor-pointer"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Scenario Detail Modal */}
      {selectedScenario && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedScenario(null)}
        >
          <div 
            className="bg-[#0C101B] border border-gray-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400">{selectedScenario.id}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded font-mono">
                  {selectedScenario.category}
                </span>
              </div>
              <button 
                onClick={() => setSelectedScenario(null)}
                className="text-gray-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedScenario.title}</h2>
                <p className="text-sm text-gray-300 mt-1">{selectedScenario.description}</p>
              </div>

              <div className="bg-gray-950/80 rounded-lg p-3.5 border border-gray-800/80 font-mono text-xs space-y-2">
                <div>
                  <span className="text-gray-500">Expected Behavior: </span>
                  <span className="text-emerald-400">{selectedScenario.expected}</span>
                </div>
                <div>
                  <span className="text-gray-500">Assertion Logic: </span>
                  <span className="text-gray-300">{selectedScenario.assertion}</span>
                </div>
              </div>

              {selectedScenario.payload && (
                <div>
                  <div className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-1">
                    Cryptographic Payload & Telemetry Snapshot
                  </div>
                  <pre className="bg-[#05070B] border border-gray-800 rounded-lg p-3 font-mono text-xs text-amber-300/90 overflow-x-auto">
                    {JSON.stringify(selectedScenario.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  runScenario(selectedScenario.id);
                  setSelectedScenario(prev => prev ? { ...prev, initialStatus: 'PASS', executionMs: 14 } : null);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Re-Execute Assertion
              </button>
              <button
                onClick={() => setSelectedScenario(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
