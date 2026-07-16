import Link from 'next/link';
import { ArrowRight, Inbox, HelpCircle, AlertTriangle, ShieldCheck, Mail, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SigmaGo - The System of Record for Company Decisions',
  description: 'Budgets, hires, vendors, exceptions — thousands of yeses run your company. SigmaGo is where they get made fast and kept forever.',
  openGraph: {
    title: 'SigmaGo - The System of Record for Company Decisions',
    description: 'Budgets, hires, vendors, exceptions — thousands of yeses run your company. SigmaGo is where they get made fast and kept forever.',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <div className="flex flex-col bg-white">
      {/* 1. HERO (dark charcoal band) */}
      <section className="bg-ink text-white py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight md:leading-none text-white">
            A company is the sum of <span className="text-accent">its decisions.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Budgets, hires, vendors, exceptions — thousands of yeses run your company. SigmaGo is where they get made fast and kept forever.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <a
              href="mailto:pilot@sigmago.co?subject=SigmaGo%20pilot%20conversation"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 bg-accent hover:bg-accent-deep text-white text-sm font-extrabold rounded-xl shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
            >
              Book a pilot
            </a>
            <Link
              href="/product"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl border border-zinc-700 transition"
            >
              See how it works <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. THE IRONY (light section, 4 compact rows) */}
      <section className="py-24 bg-white border-b border-gray-50">
        <div className="max-w-3xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink">
              Everything vital has a system of record — except the thing that steers it.
            </h2>
          </div>

          <div className="divide-y divide-gray-150">
            <div className="py-5 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8 items-center">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Money</span>
              <span className="text-sm font-extrabold text-ink md:col-span-2">
                The ledger: every rupee recorded, audited, permanent.
              </span>
            </div>

            <div className="py-5 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8 items-center">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Code</span>
              <span className="text-sm font-extrabold text-ink md:col-span-2">
                Version control: every change tracked — what, who, why.
              </span>
            </div>

            <div className="py-5 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8 items-center">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">People & inventory</span>
              <span className="text-sm font-extrabold text-ink md:col-span-2">
                HRMS and ERP: counted, tracked, reconciled.
              </span>
            </div>

            <div className="py-5 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8 items-center">
              <span className="text-sm font-bold text-accent uppercase tracking-wider">Decisions</span>
              <span className="text-sm font-extrabold text-accent md:col-span-2">
                ...an inbox. Thread #47 of 100. Gone when people go.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FOUR PEOPLE, FOUR PAINS (cards) */}
      <section className="py-24 bg-panel">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink">
              The operational tax of forgetting
            </h2>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Four people, four pains</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* The Leader */}
            <div className="bg-white border border-gray-150 p-6 rounded-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-accent flex items-center justify-center">
                  <Inbox className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-ink uppercase tracking-wide">The Leader</h3>
                <p className="text-xs font-bold text-gray-500 italic">"What's pending on me? Why did I approve that?"</p>
              </div>
              <p className="text-xs font-semibold text-gray-400 leading-relaxed">
                100 threads deep; approvals arrive as noise; context gone.
              </p>
            </div>

            {/* The Employee */}
            <div className="bg-white border border-gray-150 p-6 rounded-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-accent flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-ink uppercase tracking-wide">The Employee</h3>
                <p className="text-xs font-bold text-gray-500 italic">"Is it approved? Fully? Can I tell the vendor yes?"</p>
              </div>
              <p className="text-xs font-semibold text-gray-400 leading-relaxed">
                Waits in fog; "approved" is a word in a thread.
              </p>
            </div>

            {/* HR / Procurement / Finance */}
            <div className="bg-white border border-gray-150 p-6 rounded-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-50 text-accent flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-ink uppercase tracking-wide">Operations</h3>
                <p className="text-xs font-bold text-gray-500 italic">"Do we act on a forwarded screenshot?"</p>
              </div>
              <p className="text-xs font-semibold text-gray-400 leading-relaxed">
                They execute fragments — and carry the risk.
              </p>
            </div>

            {/* The Founder */}
            <div className="bg-white border border-gray-150 p-6 rounded-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-ink uppercase tracking-wide">The Founder</h3>
                <p className="text-xs font-bold text-gray-500 italic">"What's being decided in my company right now?"</p>
              </div>
              <p className="text-xs font-semibold text-gray-400 leading-relaxed">
                Past ~150 people, the nod stops scaling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE ANSWER (dark band, three pillars) */}
      <section className="bg-ink text-white py-24">
        <div className="max-w-6xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">One system, three promises.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Moves at inbox speed</h3>
              <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                Approvers act from email: Approve, Reject, or Discuss. One click, full context, zero training.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Proven forever</h3>
              <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                Every decision sealed: who, sequence, scope, conditions, reasoning. Tamper-evident, permanent.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Lands intact</h3>
              <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                Every decision is a linkable object; teams read the source, not the rumor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CLOSING CTA band */}
      <section className="py-24 bg-white border-t border-gray-50">
        <div className="max-w-xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-xl md:text-2xl font-black text-ink">
            Your company is the sum of its decisions. Start keeping them.
          </h2>
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
