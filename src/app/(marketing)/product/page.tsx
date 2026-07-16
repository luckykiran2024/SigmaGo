import Link from 'next/link';
import { ArrowRight, CheckCircle2, Cpu, Users, ShieldAlert, BadgeDollarSign, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product - SigmaGo',
  description: 'From request to permanent record. How SigmaGo helps companies track and seal decisions.',
};

export default function ProductPage() {
  return (
    <div className="flex flex-col bg-white font-sans text-ink">
      {/* Header */}
      <section className="bg-panel py-20 md:py-24 border-b border-gray-150">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-ink">
            From request to permanent record
          </h1>
          <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto font-semibold">
            SigmaGo untangles approval chaos, converting casual email confirmations into sealed, permanent business history.
          </p>
        </div>
      </section>

      {/* The Four Steps */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <span className="text-2xs font-extrabold text-accent uppercase tracking-wider">Step 1</span>
              <h3 className="text-base font-bold text-ink">Raise</h3>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                In SigmaGo or pushed from your tools via API.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-2xs font-extrabold text-accent uppercase tracking-wider">Step 2</span>
              <h3 className="text-base font-bold text-ink">Route</h3>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                Staged paths: sequential gates, parallel sign-offs, FYI.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-2xs font-extrabold text-accent uppercase tracking-wider">Step 3</span>
              <h3 className="text-base font-bold text-ink">Decide</h3>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                One click from email; delegation covers absences, on the record.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-2xs font-extrabold text-accent uppercase tracking-wider">Step 4</span>
              <h3 className="text-base font-bold text-ink">Prove</h3>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                Sealed certificate with a permanent shareable link.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Approval Certificate Mock Section */}
      <section className="py-20 bg-panel border-y border-gray-150">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink">
              The Approval Certificate
            </h2>
            <p className="text-xs text-gray-400 font-semibold leading-relaxed">
              Every final decision gets an immutable print-ready certificate. Rather than scanning thousands of old emails to answer audits, point teams directly to the sealed source.
            </p>
            <ul className="space-y-3 text-xs font-bold text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>Every approver, role, timestamp, and comment.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>Full exception rationale and audit trail.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>Path changes with who modified them and why.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>SHA-256 cryptographic integrity seal.</span>
              </li>
            </ul>
          </div>

          {/* Simple styled mock block */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 font-mono text-ink text-xxs">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="font-extrabold text-xs tracking-tight text-ink">SigmaGo</span>
                <p className="text-4xs text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Meridian Corp</p>
              </div>
              <span className="text-3xs bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-150 font-bold uppercase tracking-wider">
                APPROVED
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Subject:</span>
                <span className="font-bold">Q3 Procurement Vendor Switch (exceptions)</span>
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

            <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl space-y-3">
              <span className="font-bold block text-3xs uppercase tracking-wider text-gray-400">Verification Steps & Sign-offs</span>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-4xs">
                  <span>1. VP Finance — Krishna Iyer</span>
                  <span className="text-green-600 font-bold">APPROVED (11:05 IST)</span>
                </div>
                <p className="text-4xs text-gray-400 italic">"Budget check passed. Exception justified."</p>

                <div className="flex items-center justify-between text-4xs border-t border-gray-100 pt-2">
                  <span>2. Founder — Lucky Soma</span>
                  <span className="text-green-600 font-bold">APPROVED (11:45 IST)</span>
                </div>
                <p className="text-4xs text-gray-400 italic">"Looks solid. Standardize this vendor for future quarters."</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-4xs text-gray-400 font-semibold">
              <span>SHA-256 INTEGRITY SEAL:</span>
              <span className="font-mono text-gray-600 break-all select-all">
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Works with your tools */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-accent flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Works with your tools</h2>
            <p className="text-xs text-gray-400 font-semibold leading-relaxed">
              You do not need to change how your developers commit or how your teams raise support tickets. Connect via signed webhooks and API nodes.
            </p>
            <ul className="space-y-2.5 text-xs text-gray-500 font-semibold">
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-accent shrink-0" />
                <span>REST API + signed webhooks for robust execution.</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-accent shrink-0" />
                <span>Jira / Freshdesk connect via their own automations.</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-accent shrink-0" />
                <span>Approvers never need new logins (action links straight from inbox).</span>
              </li>
            </ul>
          </div>

          <div className="space-y-6">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-accent flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Built for how companies run</h2>
            <p className="text-xs text-gray-400 font-semibold leading-relaxed">
              SigmaGo adapts to standard workflows, employee hierarchies, and security criteria.
            </p>
            <ul className="space-y-2.5 text-xs text-gray-500 font-semibold">
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-accent shrink-0" />
                <span>Org structure imports easily via CSV or HRMS syncs.</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-accent shrink-0" />
                <span>Delegations automatically cover absence intervals.</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-accent shrink-0" />
                <span>Exit-safe archival logs details permanently when employees leave.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Security Band */}
      <section className="bg-ink text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold">Honest Security</h2>
          <p className="text-xs text-gray-300 font-semibold max-w-xl mx-auto leading-relaxed">
            Tenant-isolated data, token-secured email actions, append-only audit trail. SSO and enterprise security hardening on the roadmap.
          </p>
        </div>
      </section>

      {/* Pricing Band & CTA */}
      <section className="py-24 bg-white border-t border-gray-50">
        <div className="max-w-xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-accent mx-auto">
            <BadgeDollarSign className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-ink">Built for the entire company</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
            Priced per company, not per seat — every approver included.
          </p>
          <div className="pt-2">
            <a
              href="mailto:pilot@sigmago.co?subject=SigmaGo%20pilot%20conversation"
              className="inline-flex items-center justify-center px-6 py-3.5 bg-accent hover:bg-accent-deep text-white text-sm font-extrabold rounded-xl shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
            >
              Book a pilot
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
