import Link from 'next/link';
import React from 'react';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-ink font-sans flex flex-col antialiased">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center shadow-sm shadow-ink/10 group-hover:scale-105 transition">
              <span className="text-white font-black text-xs tracking-tight">SG</span>
            </div>
            <span className="font-extrabold text-lg text-ink tracking-tight">SigmaGo</span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-600">
            <Link href="/product" className="hover:text-ink transition">Product</Link>
            <Link href="/blog" className="hover:text-ink transition">Blog</Link>
            <Link href="/about" className="hover:text-ink transition">About</Link>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-gray-600 hover:text-ink transition">
              Sign in
            </Link>
            <a
              href="mailto:pilot@sigmago.co?subject=SigmaGo%20pilot%20conversation"
              className="inline-flex items-center justify-center px-4 py-2 bg-accent hover:bg-accent-deep text-white text-xs font-extrabold rounded-xl shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
            >
              Book a pilot
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-ink flex items-center justify-center">
                <span className="text-white font-black text-3xs">SG</span>
              </div>
              <span className="font-extrabold text-sm text-ink tracking-tight">SigmaGo</span>
            </div>
            <p className="text-xs text-gray-400 font-semibold">
              The system of record for company decisions.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs font-bold text-gray-500">
            <Link href="/product" className="hover:text-ink transition">Product</Link>
            <Link href="/blog" className="hover:text-ink transition">Blog</Link>
            <Link href="/about" className="hover:text-ink transition">About</Link>
            <Link href="/login" className="hover:text-ink transition">Sign in</Link>
          </div>

          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            © 2026 SigmaGo.
          </div>
        </div>
      </footer>
    </div>
  );
}
