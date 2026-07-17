import Link from 'next/link';
import { ArrowRight, BookOpen, MapPin } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About - SigmaGo',
  description: 'Built in Hyderabad by Lucky Soma. Stop forgetting your own company decisions.',
};

export default function AboutPage() {
  return (
    <div className="bg-[#274C77] text-[#C9D5E7] font-ibmsans">
      <section className="py-20 md:py-32">
        <div className="max-w-xl mx-auto px-6 space-y-8 animate-fade-up">
          
          <div className="space-y-4">
            <span className="font-ibmmono text-xs uppercase tracking-widest text-[#C9A227]">
              [ The Founder Story ]
            </span>
            <h1 className="text-3xl font-ibmserif font-bold text-[#F5EAD1]">
              About SigmaGo
            </h1>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#C9D5E7]">
              <MapPin className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Hyderabad, India</span>
            </div>
          </div>

          {/* White Card content */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(7,20,40,0.25)] border-0 space-y-6 text-[#274C77] text-base leading-relaxed">
            <p>
              SigmaGo is built in Hyderabad by Lucky Soma, an enterprise integration engineer who spent a decade inside HRMS/ERP systems watching the same meeting happen everywhere: <span className="text-[#0C2340] font-bold">"who approved this?"</span> — and nobody knew.
            </p>
            <p>
              SigmaGo exists so companies stop forgetting their own decisions. By creating a unified system of record, we make audits effortless and keep organizational context permanent.
            </p>
          </div>

          {/* Our thinking block (White Card content) */}
          <div className="bg-white rounded-3xl p-8 shadow-[0_20px_50px_rgba(7,20,40,0.25)] border-0 space-y-4 text-[#274C77]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#C9A227]" />
              <h3 className="text-sm font-bold text-[#0C2340] uppercase tracking-wider font-ibmmono">Our thinking</h3>
            </div>
            <p className="text-xs text-gray-500 font-semibold leading-relaxed">
              We write about <span className="text-[#0C2340] font-bold">Decision Debt</span> — the unrecorded decisions every company is borrowing against.
            </p>
            <div className="pt-2">
              <Link 
                href="/blog" 
                className="inline-flex items-center text-xs font-extrabold text-[#C9A227] hover:text-[#C9A227]/90 transition"
              >
                Read our thoughts <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
