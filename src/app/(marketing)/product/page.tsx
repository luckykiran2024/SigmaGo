import { ArrowRight, Code, Settings, Share2, Layers } from 'lucide-react';
import { PILOT_EMAIL } from '@/lib/site';

export default function ProductPage() {
  const mailtoLink = `mailto:${PILOT_EMAIL}?subject=SigmaGo%20pilot%20conversation`;

  return (
    <div className="bg-[#F6F8F9] text-[#182B3D] font-inter">
      
      {/* 1. HERO SECTION */}
      <section className="py-[clamp(64px,7vw,110px)] border-b border-border">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-6 animate-fade-up">
          <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#0B7780] bg-[#0B7780]/10 px-3 py-1 rounded-md">
            PRODUCT
          </span>
          
          <h1 
            className="font-sans text-[#182B3D] font-bold leading-[1.04] tracking-tight"
            style={{ fontSize: 'clamp(38px, 5.2vw, 66px)', letterSpacing: '-0.025em' }}
          >
            From request to <span className="text-[#0B7780]">trusted record.</span>
          </h1>
          
          <p 
            className="text-[#637587] max-w-xl font-medium leading-[1.7]"
            style={{ fontSize: 'clamp(17px, 1.4vw, 19px)' }}
          >
            A clear path from submission and review to a traceable final decision.
          </p>
        </div>
      </section>

      {/* 2. THE STEPS GRID (4 across >= 1080px, 2 across >= 700px, 1 below) */}
      <section className="py-[clamp(64px,7vw,110px)] border-b border-border bg-[#F6F8F9]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 min-[700px]:grid-cols-2 min-[1080px]:grid-cols-4 gap-8">
            
            {/* Step 1 */}
            <div className="bg-white border border-border rounded-lg p-6 shadow-[0_10px_28px_rgba(12,28,45,0.08)] hover:-translate-y-1 hover:shadow-lg transition duration-200 ease-out space-y-4 select-none animate-fade-up">
              <span className="font-sans text-2xl font-bold text-[#0B7780]">1</span>
              <h3 className="font-sans text-lg font-bold text-[#182B3D]">Raise</h3>
              <p className="text-[15px] text-[#526679] leading-relaxed">
                Capture the decision, relevant context, and supporting documents in one structured request.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-border rounded-lg p-6 shadow-[0_10px_28px_rgba(12,28,45,0.08)] hover:-translate-y-1 hover:shadow-lg transition duration-200 ease-out space-y-4 select-none animate-fade-up" style={{ animationDelay: '60ms' }}>
              <span className="font-sans text-2xl font-bold text-[#0B7780]">2</span>
              <h3 className="font-sans text-lg font-bold text-[#182B3D]">Route</h3>
              <p className="text-[15px] text-[#526679] leading-relaxed">
                The path runs in stages: each Direct gate approves, Parallel sign-offs open together, then the next stage begins. FYI parties are notified without blocking.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-border rounded-lg p-6 shadow-[0_10px_28px_rgba(12,28,45,0.08)] hover:-translate-y-1 hover:shadow-lg transition duration-200 ease-out space-y-4 select-none animate-fade-up" style={{ animationDelay: '120ms' }}>
              <span className="font-sans text-2xl font-bold text-[#0B7780]">3</span>
              <h3 className="font-sans text-lg font-bold text-[#182B3D]">Decide</h3>
              <p className="text-[15px] text-[#526679] leading-relaxed">
                Approvers can approve, reject, or discuss with a recorded comment. Delegated actions retain their authority trail.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-border rounded-lg p-6 shadow-[0_10px_28px_rgba(12,28,45,0.08)] hover:-translate-y-1 hover:shadow-lg transition duration-200 ease-out space-y-4 select-none animate-fade-up" style={{ animationDelay: '180ms' }}>
              <span className="font-sans text-2xl font-bold text-[#0B7780]">4</span>
              <h3 className="font-sans text-lg font-bold text-[#182B3D]">Prove</h3>
              <p className="text-[15px] text-[#526679] leading-relaxed">
                Finalise a sealed record of who decided, when, under which policy, and on what basis.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. THE ARTIFACT SECTION (Alt background #ECF6F5) */}
      <section className="py-[clamp(64px,7vw,110px)] bg-[#ECF6F5] border-b border-border">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto animate-fade-up">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#0B7780]">
              THE ARTIFACT
            </span>
            <h2 className="font-sans text-[clamp(28px,3.6vw,44px)] font-bold text-[#182B3D] leading-[1.12]">
              A record that answers <span className="text-[#0B7780]">five questions.</span>
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
            
            {/* Question 1: Authority */}
            <div className="bg-white border border-border rounded-lg p-5 sm:p-6 shadow-[0_10px_28px_rgba(12,28,45,0.08)] hover:-translate-y-0.5 transition duration-150">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0B7780] block mb-1">
                Authority
              </span>
              <h4 className="font-sans text-base font-bold text-[#182B3D] mb-1.5">Did the right people approve?</h4>
              <p className="text-xs text-[#526679] leading-relaxed">
                Staged roles, with delegation recorded as "on behalf of."
              </p>
            </div>

            {/* Question 2: Sequence */}
            <div className="bg-white border border-border rounded-lg p-5 sm:p-6 shadow-[0_10px_28px_rgba(12,28,45,0.08)] hover:-translate-y-0.5 transition duration-150">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0B7780] block mb-1">
                Sequence
              </span>
              <h4 className="font-sans text-base font-bold text-[#182B3D] mb-1.5">In what order?</h4>
              <p className="text-xs text-[#526679] leading-relaxed">
                Direct → Parallel → next stage, enforced by the engine and shown on the record.
              </p>
            </div>

            {/* Question 3: Reasoning */}
            <div className="bg-white border border-border rounded-lg p-5 sm:p-6 shadow-[0_10px_28px_rgba(12,28,45,0.08)] hover:-translate-y-0.5 transition duration-150">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0B7780] block mb-1">
                Reasoning
              </span>
              <h4 className="font-sans text-base font-bold text-[#182B3D] mb-1.5">On what basis?</h4>
              <p className="text-xs text-[#526679] leading-relaxed">
                Comments, the Discuss trail, and every change to the path logged with who made it and why.
              </p>
            </div>

            {/* Question 4: Authenticity */}
            <div className="bg-white border border-border rounded-lg p-5 sm:p-6 shadow-[0_10px_28px_rgba(12,28,45,0.08)] hover:-translate-y-0.5 transition duration-150">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0B7780] block mb-1">
                Authenticity
              </span>
              <h4 className="font-sans text-base font-bold text-[#182B3D] mb-1.5">Altered since?</h4>
              <p className="text-xs text-[#526679] leading-relaxed">
                A SHA-256 integrity seal; any change invalidates the record.
              </p>
            </div>

            {/* Question 5: Permanence */}
            <div className="bg-white border border-border rounded-lg p-5 sm:p-6 shadow-[0_10px_28px_rgba(12,28,45,0.08)] hover:-translate-y-0.5 transition duration-150">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0B7780] block mb-1">
                Permanence
              </span>
              <h4 className="font-sans text-base font-bold text-[#182B3D] mb-1.5">Will it survive the people and the tools?</h4>
              <p className="text-xs text-[#526679] leading-relaxed">
                An append-only trail with human-readable snapshots, legible after every exit.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 4. FITS YOUR STACK SECTION (Dark background #101828) */}
      <section className="py-[clamp(64px,7vw,110px)] bg-[#101828] text-[#F6F8F9] border-b border-border">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto animate-fade-up">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#0B7780]">
              FITS YOUR STACK
            </span>
            <h2 className="font-sans text-[clamp(28px,3.6vw,44px)] font-bold text-[#F6F8F9] leading-[1.12]">
              Keep your tools. Gain a <span className="text-[#0B7780]">clear decision trail.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* API */}
            <div className="bg-white/5 border border-border rounded-lg p-6 hover:-translate-y-1 transition duration-200 space-y-4 animate-fade-up">
              <div className="w-10 h-10 rounded-lg bg-[#0B7780]/10 text-[#0B7780] flex items-center justify-center">
                <Code className="w-5 h-5" />
              </div>
              <h3 className="font-sans text-lg font-bold text-[#F6F8F9]">Open API</h3>
              <p className="text-xs text-[#F6F8F9]/80 leading-relaxed font-inter">
                REST endpoints and signed webhooks: connect any system, not just one vendor's.
              </p>
            </div>

            {/* Ticket-friendly */}
            <div className="bg-white/5 border border-border rounded-lg p-6 hover:-translate-y-1 transition duration-200 space-y-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
              <div className="w-10 h-10 rounded-lg bg-[#0B7780]/10 text-[#0B7780] flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <h3 className="font-sans text-lg font-bold text-[#F6F8F9]">Ticket-friendly</h3>
              <p className="text-xs text-[#F6F8F9]/80 leading-relaxed font-inter">
                Jira and Freshdesk connect through their own no-code automation in minutes.
              </p>
            </div>

            {/* Org-aware */}
            <div className="bg-white/5 border border-border rounded-lg p-6 hover:-translate-y-1 transition duration-200 space-y-4 animate-fade-up" style={{ animationDelay: '120ms' }}>
              <div className="w-10 h-10 rounded-lg bg-[#0B7780]/10 text-[#0B7780] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-sans text-lg font-bold text-[#F6F8F9]">Org-aware</h3>
              <p className="text-xs text-[#F6F8F9]/80 leading-relaxed font-inter">
                Hierarchy via CSV or HRMS sync, with a searchable people picker that holds up past 1,000 headcount.
              </p>
            </div>
          </div>

          {/* Small Honest Security Line */}
          <div className="pt-8 border-t border-border text-center max-w-xl mx-auto animate-fade-up" style={{ animationDelay: '180ms' }}>
            <p className="text-[11px] font-mono tracking-wide text-[#F6F8F9]/65 leading-relaxed uppercase">
              Tenant-isolated data, token-secured email actions, append-only audit trail. SSO and enterprise security hardening are on the roadmap.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}
