import { ShieldCheck, Heart, Sparkles } from 'lucide-react';
import { PILOT_EMAIL } from '@/lib/site';

export default function AboutPage() {
  const mailtoLink = `mailto:${PILOT_EMAIL}?subject=SigmaGo%20pilot%20conversation`;

  return (
    <div className="bg-[#FAF8F2] text-[#17200F] font-inter">
      
      {/* 1. HERO SECTION */}
      <section className="py-[clamp(64px,7vw,110px)] border-b border-hair">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-6 animate-fade-up">
          <span className="inline-block font-ibmmono text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A017] bg-[#D4A017]/10 px-3 py-1 rounded-full">
            ABOUT
          </span>
          
          <h1 
            className="font-fraunces text-[#17200F] font-bold leading-[1.04] tracking-tight"
            style={{ fontSize: 'clamp(38px, 5.2vw, 66px)', letterSpacing: '-0.025em' }}
          >
            Built for companies that intend to <span className="text-[#D4A017]">[last.]</span>
          </h1>
          
          <p 
            className="text-[#5E6657] max-w-2xl font-medium leading-[1.7]"
            style={{ fontSize: 'clamp(17px, 1.4vw, 19px)' }}
          >
            SigmaGo is built in Hyderabad by Lucky Soma, an enterprise integration engineer who spent a decade inside HRMS and ERP systems watching the same meeting happen at every company: "who approved this?" — and nobody knew.
          </p>
        </div>
      </section>

      {/* 2. CARD VALUES SECTION (Why We Exist & What We Believe) */}
      <section className="py-[clamp(64px,7vw,110px)] border-b border-hair bg-[#FAF8F2]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Why We Exist */}
            <div className="bg-white border border-hair rounded-[14px] p-8 shadow-[0_10px_28px_rgba(60,55,30,0.10)] hover:-translate-y-1 hover:shadow-lg transition duration-200 ease-out space-y-4 animate-fade-up">
              <div className="w-10 h-10 rounded-lg bg-[#D4A017]/10 text-[#D4A017] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-fraunces text-xl font-bold text-[#17200F]">Why we exist</h3>
              <p className="text-xs text-[#4B5347] leading-relaxed font-inter">
                A company is the sum of its decisions, yet decisions are the one critical asset with no system of record: scattered across inboxes, chats, and memories that resign. SigmaGo closes that gap.
              </p>
            </div>

            {/* What We Believe */}
            <div className="bg-white border border-hair rounded-[14px] p-8 shadow-[0_10px_28px_rgba(60,55,30,0.10)] hover:-translate-y-1 hover:shadow-lg transition duration-200 ease-out space-y-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
              <div className="w-10 h-10 rounded-lg bg-[#D4A017]/10 text-[#D4A017] flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="font-fraunces text-xl font-bold text-[#17200F]">What we believe</h3>
              <p className="text-xs text-[#4B5347] leading-relaxed font-inter">
                Recording a decision should cost nothing at the moment it is made. Approvers should never have to learn a new tool. And the record should outlive every person named in it.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. CLOSING BAND (Alt centered background #F1EEE4) */}
      <section className="py-[clamp(64px,7vw,110px)] bg-[#F1EEE4] text-center border-b border-hair">
        <div className="max-w-xl mx-auto px-5 sm:px-8 space-y-6 animate-fade-up">
          <h2 className="font-fraunces text-[clamp(28px,3.6vw,44px)] font-bold text-[#17200F] leading-[1.12]">
            Start keeping your <span className="text-[#D4A017]">[decisions.]</span>
          </h2>
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
