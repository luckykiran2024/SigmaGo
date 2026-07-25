'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const PILOT_EMAIL = 'pilot@sigmago.co';
const mailtoLink = `mailto:${PILOT_EMAIL}?subject=SigmaGo%20pilot%20conversation`;

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-ink font-sans antialiased flex flex-col justify-between selection:bg-brand/20">
      {/* UNIFIED ENTERPRISE TOP NAVIGATION RIBBON */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-xs">
        <div className="max-w-[1140px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-ink">
            <span className="w-[28px] h-[28px] bg-brand text-white rounded-[6px] flex items-center justify-center text-[13px] font-mono font-bold">
              SG
            </span>
            <span className="font-bold text-[18px] tracking-tight text-ink">SigmaGo</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-muted">
            <Link 
              href="/" 
              className={`transition ${pathname === '/' ? 'text-brand font-bold' : 'hover:text-ink'}`}
            >
              Home
            </Link>
            <Link 
              href="/product" 
              className={`transition ${pathname === '/product' ? 'text-brand font-bold' : 'hover:text-ink'}`}
            >
              Product
            </Link>
            <Link 
              href="/blog" 
              className={`transition ${pathname.startsWith('/blog') ? 'text-brand font-bold' : 'hover:text-ink'}`}
            >
              Blog
            </Link>
            <Link 
              href="/about" 
              className={`transition ${pathname === '/about' ? 'text-brand font-bold' : 'hover:text-ink'}`}
            >
              About
            </Link>
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-[15px] font-medium text-ink hover:bg-section-alt rounded-[6px] transition">
              Log in
            </Link>
            <a
              href={mailtoLink}
              className="px-[20px] py-[11px] bg-brand hover:bg-brand-deep text-white text-[15px] font-semibold rounded-[6px] transition shadow-xs"
            >
              Request a pilot
            </a>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-muted hover:text-ink transition"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-white px-6 py-6 space-y-4 animate-fade-up">
            <nav className="flex flex-col gap-3 text-[16px] font-medium">
              <Link 
                href="/" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-ink hover:text-brand"
              >
                Home
              </Link>
              <Link 
                href="/product" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-ink hover:text-brand"
              >
                Product
              </Link>
              <Link 
                href="/blog" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-ink hover:text-brand"
              >
                Blog
              </Link>
              <Link 
                href="/about" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-ink hover:text-brand"
              >
                About
              </Link>
              <Link 
                href="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-ink hover:text-brand border-t border-border pt-3"
              >
                Log in
              </Link>
            </nav>
            <a
              href={mailtoLink}
              className="block w-full text-center px-5 py-3 bg-brand hover:bg-brand-deep text-white text-[15px] font-semibold rounded-[6px] transition shadow-xs"
            >
              Request a pilot
            </a>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* UNIFIED ENTERPRISE FOOTER */}
      <footer className="border-t border-border bg-white py-8 px-6">
        <div className="max-w-[1140px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[14px] text-muted font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink font-mono">SigmaGo</span>
            <span>— The system of record for company decisions</span>
          </div>
          <div>
            © {new Date().getFullYear()} SigmaGo. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
