'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ShieldCheck } from 'lucide-react';
import { PILOT_EMAIL } from '@/lib/site';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mailtoLink = `mailto:${PILOT_EMAIL}?subject=SigmaGo%20pilot%20conversation`;

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#17200F] font-inter flex flex-col antialiased">
      {/* 1. STICKY TRANSLUCENT HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FAF8F2]/80 border-b border-hair">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          
          {/* Logo wordmark (Display: Fraunces) */}
          <Link href="/" className="flex items-center gap-2 group transition">
            <div className="w-8 h-8 rounded-lg bg-[#D4A017] flex items-center justify-center shadow-[0_4px_12px_rgba(60,55,30,0.15)] group-hover:scale-105 transition">
              <ShieldCheck className="w-5 h-5 text-[#17200F]" />
            </div>
            <span className="font-fraunces text-xl font-bold tracking-tight text-[#17200F] select-none">
              Sigma<span className="text-[#D4A017]">Go</span>
            </span>
          </Link>

          {/* Desktop Nav (hidden below 900px) */}
          <nav className="hidden min-[900px]:flex items-center gap-10 text-sm font-bold tracking-wide">
            <Link href="/" className="text-[#5E6657] hover:text-[#17200F] transition">Home</Link>
            <Link href="/product" className="text-[#5E6657] hover:text-[#17200F] transition">Product</Link>
            <Link href="/blog" className="text-[#5E6657] hover:text-[#17200F] transition">Blog</Link>
            <Link href="/about" className="text-[#5E6657] hover:text-[#17200F] transition">About</Link>
          </nav>

          {/* Desktop Actions (hidden below 900px) */}
          <div className="hidden min-[900px]:flex items-center gap-6">
            <Link href="/login" className="text-sm font-bold text-[#5E6657] hover:text-[#17200F] transition">
              Sign in
            </Link>
            <a
              href={mailtoLink}
              className="inline-flex items-center justify-center px-6 py-3 bg-[#D4A017] hover:bg-[#E3B02A] text-[#17200F] text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_4px_12px_rgba(212,160,23,0.2)] hover:shadow-[0_6px_16px_rgba(212,160,23,0.3)] transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
            >
              Book a pilot
            </a>
          </div>

          {/* Hamburger button (visible below 900px) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-[900px]:hidden p-2 text-[#5E6657] hover:text-[#17200F] transition"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer (below 900px) */}
        {mobileMenuOpen && (
          <div className="min-[900px]:hidden border-t border-hair bg-[#FAF8F2] px-5 py-6 space-y-5 animate-fade-up">
            <nav className="flex flex-col gap-4 text-base font-bold">
              <Link 
                href="/" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#5E6657] hover:text-[#17200F] py-2 transition"
              >
                Home
              </Link>
              <Link 
                href="/product" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#5E6657] hover:text-[#17200F] py-2 transition"
              >
                Product
              </Link>
              <Link 
                href="/blog" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#5E6657] hover:text-[#17200F] py-2 transition"
              >
                Blog
              </Link>
              <Link 
                href="/about" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#5E6657] hover:text-[#17200F] py-2 transition"
              >
                About
              </Link>
              <Link 
                href="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#5E6657] hover:text-[#17200F] py-2 border-t border-hair pt-4 transition"
              >
                Sign in
              </Link>
            </nav>

            {/* Mobile Actions Stack */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <a
                href={mailtoLink}
                className="w-full text-center inline-flex items-center justify-center px-6 py-3.5 bg-[#D4A017] hover:bg-[#E3B02A] text-[#17200F] text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_4px_12px_rgba(212,160,23,0.2)] transition"
              >
                Book a pilot
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        {children}
      </main>

      {/* 2. FOOTER (Darkest background #141D13) */}
      <footer className="bg-[#141D13] text-[#FAF8F2]/70 py-16 border-t border-hair font-inter">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#D4A017] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#17200F]" />
                </div>
                <span className="font-fraunces text-base font-bold text-[#FAF8F2] tracking-tight">
                  Sigma<span className="text-[#D4A017]">Go</span>
                </span>
              </div>
              <p className="text-xs text-[#FAF8F2]/50 font-medium">
                The system of record for company decisions.
              </p>
            </div>

            {/* Repeated Links */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs font-bold text-[#FAF8F2]/80">
              <Link href="/" className="hover:text-[#FAF8F2] transition">Home</Link>
              <Link href="/product" className="hover:text-[#FAF8F2] transition">Product</Link>
              <Link href="/blog" className="hover:text-[#FAF8F2] transition">Blog</Link>
              <Link href="/about" className="hover:text-[#FAF8F2] transition">About</Link>
              <Link href="/login" className="hover:text-[#FAF8F2] transition">Sign in</Link>
            </div>

            <div className="text-[10px] text-[#FAF8F2]/40 font-bold uppercase tracking-wider font-ibmmono">
              © 2026 SigmaGo · The system of record for company decisions.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
