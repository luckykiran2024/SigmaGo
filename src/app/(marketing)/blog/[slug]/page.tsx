import { getPostData, getSortedPostsData } from '@/lib/blog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).format(new Date(dateStr));
}

// Generate static params for all dynamic blog routes
export async function generateStaticParams() {
  const posts = getSortedPostsData();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const post = await getPostData(resolvedParams.slug);

  if (!post || post.status === 'soon') {
    notFound();
  }

  // Calculate reading time roughly: words / 200
  const wordCount = post.contentHtml.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="bg-[#FAF8F2] text-[#17200F] font-inter min-h-screen py-[clamp(64px,7vw,110px)]">
      <div className="max-w-[720px] mx-auto px-5 sm:px-8 space-y-8 animate-fade-up">
        
        {/* Back navigation link */}
        <Link 
          href="/blog"
          className="inline-flex items-center text-xs font-bold text-[#D4A017] hover:text-[#E3B02A] transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to all essays
        </Link>

        {/* Article Metadata line */}
        <span className="font-ibmmono text-xs uppercase tracking-wider text-[#D4A017] block">
          {formatDate(post.date)} · {post.author || 'Lucky Soma'} · {readTime} MIN READ
        </span>

        {/* Title */}
        <h1 className="font-fraunces text-3xl sm:text-4xl font-extrabold text-[#17200F] leading-tight">
          {post.title}
        </h1>

        {/* Main Content Area */}
        <article 
          className="prose max-w-none text-[#4B5347] font-inter select-text
                     prose-headings:font-fraunces prose-headings:text-[#17200F] prose-headings:font-bold
                     prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                     prose-p:mb-6 prose-p:leading-relaxed
                     prose-a:text-[#D4A017] hover:prose-a:text-[#E3B02A] prose-a:font-bold prose-a:no-underline hover:prose-a:underline"
          style={{ fontSize: '17.5px', lineHeight: '1.8' }}
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {/* Footer Back link */}
        <div className="pt-8 border-t border-hair mt-12">
          <Link 
            href="/blog"
            className="inline-flex items-center text-xs font-bold text-[#D4A017] hover:text-[#E3B02A] transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to all essays
          </Link>
        </div>

      </div>
    </div>
  );
}
