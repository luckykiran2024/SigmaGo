import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Mail, CheckCircle } from 'lucide-react';
import { PILOT_EMAIL } from '@/lib/site';

export default function HomePage() {
  const mailtoLink = `mailto:${PILOT_EMAIL}?subject=SigmaGo%20pilot%20conversation`;

  return (
    <div className="bg-[#FAF8F2] text-[#17200F] font-inter">
      
      {/* 1. HERO SECTION (Page Ground background #FAF8F2) */}
      <section className="py-[clamp(64px,7vw,110px)] border-b border-hair">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 min-[1000px]:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
            
            {/* Left Column: Hero Text */}
            <div className="space-y-6 animate-fade-up">
              <span className="inline-block font-ibmmono text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A017] bg-[#D4A017]/10 px-3 py-1 rounded-full">
                THE SYSTEM OF RECORD FOR DECISIONS
              </span>
              
              <h1 
                className="font-fraunces text-[#17200F] font-bold leading-[1.04] tracking-tight"
                style={{ fontSize: 'clamp(38px, 5.2vw, 66px)', letterSpacing: '-0.025em' }}
              >
                A company is the sum of its <span className="text-[#D4A017]">decisions.</span>
              </h1>
              
              <p 
                className="text-[#5E6657] max-w-xl font-medium leading-[1.7]"
                style={{ fontSize: 'clamp(17px, 1.4vw, 19px)' }}
              >
                Budgets, hires, vendors, exceptions — thousands of yeses run your company. Today they live in inboxes and in memories that resign. SigmaGo is where decisions get made fast and kept forever.
              </p>
              
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <a
                  href={mailtoLink}
                  className="px-8 py-4 text-center bg-[#D4A017] hover:bg-[#E3B02A] text-[#17200F] text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_4px_12px_rgba(212,160,23,0.2)] hover:shadow-[0_6px_16px_rgba(212,160,23,0.3)] transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
                >
                  Book a pilot
                </a>
                <Link
                  href="/product"
                  className="px-8 py-4 text-center border border-hair hover:bg-[#F1EEE4] text-[#17200F] text-xs font-bold uppercase tracking-wider rounded-full transition"
                >
                  See how it works <ArrowRight className="w-4.5 h-4.5 ml-2 inline" />
                </Link>
              </div>

              <p className="text-[11px] text-[#5E6657] font-ibmmono tracking-wide">
                No new tool for approvers — they act from email.
              </p>
            </div>

            {/* Right Column: Interactive Certificate Card */}
            <div className="flex justify-center animate-fade-up min-[1000px]:justify-end" style={{ animationDelay: '60ms' }}>
              <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_15px_40px_rgba(60,55,30,0.13)] border border-hair p-6 transform -rotate-[1.2deg] hover:rotate-0 transition duration-300 relative select-none">
                
                {/* Header bar with approved chip */}
                <div className="flex items-center justify-between border-b border-hair pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#D4A017]" />
                    <span className="font-fraunces text-sm font-bold text-[#17200F]">SigmaGo</span>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#2E7D5B]/10 text-[#2E7D5B] border border-[#2E7D5B]/20 font-ibmmono uppercase tracking-wider">
                    ● APPROVED
                  </span>
                </div>

                {/* Eyebrow Label */}
                <span className="block font-ibmmono text-[9px] font-bold text-[#D4A017] tracking-[0.2em] uppercase">
                  APPROVAL CERTIFICATE
                </span>

                {/* Title */}
                <h3 className="font-fraunces text-base font-bold text-[#17200F] mt-1.5">
                  Q3 Procurement — Vendor Switch
                </h3>

                {/* Meta details */}
                <div className="mt-3 py-2 border-y border-hair grid grid-cols-2 gap-4 text-[10px] font-ibmmono text-[#5E6657]">
                  <div>
                    <span className="block text-gray-400 font-medium">RAISED BY:</span>
                    <span className="font-bold text-[#17200F]">Rohan Mehta · MRD014</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-medium">SEALED:</span>
                    <span className="font-bold text-[#17200F]">16 Jul 2026 · 10:20 IST</span>
                  </div>
                </div>

                {/* Check Rows */}
                <div className="mt-4 space-y-3">
                  <div className="p-3 rounded-lg bg-[#2E7D5B]/5 border border-[#2E7D5B]/10 text-xs text-[#4B5347]">
                    <div className="flex items-center gap-1.5 font-bold text-[#17200F] mb-1">
                      <CheckCircle className="w-3.5 h-3.5 text-[#2E7D5B] shrink-0" />
                      <span>VP Finance — Krishna Iyer</span>
                    </div>
                    <p className="italic text-gray-500 pl-5">"Budget check passed. Exception justified."</p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#2E7D5B]/5 border border-[#2E7D5B]/10 text-xs text-[#4B5347]">
                    <div className="flex items-center gap-1.5 font-bold text-[#17200F] mb-1">
                      <CheckCircle className="w-3.5 h-3.5 text-[#2E7D5B] shrink-0" />
                      <span>Founder — Lucky Soma</span>
                    </div>
                    <p className="italic text-gray-500 pl-5">"Standardize this vendor for future quarters."</p>
                  </div>
                </div>

                {/* Gold Seal Ring */}
                <div className="mt-5 border-t border-hair pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-double border-[#D4A017] flex items-center justify-center text-[#D4A017]">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-[8px] font-ibmmono font-extrabold text-[#5E6657] tracking-wider uppercase">
                      SHA-256 INTEGRITY SEAL
                    </span>
                  </div>
                  <span className="font-ibmmono text-[9px] font-bold text-[#17200F] bg-[#FAF8F2] px-2 py-0.5 rounded border border-hair break-all">
                    a7f3c9d2...5d0b8264
                  </span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. SECTION 2: THE PROBLEM (Alternating background #F1EEE4) */}
      <section className="py-[clamp(64px,7vw,110px)] bg-[#F1EEE4] border-b border-hair">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto animate-fade-up">
            <span className="font-ibmmono text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A017]">
              THE PROBLEM
            </span>
            <h2 className="font-fraunces text-[clamp(28px,3.6vw,44px)] font-bold text-[#17200F] leading-[1.12]">
              Everything vital has a system of record — except the thing that <span className="text-[#D4A017]">[steers]</span> it.
            </h2>
          </div>

          {/* Ledger Table Rows */}
          <div className="max-w-3xl mx-auto bg-white border border-hair rounded-[14px] shadow-[0_10px_28px_rgba(60,55,30,0.10)] overflow-hidden divide-y divide-hair animate-fade-up" style={{ animationDelay: '60ms' }}>
            
            {/* Money Row */}
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-center hover:bg-[#FAF8F2]/50 transition">
              <span className="font-ibmmono text-xs font-bold uppercase tracking-[0.15em] text-[#5E6657]">Money</span>
              <span className="md:col-span-2 text-sm font-bold text-[#17200F] font-inter">The ledger: every rupee recorded, audited, permanent.</span>
            </div>

            {/* Code Row */}
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-center hover:bg-[#FAF8F2]/50 transition">
              <span className="font-ibmmono text-xs font-bold uppercase tracking-[0.15em] text-[#5E6657]">Code</span>
              <span className="md:col-span-2 text-sm font-bold text-[#17200F] font-inter">Version control: every change tracked, with who and why.</span>
            </div>

            {/* People & Inventory Row */}
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-center hover:bg-[#FAF8F2]/50 transition">
              <span className="font-ibmmono text-xs font-bold uppercase tracking-[0.15em] text-[#5E6657]">People & inventory</span>
              <span className="md:col-span-2 text-sm font-bold text-[#17200F] font-inter">HRMS and ERP: counted, tracked, reconciled.</span>
            </div>

            {/* Decisions Row (Highlighted row with gold tint) */}
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-[#D4A017]/10 border-l-4 border-l-[#D4A017]">
              <span className="font-ibmmono text-xs font-bold uppercase tracking-[0.15em] text-[#D4A017]">Decisions</span>
              <span className="md:col-span-2 text-sm font-extrabold text-[#17200F] font-inter">…an inbox. Thread #47 of 100. Gone when the people go.</span>
            </div>

          </div>

        </div>
      </section>

      {/* 3. SECTION 3: WHO CARRIES THE COST (Grid containing 4 cards) */}
      <section className="py-[clamp(64px,7vw,110px)] border-b border-hair bg-[#FAF8F2]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto animate-fade-up">
            <span className="font-ibmmono text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A017]">
              WHO CARRIES THE COST
            </span>
            <h2 className="font-fraunces text-[clamp(28px,3.6vw,44px)] font-bold text-[#17200F] leading-[1.12]">
              One missing record. <span className="text-[#D4A017]">[Four]</span> kinds of pain.
            </h2>
          </div>

          {/* Cards Grid layout: 4 across >= 1080px, 2 across >= 700px, 1 below */}
          <div className="grid grid-cols-1 min-[700px]:grid-cols-2 min-[1080px]:grid-cols-4 gap-8">
            
            {/* Card 1: The Leader */}
            <div className="bg-white border border-hair rounded-[14px] p-6 shadow-[0_10px_28px_rgba(60,55,30,0.10)] hover:-translate-y-1 hover:shadow-lg transition duration-200 ease-out flex flex-col justify-between space-y-6 select-none animate-fade-up">
              <div className="space-y-3">
                <span className="font-ibmmono text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4A017]">
                  The Leader
                </span>
                <h4 className="font-fraunces text-base font-bold text-[#17200F] italic">
                  "What's pending on me? Why did I approve that?"
                </h4>
              </div>
              <p className="text-xs text-[#4B5347] leading-relaxed">
                A hundred threads deep, approvals arrive as noise — and the reasoning behind their own past decisions is already gone.
              </p>
            </div>

            {/* Card 2: The Employee */}
            <div className="bg-white border border-hair rounded-[14px] p-6 shadow-[0_10px_28px_rgba(60,55,30,0.10)] hover:-translate-y-1 hover:shadow-lg transition duration-200 ease-out flex flex-col justify-between space-y-6 select-none animate-fade-up" style={{ animationDelay: '60ms' }}>
              <div className="space-y-3">
                <span className="font-ibmmono text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4A017]">
                  The Employee
                </span>
                <h4 className="font-fraunces text-base font-bold text-[#17200F] italic">
                  "Is it approved? Can I tell the vendor yes?"
                </h4>
              </div>
              <p className="text-xs text-[#4B5347] leading-relaxed">
                Waiting in fog. "Approved" is a word in a thread; the scope and the conditions are left to guesswork.
              </p>
            </div>

            {/* Card 3: Operations */}
            <div className="bg-white border border-hair rounded-[14px] p-6 shadow-[0_10px_28px_rgba(60,55,30,0.10)] hover:-translate-y-1 hover:shadow-lg transition duration-200 ease-out flex flex-col justify-between space-y-6 select-none animate-fade-up" style={{ animationDelay: '120ms' }}>
              <div className="space-y-3">
                <span className="font-ibmmono text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4A017]">
                  HR · Procurement · Finance
                </span>
                <h4 className="font-fraunces text-base font-bold text-[#17200F] italic">
                  "Do we act on a forwarded screenshot?"
                </h4>
              </div>
              <p className="text-xs text-[#4B5347] leading-relaxed">
                They execute fragments of decisions — and carry the risk when the fragment turns out to be wrong.
              </p>
            </div>

            {/* Card 4: The Founder */}
            <div className="bg-white border border-hair rounded-[14px] p-6 shadow-[0_10px_28px_rgba(60,55,30,0.10)] hover:-translate-y-1 hover:shadow-lg transition duration-200 ease-out flex flex-col justify-between space-y-6 select-none animate-fade-up" style={{ animationDelay: '180ms' }}>
              <div className="space-y-3">
                <span className="font-ibmmono text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4A017]">
                  The Founder
                </span>
                <h4 className="font-fraunces text-base font-bold text-[#17200F] italic">
                  "What's being decided in my company right now?"
                </h4>
              </div>
              <p className="text-xs text-[#4B5347] leading-relaxed">
                Past ~150 people the nod stops scaling: decisions happen unseen and authority gets improvised.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 4. SECTION 4: THE ANSWER (Dark Band background #1E2B1C) */}
      <section className="py-[clamp(64px,7vw,110px)] bg-[#1E2B1C] text-[#FAF8F2] border-b border-hair">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-16">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto animate-fade-up">
            <span className="font-ibmmono text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A017]">
              THE ANSWER
            </span>
            <h2 className="font-fraunces text-[clamp(28px,3.6vw,44px)] font-bold text-[#FAF8F2] leading-[1.12]">
              One system, three <span className="text-[#D4A017]">[promises.]</span>
            </h2>
          </div>

          {/* Promise Cards: 3 across >= 860px */}
          <div className="grid grid-cols-1 min-[860px]:grid-cols-3 gap-8">
            
            {/* Promise 1 */}
            <div className="bg-white/5 border border-hair rounded-[14px] p-6 hover:-translate-y-1 transition duration-200 space-y-4 animate-fade-up">
              <span className="font-fraunces text-2xl font-bold text-[#D4A017]">01</span>
              <h3 className="font-fraunces text-lg font-bold text-[#FAF8F2]">Moves at inbox speed</h3>
              <p className="text-xs text-[#FAF8F2]/80 leading-relaxed">
                Approvers act straight from email: Approve, Reject, or Discuss. One click, full context, no training, no per-approver licences.
              </p>
            </div>

            {/* Promise 2 */}
            <div className="bg-white/5 border border-hair rounded-[14px] p-6 hover:-translate-y-1 transition duration-200 space-y-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
              <span className="font-fraunces text-2xl font-bold text-[#D4A017]">02</span>
              <h3 className="font-fraunces text-lg font-bold text-[#FAF8F2]">Proven forever</h3>
              <p className="text-xs text-[#FAF8F2]/80 leading-relaxed">
                Every decision is sealed: who approved, in what sequence, within what scope, on what reasoning. Tamper-evident and permanent — still legible when everyone involved has moved on.
              </p>
            </div>

            {/* Promise 3 */}
            <div className="bg-white/5 border border-hair rounded-[14px] p-6 hover:-translate-y-1 transition duration-200 space-y-4 animate-fade-up" style={{ animationDelay: '120ms' }}>
              <span className="font-fraunces text-2xl font-bold text-[#D4A017]">03</span>
              <h3 className="font-fraunces text-lg font-bold text-[#FAF8F2]">Lands intact</h3>
              <p className="text-xs text-[#FAF8F2]/80 leading-relaxed">
                Every decision becomes a linkable object carrying its full context, so the teams executing it read the source instead of the rumour.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 5. SECTION 5: START NOW (Alt centered background #F1EEE4) */}
      <section className="py-[clamp(64px,7vw,110px)] bg-[#F1EEE4] text-center">
        <div className="max-w-xl mx-auto px-5 sm:px-8 space-y-6 animate-fade-up">
          <span className="font-ibmmono text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A017]">
            START NOW
          </span>
          
          <h2 className="font-fraunces text-[clamp(28px,3.6vw,44px)] font-bold text-[#17200F] leading-[1.12]">
            Your company is the sum of its decisions. Start <span className="text-[#D4A017]">[keeping]</span> them.
          </h2>

          <p className="text-sm font-medium leading-[1.7] text-[#5E6657]">
            A 30-day pilot on a single approval flow. Priced per company, not per seat — every approver included.
          </p>

          <div className="pt-2">
            <a
              href={mailtoLink}
              className="inline-flex items-center justify-center px-10 py-4 bg-[#D4A017] hover:bg-[#E3B02A] text-[#17200F] text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_4px_12px_rgba(212,160,23,0.2)] hover:shadow-[0_6px_16px_rgba(212,160,23,0.3)] transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
            >
              Book a pilot
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
