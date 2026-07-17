import Link from 'next/link';
import { getSortedPostsData } from '@/lib/blog';
import { BookOpen, Calendar, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog - SigmaGo',
  description: 'Read our latest thinking on Decision Debt and how companies remember what they decide.',
};

export default function BlogIndexPage() {
  const posts = getSortedPostsData();

  return (
    <div className="bg-[#274C77] text-[#C9D5E7] font-ibmsans">
      {/* Header (Navy background #0C2340) */}
      <section className="bg-[#0C2340] py-20 md:py-24 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6 animate-fade-up">
          <span className="font-ibmmono text-xs uppercase tracking-widest text-[#C9A227]">
            [ Decision Debt Archive ]
          </span>
          <h1 className="text-3xl md:text-5xl font-ibmserif font-bold text-[#F5EAD1] leading-tight">
            Our <span className="text-[#C9A227]">Thinking</span>
          </h1>
          <p className="text-sm md:text-base text-[#C9D5E7] max-w-2xl mx-auto font-semibold leading-relaxed">
            We write about Decision Debt — the unrecorded decisions every company is borrowing against.
          </p>
        </div>
      </section>

      {/* Blog List (White cards) */}
      <section className="py-20 bg-[#274C77]">
        <div className="max-w-3xl mx-auto px-6 space-y-8 animate-fade-up" style={{ animationDelay: '100ms' }}>
          {posts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-[#274C77] shadow-[0_20px_50px_rgba(7,20,40,0.25)] border-0">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-[#C9A227]" />
              <p className="text-sm font-bold">No posts published yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => (
                <article key={post.slug} className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(7,20,40,0.25)] border-0 flex flex-col justify-between space-y-6 hover:translate-y-[-4px] transition duration-300">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-ibmmono font-bold text-[#C9A227] uppercase tracking-widest">
                      <Calendar className="w-4 h-4 text-[#C9A227]" />
                      <span>{post.date}</span>
                    </div>

                    <Link href={`/blog/${post.slug}`} className="block group">
                      <h2 className="text-xl sm:text-2xl font-ibmserif font-bold text-[#0C2340] group-hover:text-[#C9A227] transition">
                        {post.title}
                      </h2>
                    </Link>

                    <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                      {post.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center text-xs font-bold text-[#C9A227] hover:text-[#C9A227]/90 transition"
                    >
                      Read article <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
