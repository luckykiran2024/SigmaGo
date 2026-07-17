import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSortedPostsData, getPostData } from '@/lib/blog';
import { Calendar, ArrowLeft, Tag } from 'lucide-react';
import type { Metadata } from 'next';

interface Params {
  slug: string;
}

export async function generateStaticParams() {
  const posts = getSortedPostsData();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getPostData(resolvedParams.slug);

  if (!post) {
    return {
      title: 'Post Not Found - SigmaGo',
    };
  }

  return {
    title: `${post.title} - SigmaGo Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolvedParams = await params;
  const post = await getPostData(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  // Resolve prev and next posts
  const posts = getSortedPostsData();
  const currentIndex = posts.findIndex((p) => p.slug === resolvedParams.slug);

  const prevPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? posts[currentIndex - 1] : null;

  return (
    <div className="bg-[#274C77] text-[#C9D5E7] font-ibmsans">
      <section className="py-16 md:py-24 max-w-[760px] mx-auto px-6 space-y-8 animate-fade-up">
        
        {/* Back Link */}
        <div className="pb-2">
          <Link 
            href="/blog" 
            className="inline-flex items-center text-xs font-bold text-[#C9A227] hover:text-[#C9A227]/90 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to blog
          </Link>
        </div>

        {/* White Card content */}
        <article className="bg-white rounded-3xl p-8 sm:p-12 shadow-[0_20px_50px_rgba(7,20,40,0.25)] border-0 space-y-8 text-[#274C77]">
          
          {/* Metadata Header */}
          <div className="space-y-4 border-b border-gray-100 pb-6">
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-ibmmono font-bold text-gray-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5 text-[#C9A227]">
                <Calendar className="w-4 h-4" />
                {post.date}
              </span>
              {post.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 bg-gray-50 border border-gray-150 px-2 py-0.5 rounded text-gray-500">
                  <Tag className="w-3 h-3 text-[#C9A227]" />
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl font-ibmserif font-bold text-[#0C2340] leading-tight">
              {post.title}
            </h1>

            <p className="text-xs font-semibold text-gray-400 italic">
              {post.description}
            </p>
          </div>

          {/* Markdown Rendered Body in Plex Sans 19px with navy headings */}
          <div 
            className="prose prose-zinc max-w-none text-[#274C77] font-ibmsans text-[19px] leading-[1.65] prose-headings:font-ibmserif prose-headings:text-[#0C2340] prose-p:text-[#274C77] prose-a:text-[#C9A227] hover:prose-a:text-[#C9A227]/90 hover:underline prose-strong:text-[#0C2340] prose-code:text-[#0C2340] prose-blockquote:text-[#0C2340] prose-blockquote:border-[#C9A227] select-text"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          {/* Prev / Next Navigation */}
          <div className="border-t border-gray-100 pt-8 mt-12 flex flex-col sm:flex-row justify-between items-stretch gap-4 text-xs font-bold font-ibmmono">
            {prevPost ? (
              <Link 
                href={`/blog/${prevPost.slug}`}
                className="flex-1 p-4 border border-gray-150 rounded-2xl hover:border-[#C9A227]/45 text-left flex flex-col justify-between space-y-2 group transition"
              >
                <span className="text-[9px] uppercase tracking-wider text-gray-400">Previous Post</span>
                <span className="text-[#0C2340] group-hover:text-[#C9A227] transition font-bold text-xs block line-clamp-1">{prevPost.title}</span>
              </Link>
            ) : (
              <div className="flex-1" />
            )}

            {nextPost ? (
              <Link 
                href={`/blog/${nextPost.slug}`}
                className="flex-1 p-4 border border-gray-150 rounded-2xl hover:border-[#C9A227]/45 text-right flex flex-col justify-between space-y-2 group transition"
              >
                <span className="text-[9px] uppercase tracking-wider text-gray-400">Next Post</span>
                <span className="text-[#0C2340] group-hover:text-[#C9A227] transition font-bold text-xs block line-clamp-1">{nextPost.title}</span>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </div>

        </article>
      </section>
    </div>
  );
}
