import Link from 'next/link';
import { getSortedPostsData } from '@/lib/blog';
import { ArrowRight, BookOpen } from 'lucide-react';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).format(new Date(dateStr));
}

export default function BlogPage() {
  const posts = getSortedPostsData();

  return (
    <div className="bg-[#FAF8F2] text-[#17200F] font-inter">
      
      {/* 1. HERO SECTION */}
      <section className="py-[clamp(64px,7vw,110px)] border-b border-hair">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 space-y-6 animate-fade-up">
          <span className="inline-block font-ibmmono text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A017] bg-[#D4A017]/10 px-3 py-1 rounded-full">
            OUR THINKING
          </span>
          
          <h1 
            className="font-fraunces text-[#17200F] font-bold leading-[1.04] tracking-tight"
            style={{ fontSize: 'clamp(38px, 5.2vw, 66px)', letterSpacing: '-0.025em' }}
          >
            Notes on <span className="text-[#D4A017]">[Decision Debt.]</span>
          </h1>
          
          <p 
            className="text-[#5E6657] max-w-xl font-medium leading-[1.7]"
            style={{ fontSize: 'clamp(17px, 1.4vw, 19px)' }}
          >
            The unrecorded decisions every company is borrowing against — and what they cost.
          </p>
        </div>
      </section>

      {/* 2. POSTS GRID */}
      <section className="py-[clamp(64px,7vw,110px)] bg-[#FAF8F2]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {posts.map((post: any, idx: number) => {
              const isSoon = post.status === 'soon';
              
              if (isSoon) {
                return (
                  <div
                    key={post.slug}
                    className="bg-white border border-hair rounded-[14px] p-6 shadow-[0_10px_28px_rgba(60,55,30,0.10)] relative flex flex-col justify-between space-y-6 select-none animate-fade-up opacity-80"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-ibmmono text-xs uppercase tracking-wider text-gray-400">
                          {formatDate(post.date)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-[#D4A017]/10 text-[#D4A017] uppercase tracking-wider font-ibmmono border border-[#D4A017]/20">
                          COMING SOON
                        </span>
                      </div>
                      <h3 className="font-fraunces text-xl font-bold text-[#17200F]">
                        {post.title}
                      </h3>
                      <p className="text-xs text-[#4B5347] leading-relaxed">
                        {post.description}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="bg-white border border-hair rounded-[14px] p-6 shadow-[0_10px_28px_rgba(60,55,30,0.10)] hover:-translate-y-1 hover:shadow-lg transition duration-200 ease-out flex flex-col justify-between space-y-6 animate-fade-up group"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="space-y-3">
                    <span className="font-ibmmono text-xs uppercase tracking-wider text-[#D4A017] mb-1.5 block">
                      {formatDate(post.date)}
                    </span>
                    <h3 className="font-fraunces text-xl font-bold text-[#17200F] group-hover:text-[#D4A017] transition">
                      {post.title}
                    </h3>
                    <p className="text-xs text-[#4B5347] leading-relaxed">
                      {post.description}
                    </p>
                  </div>
                  <div className="inline-flex items-center text-xs font-bold text-[#D4A017] group-hover:text-[#E3B02A] transition">
                    Read essay <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </Link>
              );
            })}

            {posts.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted space-y-2">
                <BookOpen className="w-12 h-12 mx-auto text-muted/50" />
                <p className="text-sm font-semibold">No essays published yet.</p>
              </div>
            )}

          </div>
        </div>
      </section>

    </div>
  );
}
