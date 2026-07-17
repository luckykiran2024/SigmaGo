import Link from 'next/link';
import { ArrowRight, CheckCircle2, Cpu, Users, BadgeDollarSign, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product - SigmaGo',
  description: 'From request to permanent record. How SigmaGo helps companies track and seal decisions.',
};

export default function ProductPage() {
  return (
    <div className="flex flex-col bg-[#274C77] text-[#C9D5E7] font-ibmsans">
      
      {/* Header (Navy band #0C2340) */}
      <section className="bg-[#0C2340] py-20 md:py-24 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6 animate-fade-up">
          <span className="font-ibmmono text-xs uppercase tracking-widest text-[#C9A227]">
            [ Core Workflow ]
          </span>
          <h1 className="text-3xl md:text-5xl font-ibmserif font-bold text-[#F5EAD1] leading-tight">
            From request to permanent <span className="text-[#C9A227]">record</span>
          </h1>
          <p className="text-sm md:text-base text-[#C9D5E7] max-w-2xl mx-auto font-semibold leading-relaxed">
            SigmaGo untangles approval chaos, converting casual email confirmations into sealed, permanent business history.
          </p>
        </div>
      </section>

      {/* The Four Steps (White cards) */}
      <section className="py-20 bg-[#274C77]">
        <div className="max-w-5xl mx-auto px-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-[0_15px_40px_rgba(7,20,40,0.22)]">
              <span className="font-ibmmono text-[10px] font-bold text-[#C9A227] uppercase tracking-wider block mb-2">Step 1</span>
              <h3 className="text-sm font-bold text-[#0C2340] font-ibmserif mb-1">Raise</h3>
              <p className="text-xs text-[#274C77] font-semibold leading-relaxed">
                In SigmaGo or pushed from your tools via API.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-[0_15px_40px_rgba(7,20,40,0.22)]">
              <span className="font-ibmmono text-[10px] font-bold text-[#C9A227] uppercase tracking-wider block mb-2">Step 2</span>
              <h3 className="text-sm font-bold text-[#0C2340] font-ibmserif mb-1">Route</h3>
              <p className="text-xs text-[#274C77] font-semibold leading-relaxed">
                Staged paths: sequential gates, parallel sign-offs, FYI.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-[0_15px_40px_rgba(7,20,40,0.22)]">
              <span className="font-ibmmono text-[10px] font-bold text-[#C9A227] uppercase tracking-wider block mb-2">Step 3</span>
              <h3 className="text-sm font-bold text-[#0C2340] font-ibmserif mb-1">Decide</h3>
              <p className="text-xs text-[#274C77] font-semibold leading-relaxed">
                One click from email; delegation covers absences, on the record.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-[0_15px_40px_rgba(7,20,40,0.22)]">
              <span className="font-ibmmono text-[10px] font-bold text-[#C9A227] uppercase tracking-wider block mb-2">Step 4</span>
              <h3 className="text-sm font-bold text-[#0C2340] font-ibmserif mb-1">Prove</h3>
              <p className="text-xs text-[#274C77] font-semibold leading-relaxed">
                Sealed certificate with a permanent shareable link.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Approval Certificate Mock Section (White card content layout) */}
      <section className="py-20 bg-[#0C2340]/40 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center animate-fade-up">
          <div className="lg:col-span-5 space-y-6">
            <span className="font-ibmmono text-xs uppercase tracking-widest text-[#C9A227] block">
              [ Immutable Proof ]
            </span>
            <h2 className="text-2xl md:text-3xl font-ibmserif font-bold text-[#F5EAD1]">
              The Approval Certificate
            </h2>
            <p className="text-xs text-[#C9D5E7] font-semibold leading-relaxed">
              Every final decision gets an immutable print-ready certificate. Rather than scanning thousands of old emails to answer audits, point teams directly to the sealed source.
            </p>
            <ul className="space-y-3.5 text-xs font-bold text-[#C9D5E7]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                <span>Every approver, role, timestamp, and comment.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                <span>Full exception rationale and audit trail.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                <span>Path changes with who modified them and why.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                <span>SHA-256 cryptographic integrity seal.</span>
              </li>
            </ul>
          </div>

          {/* Simple styled mock block */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(7,20,40,0.25)] font-ibmmono text-xs text-[#274C77]">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
              <div>
                <span className="font-bold text-sm tracking-tight text-[#0C2340]">SigmaGo</span>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Meridian Corp</p>
              </div>
              <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-150 font-bold uppercase tracking-wider">
                APPROVED
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Subject:</span>
                <span className="font-bold text-[#0C2340]">Q3 Procurement Vendor Switch (exceptions)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Raised By:</span>
                <span>Rohan Mehta (Emp ID: MRD014)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date:</span>
                <span>2026-07-16 10:20 IST</span>
              </div>
            </div>

            <div className="bg-gray-50/50 p-4 rounded-xl space-y-3 mt-4">
              <span className="font-bold text-[9px] uppercase tracking-wider text-gray-400">Verification Steps & Sign-offs</span>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span>1. VP Finance — Krishna Iyer</span>
                  <span className="text-green-600 font-bold">APPROVED</span>
                </div>
                <p className="text-[10px] text-gray-400 italic">"Budget check passed. Exception justified."</p>

                <div className="flex items-center justify-between text-[10px] border-t border-gray-100 pt-2">
                  <span>2. Founder — Lucky Soma</span>
                  <span className="text-green-600 font-bold">APPROVED</span>
                </div>
                <p className="text-[10px] text-gray-400 italic">"Looks solid. Standardize this vendor."</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[9px] text-gray-400">
              <span>SHA-256 INTEGRITY SEAL:</span>
              <span className="font-bold break-all select-all text-gray-500">
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Works with your tools & Built for how companies run (White cards layout) */}
      <section className="py-20 bg-[#274C77]">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch animate-fade-up">
          <div className="bg-white rounded-3xl p-8 shadow-[0_15px_40px_rgba(7,20,40,0.22)] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-[#C9A227]/10 text-[#C9A227] flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold font-ibmserif text-[#0C2340]">Works with your tools</h2>
              <p className="text-xs text-[#274C77] font-semibold leading-relaxed">
                You do not need to change how your developers commit or how your teams raise support tickets. Connect via signed webhooks and API nodes.
              </p>
            </div>
            <ul className="space-y-2.5 text-xs text-gray-600 font-semibold border-t border-gray-100 pt-4">
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#C9A227] shrink-0" />
                <span>REST API + signed webhooks for robust execution.</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#C9A227] shrink-0" />
                <span>Jira / Freshdesk connect via their own automations.</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#C9A227] shrink-0" />
                <span>Approvers never need new logins.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-[0_15px_40px_rgba(7,20,40,0.22)] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-[#C9A227]/10 text-[#C9A227] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold font-ibmserif text-[#0C2340]">Built for how companies run</h2>
              <p className="text-xs text-[#274C77] font-semibold leading-relaxed">
                SigmaGo adapts to standard workflows, employee hierarchies, and security criteria.
              </p>
            </div>
            <ul className="space-y-2.5 text-xs text-gray-600 font-semibold border-t border-gray-100 pt-4">
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#C9A227] shrink-0" />
                <span>Org structure imports easily via CSV or HRMS syncs.</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#C9A227] shrink-0" />
                <span>Delegations automatically cover absence intervals.</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#C9A227] shrink-0" />
                <span>Exit-safe archival logs details permanently.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Security Band (Navy background) */}
      <section className="bg-[#0C2340] text-white py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4 animate-fade-up">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#C9A227]/10 text-[#C9A227] mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold font-ibmserif text-[#F5EAD1]">Honest Security</h2>
          <p className="text-xs text-[#C9D5E7] font-semibold max-w-xl mx-auto leading-relaxed">
            Tenant-isolated data, token-secured email actions, append-only audit trail. SSO and enterprise security hardening on the roadmap.
          </p>
        </div>
      </section>

      {/* Pricing Band & CTA */}
      <section className="py-24 bg-[#274C77] text-center border-t border-white/5">
        <div className="max-w-xl mx-auto px-6 space-y-6 animate-fade-up">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 text-[#C9A227] mx-auto">
            <BadgeDollarSign className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold font-ibmserif text-[#F5EAD1]">Built for the entire company</h2>
          <p className="text-xs text-[#C9A227] font-bold uppercase tracking-wider">
            Priced per company, not per seat — every approver included.
          </p>
          <div className="pt-2">
            <a
              href="mailto:pilot@sigmago.co?subject=SigmaGo%20pilot%20conversation"
              className="inline-flex items-center justify-center px-10 py-4 bg-[#C9A227] hover:bg-[#C9A227]/90 text-[#0C2340] text-sm font-bold uppercase tracking-wider rounded-full shadow-lg transition duration-150 transform hover:-translate-y-0.5"
            >
              Book a pilot
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
