import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Mail, Lock, Search, FileText, Check, Shield } from 'lucide-react';
import type { Metadata } from 'next';

const PILOT_EMAIL = 'pilot@sigmago.co';
const mailtoLink = `mailto:${PILOT_EMAIL}?subject=SigmaGo%20pilot%20conversation`;

export const metadata: Metadata = {
  title: "SigmaGo — The system of record for company decisions",
  description: "Every rupee is accounted for. Every decision should be too. SigmaGo keeps the books for your decisions — who approved what, in what order, on what reasoning. Sealed, provable, findable.",
};

export default function MarketingLandingPage() {
  return (
    <div className="bg-white text-ink font-sans antialiased min-h-screen flex flex-col justify-between selection:bg-brand/20">
      {/* SECTION 1 — NAV (sticky) */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-xs">
        <div className="max-w-[1140px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-ink">
            <span className="w-7 h-7 bg-brand text-white rounded-md flex items-center justify-center text-xs font-mono font-bold">
              SG
            </span>
            <span className="font-bold tracking-tight text-ink text-base">SigmaGo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-muted">
            <Link href="/product" className="hover:text-ink transition">Product</Link>
            <a href="#how-it-works" className="hover:text-ink transition">How it works</a>
            <a href="#proof" className="hover:text-ink transition">Proof</a>
            <Link href="/blog" className="hover:text-ink transition">Blog</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-bg rounded-md transition">
              Log in
            </Link>
            <a
              href={mailtoLink}
              className="px-4 py-2 bg-brand hover:bg-brand-deep text-white text-xs font-semibold rounded-md transition shadow-xs"
            >
              Request a pilot
            </a>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* SECTION 2 — HERO */}
        <section className="pt-16 pb-12 px-6 text-center max-w-[760px] mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-[20px] bg-brand/10 text-brand border border-brand/20 text-xs font-semibold">
            <span>For companies drowning in Decision Debt</span>
          </div>

          <h1 className="text-[44px] font-bold leading-[1.1] tracking-[-0.02em] text-ink">
            Every rupee is accounted for.<br />
            Every <span className="text-brand">decision</span> should be too.
          </h1>

          <p className="text-[17px] text-muted leading-[1.65] max-w-[540px] mx-auto font-normal">
            Where companies keep books for their money, SigmaGo keeps the books for their decisions. Capture who approved what, in what order, on what reasoning — sealed and provable years later.
          </p>

          <div className="flex items-center justify-center gap-3 pt-3">
            <a
              href={mailtoLink}
              className="px-6.5 py-3 bg-brand hover:bg-brand-deep text-white text-[15px] font-semibold rounded-md transition shadow-xs flex items-center gap-2"
            >
              <span>Request a pilot</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#how-it-works"
              className="px-6.5 py-3 bg-white border border-border text-ink hover:bg-bg text-[15px] font-semibold rounded-md transition"
            >
              See how it works
            </a>
          </div>
        </section>

        {/* SECTION 3 — PRODUCT VISUAL */}
        <section className="px-6 pb-20 max-w-[920px] mx-auto">
          <div className="bg-white border border-border rounded-[10px] shadow-[0_1px_3px_rgba(16,24,40,0.05),0_12px_32px_rgba(16,24,40,0.08)] overflow-hidden">
            {/* Browser Bar */}
            <div className="bg-ink px-4 py-2.5 flex items-center justify-between text-xs font-mono border-b border-border">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              </div>
              <span className="text-white/60 font-medium">sigmago.co/meridian/decisions</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> SECURED
              </span>
            </div>

            {/* Product Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-bg text-muted font-mono font-bold uppercase text-[11.5px]">
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Decision Subject</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Integrity Seal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  <tr className="hover:bg-bg/40">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand">REQ-2026-0814</td>
                    <td className="px-5 py-3.5 text-ink font-bold">Q3 Enterprise Procurement Vendor Waiver</td>
                    <td className="px-5 py-3.5 text-muted">Transactional</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-[5px] bg-ok/10 text-ok font-semibold text-xs">Approved</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-seal font-bold flex items-center justify-end gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-seal shadow-[0_0_6px_rgba(201,162,39,0.5)]" />
                      <span>SHA-256 Sealed</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-bg/40">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand">REQ-2026-0815</td>
                    <td className="px-5 py-3.5 text-ink font-bold">Senior VP Engineering Offer Approval</td>
                    <td className="px-5 py-3.5 text-muted">Structural</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-[5px] bg-ok/10 text-ok font-semibold text-xs">Approved</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-seal font-bold flex items-center justify-end gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-seal shadow-[0_0_6px_rgba(201,162,39,0.5)]" />
                      <span>SHA-256 Sealed</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-bg/40">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand">REQ-2026-0816</td>
                    <td className="px-5 py-3.5 text-ink font-bold">Out-of-cycle Salary Adjustments</td>
                    <td className="px-5 py-3.5 text-muted">Exception</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-[5px] bg-brand/10 text-brand font-semibold text-xs">In Review</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-muted font-bold flex items-center justify-end gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-muted" />
                      <span>Unsealed</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 4 — THE PROBLEM (white bg) */}
        <section className="py-24 px-6 border-t border-border bg-white">
          <div className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-brand font-mono">THE PROBLEM</span>
              <h2 className="text-[30px] font-bold leading-[1.2] text-ink">
                Your decisions live in inboxes, threads, and the memory of people who leave.
              </h2>
              <p className="text-muted leading-[1.65] text-[16px]">
                When an executive leaves or a dispute arises eighteen months later, companies spend weeks on email archaeology trying to reconstruct why a decision was made.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-md bg-brand/10 text-brand flex items-center justify-center shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-ink">Email archaeology</h4>
                    <p className="text-xs text-muted leading-relaxed mt-0.5">
                      Searching Slack channels and inbox archives for weeks trying to figure out who agreed to what terms.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-md bg-brand/10 text-brand flex items-center justify-center shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-ink">Re-debating settled calls</h4>
                    <p className="text-xs text-muted leading-relaxed mt-0.5">
                      Every new leader re-litigates decisions made six months ago because no institutional record exists.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-md bg-brand/10 text-brand flex items-center justify-center shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-ink">Unmitigated decision risk</h4>
                    <p className="text-xs text-muted leading-relaxed mt-0.5">
                      Carrying personal or organizational risk when audits, disputes, or diligence reviews challenge prior calls.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Email Thread Visual */}
            <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-bg border border-border rounded-md text-xs text-muted">
                <Search className="w-3.5 h-3.5 text-muted" />
                <span>Search: "vendor waiver approval Q3"</span>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="bg-bg p-3 rounded-md space-y-1">
                  <div className="text-[11px] font-bold text-muted">From: Arjun (Procurement) — Oct 14</div>
                  <div className="text-ink">Can we get sign-off for the vendor exception before Friday?</div>
                </div>

                <div className="bg-brand/10 text-brand p-3 rounded-md space-y-1 ml-6 border border-brand/20">
                  <div className="text-[11px] font-bold text-brand">From: CFO — Oct 15</div>
                  <div className="font-semibold">Yes proceed, but make sure legal reviews the liability cap.</div>
                </div>

                <div className="bg-err/10 border border-err/20 text-err p-3 rounded-md space-y-1">
                  <div className="text-[11px] font-bold">System Notice</div>
                  <div>Mailbox purged: User left organization. Thread history unavailable.</div>
                </div>
              </div>

              <div className="pt-2 text-center text-xs font-mono text-muted">
                The decision happened. The record didn't survive.
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5 — HOW IT WORKS (section-alt bg) */}
        <section id="how-it-works" className="py-24 px-6 border-t border-border bg-[#F9FAFB]">
          <div className="max-w-[1140px] mx-auto space-y-12">
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-brand font-mono">THE FRAMEWORK</span>
              <h2 className="text-[30px] font-bold text-ink tracking-tight">Record. Retrieve. Rely. Reuse.</h2>
              <p className="text-muted text-sm leading-relaxed">
                The four-step lifecycle that turns chaotic conversations into provable organizational assets.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white border border-border rounded-lg p-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-brand text-white flex items-center justify-center font-bold font-mono text-sm">
                  R1
                </div>
                <h4 className="text-base font-bold text-ink">1. Record</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Capture who approved what, in what order, on what reasoning — sealed automatically upon final sign-off.
                </p>
              </div>

              <div className="bg-white border border-border rounded-lg p-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-brand text-white flex items-center justify-center font-bold font-mono text-sm">
                  R2
                </div>
                <h4 className="text-base font-bold text-ink">2. Retrieve</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Instant parameterized search and natural-language query assistant — zero email archaeology.
                </p>
              </div>

              <div className="bg-white border border-border rounded-lg p-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-brand text-white flex items-center justify-center font-bold font-mono text-sm">
                  R3
                </div>
                <h4 className="text-base font-bold text-ink">3. Rely</h4>
                <p className="text-xs text-muted leading-relaxed">
                  SHA-256 tamper-evident Approval Certificates legible years later, even after key personnel leave.
                </p>
              </div>

              <div className="bg-white border border-border rounded-lg p-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-brand text-white flex items-center justify-center font-bold font-mono text-sm">
                  R4
                </div>
                <h4 className="text-base font-bold text-ink">4. Reuse</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Supply the missing 4th input: prior decision patterns so your company stops re-debating settled calls.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6 — THE PROOF (white bg) */}
        <section id="proof" className="py-24 px-6 border-t border-border bg-white">
          <div className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-brand font-mono">THE PROOF</span>
              <h2 className="text-[30px] font-bold text-ink leading-[1.2]">
                An Approval Certificate that survives the people who made it.
              </h2>
              <p className="text-muted leading-[1.65] text-[16px]">
                Every finalized decision generates an independent, tamper-evident certificate with cryptographic proof.
              </p>

              <div className="space-y-3 pt-2 text-xs font-semibold text-ink">
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-ok shrink-0" />
                  <span><strong>Authority</strong>: Verifiable record of assigned approver and delegate sign-offs.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-ok shrink-0" />
                  <span><strong>Sequence</strong>: Exact timestamped stage order and decision timestamps.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-ok shrink-0" />
                  <span><strong>Reasoning</strong>: Mandatory circumstance notes and attached evidence files.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-ok shrink-0" />
                  <span><strong>Authenticity</strong>: Cryptographic SHA-256 checksum seal locking document content.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-ok shrink-0" />
                  <span><strong>Permanence</strong>: Independent certificate legible after employees leave.</span>
                </div>
              </div>
            </div>

            {/* Right Column: Mini Certificate Preview */}
            <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
              <div className="bg-ink px-5 py-3 text-white flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-seal" />
                  <span>SigmaGo</span>
                </div>
                <span className="font-mono text-white/70 text-[11px] uppercase tracking-wider">APPROVAL CERTIFICATE</span>
              </div>

              <div className="p-5 space-y-3 text-xs font-medium">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted">Document Ref</span>
                  <span className="font-mono font-bold text-ink">REQ-2026-0814</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted">Subject</span>
                  <span className="font-bold text-ink">Vendor Liability Waiver</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted">Final Status</span>
                  <span className="text-ok font-bold uppercase">APPROVED</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted">Finalized Date</span>
                  <span className="font-mono text-ink">2026-07-25 14:30 UTC</span>
                </div>

                {/* Dashed Checksum Block */}
                <div className="border border-dashed border-border rounded-md p-3 bg-bg space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted font-mono">
                    <Shield className="w-3.5 h-3.5 text-brand" />
                    <span>SHA-256 INTEGRITY SEAL</span>
                  </div>
                  <div className="font-mono text-[10px] text-muted break-all">
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </div>
                </div>

                {/* Footer Seal Badge */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-double border-seal flex items-center justify-center text-seal font-bold">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-mono font-bold text-ink">SigmaGo Verified</div>
                      <div className="text-[11px] text-muted font-mono">Tamper-evident record</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7 — STATS (section-alt bg) */}
        <section className="py-16 px-6 border-t border-border bg-[#F9FAFB]">
          <div className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-[40px] font-bold text-brand font-mono">4</div>
              <div className="text-xs font-medium text-muted max-w-[200px] mx-auto">
                Dimensions every decision travels: Sideways, Backward, Downward, Forward.
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[40px] font-bold text-brand font-mono">5</div>
              <div className="text-xs font-medium text-muted max-w-[200px] mx-auto">
                Levels of organizational decision maturity from Tribal to Evidenced.
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[40px] font-bold text-brand font-mono">1</div>
              <div className="text-xs font-medium text-muted max-w-[200px] mx-auto">
                Tamper-evident Approval Certificate for complete governance peace of mind.
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8 — BUILT FOR (white bg) */}
        <section className="py-24 px-6 border-t border-border bg-white">
          <div className="max-w-[1140px] mx-auto space-y-12">
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-brand font-mono">FOR YOUR TEAM</span>
              <h2 className="text-[30px] font-bold text-ink tracking-tight">
                Four people in every company, one decision object.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white border border-border rounded-lg p-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-brand/10 text-brand flex items-center justify-center font-bold text-lg">
                  👔
                </div>
                <h4 className="text-base font-bold text-ink">Leader</h4>
                <p className="text-xs text-muted leading-relaxed">
                  "Inbox stops being your memory."
                </p>
              </div>

              <div className="bg-white border border-border rounded-lg p-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-brand/10 text-brand flex items-center justify-center font-bold text-lg">
                  🏃
                </div>
                <h4 className="text-base font-bold text-ink">Employee</h4>
                <p className="text-xs text-muted leading-relaxed">
                  "Facts, not vibes."
                </p>
              </div>

              <div className="bg-white border border-border rounded-lg p-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-brand/10 text-brand flex items-center justify-center font-bold text-lg">
                  ⚖️
                </div>
                <h4 className="text-base font-bold text-ink">Cross-functions</h4>
                <p className="text-xs text-muted leading-relaxed">
                  "Stop carrying others' risk."
                </p>
              </div>

              <div className="bg-white border border-border rounded-lg p-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-brand/10 text-brand flex items-center justify-center font-bold text-lg">
                  🚀
                </div>
                <h4 className="text-base font-bold text-ink">Founder</h4>
                <p className="text-xs text-muted leading-relaxed">
                  "Letting go without losing grip."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9 — CTA (section-alt bg, top border) */}
        <section className="py-20 px-6 border-t border-border bg-[#F9FAFB]">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-[32px] font-bold text-ink tracking-tight">
              Start keeping the other books.
            </h2>
            <p className="text-muted text-base max-w-lg mx-auto leading-relaxed">
              Give your company's decisions the same permanence, clarity, and proof that financial transactions have enjoyed for 500 years.
            </p>
            <div>
              <a
                href={mailtoLink}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand hover:bg-brand-deep text-white text-[15px] font-semibold rounded-md transition shadow-xs"
              >
                <span>Request a pilot</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* SECTION 10 — FOOTER */}
      <footer className="border-t border-border bg-white py-8 px-6">
        <div className="max-w-[1140px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink font-mono">SigmaGo</span>
            <span>— The system of record for company decisions</span>
          </div>
          <div>
            © {new Date().getFullYear()} SigmaGo. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
