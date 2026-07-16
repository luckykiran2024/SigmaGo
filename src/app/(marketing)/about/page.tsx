import Link from 'next/link';
import { ArrowRight, BookOpen, MapPin } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About - SigmaGo',
  description: 'Built in Hyderabad by Lucky Soma. Stop forgetting your own company decisions.',
};

export default function AboutPage() {
  return (
    <div className="bg-white font-sans text-ink">
      <section className="py-20 md:py-32">
        <div className="max-w-xl mx-auto px-6 space-y-8">
          
          <div className="space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">
              About SigmaGo
            </h1>
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              <span>Hyderabad, India</span>
            </div>
          </div>

          <div className="space-y-6 text-sm text-gray-500 font-semibold leading-relaxed">
            <p>
              SigmaGo is built in Hyderabad by Lucky Soma, an enterprise integration engineer who spent a decade inside HRMS/ERP systems watching the same meeting happen everywhere: <span className="text-ink font-bold">"who approved this?"</span> — and nobody knew.
            </p>
            <p>
              SigmaGo exists so companies stop forgetting their own decisions. By creating a unified system of record, we make audits effortless and keep organizational context permanent.
            </p>
          </div>

          {/* Our thinking block */}
          <div className="bg-panel border border-gray-150 p-6 rounded-2xl space-y-4 pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Our thinking</h3>
            </div>
            <p className="text-xs text-gray-500 font-semibold leading-relaxed">
              We write about <span className="text-ink font-bold">Decision Debt</span> — the unrecorded decisions every company is borrowing against.
            </p>
            <div className="pt-2">
              <Link 
                href="/blog" 
                className="inline-flex items-center text-xs font-extrabold text-accent hover:text-accent-deep transition"
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
