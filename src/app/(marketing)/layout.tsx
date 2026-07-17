import Link from 'next/link';
import React from 'react';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#274C77] text-white font-ibmsans flex flex-col antialiased">
      {/* Header (Navy background #0C2340) */}
      <header className="bg-[#0C2340] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* SigmaGo serif wordmark (Sigma cream #F5EAD1 + Go gold #C9A227) */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#C9A227] flex items-center justify-center shadow-md shadow-[#0C2340]/50 group-hover:scale-105 transition">
              <span className="text-[#0C2340] font-ibmserif font-bold text-base tracking-tight">S</span>
            </div>
            <span className="font-ibmserif text-xl tracking-tight">
              <span className="text-[#F5EAD1]">Sigma</span>
              <span className="text-[#C9A227]">Go</span>
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-10 text-sm font-bold tracking-wide">
            <Link href="/product" className="text-[#C9D5E7] hover:text-[#F5EAD1] transition">Product</Link>
            <Link href="/blog" className="text-[#C9D5E7] hover:text-[#F5EAD1] transition">Blog</Link>
            <Link href="/about" className="text-[#C9D5E7] hover:text-[#F5EAD1] transition">About</Link>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-bold text-[#C9D5E7] hover:text-[#F5EAD1] transition">
              Sign in
            </Link>
            <a
              href="mailto:pilot@sigmago.co?subject=SigmaGo%20pilot%20conversation"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#C9A227] hover:bg-[#C9A227]/90 text-[#0C2340] text-xs font-bold uppercase tracking-wider rounded-full shadow-lg shadow-[#C9A227]/10 transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
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

      {/* Footer (Deepest layer #111827) */}
      <footer className="bg-[#111827] border-t border-white/5 py-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#C9A227] flex items-center justify-center">
                <span className="text-[#0C2340] font-ibmserif font-bold text-xs">S</span>
              </div>
              <span className="font-ibmserif text-base text-[#F5EAD1] tracking-tight">SigmaGo</span>
            </div>
            <p className="text-xs text-[#C9D5E7] font-semibold">
              The system of record for company decisions.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs font-bold text-[#C9D5E7]">
            <Link href="/product" className="hover:text-[#F5EAD1] transition">Product</Link>
            <Link href="/blog" className="hover:text-[#F5EAD1] transition">Blog</Link>
            <Link href="/about" className="hover:text-[#F5EAD1] transition">About</Link>
            <Link href="/login" className="hover:text-[#F5EAD1] transition">Sign in</Link>
          </div>

          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            © 2026 SigmaGo.
          </div>
        </div>
      </footer>
    </div>
  );
}
