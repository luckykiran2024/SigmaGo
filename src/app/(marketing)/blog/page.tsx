import Link from 'next/link';
import { getSortedPostsData } from '@/lib/blog';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Blog & Thinking — SigmaGo",
  description: "Notes on Decision Debt. The unrecorded decisions every company is borrowing against — and what they cost.",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).format(new Date(dateStr));
}

export default function BlogPage() {
  const posts = getSortedPostsData();

  return (
    <div className="bg-white text-ink font-sans">
      {/* HERO SECTION */}
      <section className="py-16 px-6 border-b border-border bg-section-alt">
        <div className="max-w-[1140px] mx-auto space-y-4">
          <span className="inline-block font-mono text-[13px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-3 py-1 rounded-[5px]">
            OUR THINKING
          </span>
          
          <h1 className="text-[34px] sm:text-[52px] font-bold text-ink leading-[1.1] tracking-tight">
            Notes on <span className="text-brand">[Decision Debt.]</span>
          </h1>
          
          <p className="text-[18px] text-muted max-w-2xl font-normal leading-[1.65]">
            The unrecorded decisions every company is borrowing against — and what they cost.
          </p>
        </div>
      </section>

      {/* POSTS GRID */}
      <section className="py-16 px-6 max-w-[1140px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post) => (
            <article 
              key={post.slug}
              className="bg-white border border-border rounded-[8px] p-6 space-y-4 flex flex-col justify-between hover:border-brand/40 transition shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[13px] font-mono text-muted">
                  <span>{formatDate(post.date)}</span>
                  {post.status === 'draft' && (
                    <span className="px-2 py-0.5 rounded-[5px] bg-brand/10 text-brand font-semibold text-[12px]">
                      COMING SOON
                    </span>
                  )}
                </div>

                <h3 className="text-[18px] font-bold text-ink leading-snug">
                  {post.title}
                </h3>

                <p className="text-[15px] text-muted line-clamp-3 leading-relaxed">
                  {post.description}
                </p>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[14px] font-mono text-muted">{post.author || 'SigmaGo'}</span>
                <Link 
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1.5 text-[15px] font-bold text-brand hover:text-brand-deep transition"
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
