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
    <div className="bg-white font-sans text-ink">
      <section className="py-20 md:py-28 border-b border-gray-50">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-ink">
            Our Thinking
          </h1>
          <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto font-semibold">
            We write about Decision Debt — the unrecorded decisions every company is borrowing against.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 space-y-12">
          {posts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm font-bold">No posts published yet.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {posts.map((post) => (
                <article key={post.slug} className="group space-y-3">
                  <div className="flex items-center gap-2 text-xxs font-bold text-gray-400 uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>{post.date}</span>
                  </div>

                  <Link href={`/blog/${post.slug}`} className="block group-hover:text-accent transition">
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-ink group-hover:text-accent transition">
                      {post.title}
                    </h2>
                  </Link>

                  <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                    {post.description}
                  </p>

                  <div className="pt-2">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center text-xs font-extrabold text-accent hover:text-accent-deep transition"
                    >
                      Read article <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
