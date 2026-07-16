import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSortedPostsData, getPostData } from '@/lib/blog';
import { Calendar, ArrowLeft, ArrowRight, Tag } from 'lucide-react';
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

  // prevPost is older (index + 1)
  const prevPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;
  // nextPost is newer (index - 1)
  const nextPost = currentIndex > 0 ? posts[currentIndex - 1] : null;

  return (
    <div className="bg-white font-sans text-ink">
      <article className="py-20 max-w-[700px] mx-auto px-6 space-y-8">
        
        {/* Back Link */}
        <div className="pb-4">
          <Link 
            href="/blog" 
            className="inline-flex items-center text-xs font-extrabold text-accent hover:text-accent-deep transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to blog
          </Link>
        </div>

        {/* Metadata Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-xxs font-bold text-gray-400 uppercase tracking-widest">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              {post.date}
            </span>
            {post.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 bg-gray-50 border border-gray-150 px-2 py-0.5 rounded text-gray-500">
                <Tag className="w-3 h-3 text-accent" />
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-ink leading-tight">
            {post.title}
          </h1>

          <p className="text-sm font-semibold text-gray-400 italic">
            {post.description}
          </p>
        </div>

        {/* Markdown Rendered Body */}
        <div 
          className="prose prose-zinc max-w-none text-ink font-sans text-lg leading-relaxed pt-6 border-t border-gray-100 prose-headings:text-ink prose-p:text-ink prose-a:text-accent hover:prose-a:text-accent-deep hover:underline prose-strong:text-ink prose-code:text-ink prose-blockquote:text-ink prose-blockquote:border-accent"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {/* Prev / Next Navigation */}
        <div className="border-t border-gray-100 pt-8 mt-12 flex flex-col sm:flex-row justify-between items-stretch gap-4 text-xs font-bold">
          {prevPost ? (
            <Link 
              href={`/blog/${prevPost.slug}`}
              className="flex-1 p-4 border border-gray-150 rounded-2xl hover:border-accent/40 text-left flex flex-col justify-between space-y-2 group transition"
            >
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Previous Post</span>
              <span className="text-ink group-hover:text-accent transition font-extrabold text-xs block line-clamp-1">{prevPost.title}</span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}

          {nextPost ? (
            <Link 
              href={`/blog/${nextPost.slug}`}
              className="flex-1 p-4 border border-gray-150 rounded-2xl hover:border-accent/40 text-right flex flex-col justify-between space-y-2 group transition"
            >
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Next Post</span>
              <span className="text-ink group-hover:text-accent transition font-extrabold text-xs block line-clamp-1">{nextPost.title}</span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>

      </article>
    </div>
  );
}
