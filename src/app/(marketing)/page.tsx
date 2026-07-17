import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Mail, CheckCircle, FileText, Users, AlertTriangle } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SigmaGo - The System of Record for Company Decisions',
  description: 'Budgets, hires, vendors, exceptions — thousands of yeses run your company. SigmaGo is where they get made fast and kept forever.',
};

export default function HomePage() {
  return (
    <div className="flex flex-col bg-[#274C77] text-[#C9D5E7] font-ibmsans">
      
      {/* 1. HERO (steel-blue ground #274C77) */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 animate-fade-up">
          
          <span className="inline-block font-ibmmono text-xs uppercase tracking-widest text-[#C9A227]">
            [ Introducing SigmaGo ]
          </span>

          <h1 className="text-[clamp(44px,8vw,78px)] font-ibmserif font-bold text-[#F5EAD1] leading-[1.05] tracking-tight">
            A company is the sum of its <span className="text-[#C9A227]">decisions.</span>
          </h1>

          <p className="text-lg md:text-xl text-[#C9D5E7] max-w-2xl mx-auto leading-[1.65]">
            Budgets, hires, vendors, exceptions — thousands of yeses run your company. SigmaGo is where they get made fast and kept forever.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-5 pt-4">
            <a
              href="mailto:pilot@sigmago.co?subject=SigmaGo%20pilot%20conversation"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-[#C9A227] hover:bg-[#C9A227]/90 text-[#0C2340] text-sm font-bold uppercase tracking-wider rounded-full shadow-lg transition duration-150 transform hover:-translate-y-0.5"
            >
              Book a pilot
            </a>
            <Link
              href="/product"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border-2 border-[#F5EAD1] hover:bg-[#F5EAD1]/10 text-[#F5EAD1] text-sm font-bold uppercase tracking-wider rounded-full transition"
            >
              See how it works <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. TILTED CERTIFICATE CARD */}
      <section className="py-16 bg-[#274C77]">
        <div className="max-w-3xl mx-auto px-6 flex justify-center animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="w-full bg-white rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(7,20,40,0.25)] border-0 transform rotate-1 hover:rotate-0 transition duration-500 relative overflow-hidden select-none">
            
            {/* Brass SG SEALED seal */}
            <div className="absolute right-6 top-6 sm:right-10 sm:top-10 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-[#C9A227] flex flex-col items-center justify-center rotate-12 bg-white shadow-sm p-1">
                <span className="font-ibmmono text-[10px] font-bold text-[#C9A227] tracking-tighter leading-none">SG</span>
                <span className="font-ibmmono text-[9px] font-black text-[#C9A227] tracking-widest leading-none mt-1">SEALED</span>
              </div>
            </div>

            <div className="border-b border-gray-100 pb-6 mb-6">
              <span className="font-ibmmono text-[11px] text-[#C9A227] font-bold uppercase tracking-widest block">
                Decision Receipt
              </span>
              <h2 className="font-ibmserif text-2xl text-[#0C2340] font-bold mt-1">
                Approval Certificate
              </h2>
            </div>

            <div className="space-y-4 font-ibmmono text-xs text-[#274C77] leading-relaxed">
              <div className="grid grid-cols-3 border-b border-gray-50 pb-2">
                <span className="font-bold text-gray-400">SUBJECT:</span>
                <span className="col-span-2 font-bold text-[#0C2340]">Q3 Procurement Vendor Switch (exceptions)</span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-50 pb-2">
                <span className="font-bold text-gray-400">RAISED BY:</span>
                <span className="col-span-2 text-gray-700">Rohan Mehta (Emp ID: MRD014)</span>
              </div>
              <div className="grid grid-cols-3 border-b border-gray-50 pb-2">
                <span className="font-bold text-gray-400">DATE:</span>
                <span className="col-span-2 text-gray-700">2026-07-16 10:20 IST</span>
              </div>
            </div>

            <div className="mt-8 bg-gray-50/50 p-5 rounded-2xl space-y-4">
              <span className="font-ibmmono text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                Sign-off History
              </span>
              <div className="space-y-3 font-ibmsans text-xs text-gray-600">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-[#0C2340] block">VP Finance — Krishna Iyer</span>
                    <span className="text-[10px] text-gray-400 italic">"Budget check passed. Exception justified."</span>
                  </div>
                  <span className="text-[10px] font-ibmmono font-bold text-[#C9A227] uppercase tracking-wider">APPROVED</span>
                </div>
                <div className="flex justify-between items-start border-t border-gray-100 pt-3">
                  <div>
                    <span className="font-bold text-[#0C2340] block">Founder — Lucky Soma</span>
                    <span className="text-[10px] text-gray-400 italic">"Looks solid. Standardize this vendor for future quarters."</span>
                  </div>
                  <span className="text-[10px] font-ibmmono font-bold text-[#C9A227] uppercase tracking-wider">APPROVED</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-150 pt-6 mt-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] font-ibmmono text-gray-400 font-semibold">
              <span>SHA-256 INTEGRITY SEAL:</span>
              <span className="text-gray-500 break-all select-all font-bold">
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. "SYSTEM OF RECORD" IRONY ROWS */}
      <section className="py-24 bg-[#274C77] border-y border-white/5">
        <div className="max-w-3xl mx-auto px-6 space-y-12 animate-fade-up">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-ibmserif font-bold text-[#F5EAD1] leading-tight">
              Everything vital has a system of record — except the thing that steers it.
            </h2>
          </div>

          <div className="divide-y divide-white/5">
            <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8 items-center">
              <span className="font-ibmmono text-xs uppercase tracking-widest text-[#C9D5E7]">Money</span>
              <span className="font-ibmsans text-sm font-bold text-[#F5EAD1] md:col-span-2">
                The ledger: every rupee recorded, audited, permanent.
              </span>
            </div>

            <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8 items-center">
              <span className="font-ibmmono text-xs uppercase tracking-widest text-[#C9D5E7]">Code</span>
              <span className="font-ibmsans text-sm font-bold text-[#F5EAD1] md:col-span-2">
                Version control: every change tracked — what, who, why.
              </span>
            </div>

            <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8 items-center">
              <span className="font-ibmmono text-xs uppercase tracking-widest text-[#C9D5E7]">People & inventory</span>
              <span className="font-ibmsans text-sm font-bold text-[#F5EAD1] md:col-span-2">
                HRMS and ERP: counted, tracked, reconciled.
              </span>
            </div>

            <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8 items-center bg-[#0C2340]/40 px-4 rounded-2xl border border-white/5">
              <span className="font-ibmmono text-xs uppercase tracking-widest text-[#C9A227]">Decisions</span>
              <span className="font-ibmsans text-sm font-bold text-[#C9A227] md:col-span-2">
                ...an inbox. Thread #47 of 100. Gone when people go.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOUR PERSONA CARDS */}
      <section className="py-24 bg-[#274C77]">
        <div className="max-w-6xl mx-auto px-6 space-y-16 animate-fade-up">
          <div className="text-center space-y-2">
            <span className="font-ibmmono text-xs uppercase tracking-widest text-[#C9A227] block">
              [ Who carries the cost? ]
            </span>
            <h2 className="text-3xl font-ibmserif font-bold text-[#F5EAD1]">
              Four people, four pains
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* The Leader */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_15px_40px_rgba(7,20,40,0.22)] border-0 flex flex-col justify-between space-y-8 select-none hover:translate-y-[-4px] transition duration-300">
              <div className="space-y-4">
                <span className="font-ibmmono text-[10px] text-[#C9A227] font-bold uppercase tracking-widest block">
                  The Leader
                </span>
                <p className="font-ibmsans text-sm font-bold text-[#0C2340] italic leading-relaxed">
                  "What's pending on me? Why did I approve that?"
                </p>
              </div>
              <p className="font-ibmsans text-xs text-[#274C77] font-semibold leading-relaxed">
                100 threads deep; approvals arrive as noise; context gone.
              </p>
            </div>

            {/* The Employee */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_15px_40px_rgba(7,20,40,0.22)] border-0 flex flex-col justify-between space-y-8 select-none hover:translate-y-[-4px] transition duration-300">
              <div className="space-y-4">
                <span className="font-ibmmono text-[10px] text-[#C9A227] font-bold uppercase tracking-widest block">
                  The Employee
                </span>
                <p className="font-ibmsans text-sm font-bold text-[#0C2340] italic leading-relaxed">
                  "Is it approved? Fully? Can I tell the vendor yes?"
                </p>
              </div>
              <p className="font-ibmsans text-xs text-[#274C77] font-semibold leading-relaxed">
                Waits in fog; "approved" is a word in a thread.
              </p>
            </div>

            {/* HR / Procurement / Finance */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_15px_40px_rgba(7,20,40,0.22)] border-0 flex flex-col justify-between space-y-8 select-none hover:translate-y-[-4px] transition duration-300">
              <div className="space-y-4">
                <span className="font-ibmmono text-[10px] text-[#C9A227] font-bold uppercase tracking-widest block">
                  Operations
                </span>
                <p className="font-ibmsans text-sm font-bold text-[#0C2340] italic leading-relaxed">
                  "Do we act on a forwarded screenshot?"
                </p>
              </div>
              <p className="font-ibmsans text-xs text-[#274C77] font-semibold leading-relaxed">
                They execute fragments — and carry the risk.
              </p>
            </div>

            {/* The Founder */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_15px_40px_rgba(7,20,40,0.22)] border-0 flex flex-col justify-between space-y-8 select-none hover:translate-y-[-4px] transition duration-300">
              <div className="space-y-4">
                <span className="font-ibmmono text-[10px] text-[#C9A227] font-bold uppercase tracking-widest block">
                  The Founder
                </span>
                <p className="font-ibmsans text-sm font-bold text-[#0C2340] italic leading-relaxed">
                  "What's being decided in my company right now?"
                </p>
              </div>
              <p className="font-ibmsans text-xs text-[#274C77] font-semibold leading-relaxed">
                Past ~150 people, the nod stops scaling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. NAVY BAND (navy #0C2340 ground, lightsteel text, cream headlines) */}
      <section className="bg-[#0C2340] text-[#C9D5E7] py-24 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6 space-y-16 animate-fade-up">
          <div className="text-center space-y-2">
            <span className="font-ibmmono text-xs uppercase tracking-widest text-[#C9A227] block">
              [ Three Promises ]
            </span>
            <h2 className="text-3xl font-ibmserif font-bold text-[#F5EAD1]">
              One system, three promises.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-[#C9A227]/10 text-[#C9A227] flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F5EAD1] font-ibmserif">Moves at inbox speed</h3>
              <p className="text-xs text-[#C9D5E7] leading-[1.65] font-semibold">
                Approvers act from email: Approve, Reject, or Discuss. One click, full context, zero training.
              </p>
            </div>

            <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-[#C9A227]/10 text-[#C9A227] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F5EAD1] font-ibmserif">Proven forever</h3>
              <p className="text-xs text-[#C9D5E7] leading-[1.65] font-semibold">
                Every decision sealed: who, sequence, scope, conditions, reasoning. Tamper-evident, permanent.
              </p>
            </div>

            <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-[#C9A227]/10 text-[#C9A227] flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F5EAD1] font-ibmserif">Lands intact</h3>
              <p className="text-xs text-[#C9D5E7] leading-[1.65] font-semibold">
                Every decision is a linkable object; teams read the source, not the rumor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CLOSING CTA (steel-blue ground #274C77, start keeping them) */}
      <section className="py-24 bg-[#274C77] text-center">
        <div className="max-w-xl mx-auto px-6 space-y-8 animate-fade-up">
          <h2 className="text-[clamp(32px,5vw,52px)] font-ibmserif font-bold text-[#F5EAD1] leading-[1.1] tracking-tight">
            Your company is the sum of its decisions. <span className="text-[#C9A227]">Start keeping them.</span>
          </h2>
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
