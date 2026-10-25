"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Plus, LayoutDashboard, Settings, Globe, LogOut, ExternalLink } from 'lucide-react';
import { signOutAction } from '@/app/login/actions';

interface NavbarProps {
  tenantSubdomain: string;
  tenantName: string;
  pendingApprovalsCount?: number;
  userAvatarUrl?: string;
  userName?: string;
  isAdmin?: boolean;
  hasIntelligenceGrant?: boolean;
}

export default function Navbar({
  tenantSubdomain,
  tenantName,
  pendingApprovalsCount = 0,
  userAvatarUrl,
  userName = 'User',
  isAdmin = false,
  hasIntelligenceGrant = false,
}: NavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Dashboard', href: `/${tenantSubdomain}` },
    { label: 'Approvals', href: `/${tenantSubdomain}/approvals`, count: pendingApprovalsCount },
    { label: 'Records', href: `/${tenantSubdomain}/records` },
    ...(hasIntelligenceGrant || isAdmin
      ? [{ label: 'Intelligence', href: `/${tenantSubdomain}/intelligence` }]
      : []),
    { label: 'Delegations', href: `/${tenantSubdomain}/delegations` },
    ...(isAdmin ? [{ label: 'Admin', href: `/${tenantSubdomain}/admin/approvers` }] : []),
  ];

  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'M';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#DCE5EA] h-[52px]">
      <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between font-sans">
        {/* Left: Official Brand & Navigation Tabs */}
        <div className="flex items-center gap-6 h-full">
          <Link href={`/${tenantSubdomain}`} className="flex items-center gap-3 group">
            <div className="relative w-[28px] h-[28px] shrink-0 transition-opacity hover:opacity-95">
              <img
                src="/brand/sigmago-logo.png"
                alt="SigmaGo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="h-4 w-[1px] bg-[#DCE5EA]" />
            <span className="text-[12px] font-semibold text-[#182B3D] tracking-tight truncate max-w-[160px]">
              {tenantName}
            </span>
          </Link>

          <nav className="flex items-center gap-1 h-full">
            {navItems.map((item) => {
              const isActive =
                item.href === `/${tenantSubdomain}`
                  ? pathname === `/${tenantSubdomain}`
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`relative h-full flex items-center px-3 text-[13px] transition-all ${
                    isActive
                      ? 'text-[#17324D] font-semibold bg-[#ECF6F5]/80'
                      : 'text-[#526679] font-normal hover:text-[#17324D] hover:bg-[#F6F8F9]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count && item.count > 0 ? (
                    <span
                      aria-live="polite"
                      className="ml-1.5 px-1.5 py-0.5 rounded-[4px] text-[11px] font-semibold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] leading-none tabular-nums"
                    >
                      {item.count}
                    </span>
                  ) : null}

                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0B7780] rounded-t-sm" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Primary Action & Interactive User Profile Dropdown */}
        <div className="flex items-center gap-3">
          <Link
            href={`/${tenantSubdomain}/requests/new`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#17324D] hover:bg-[#224564] active:bg-[#0C1C2D] text-white text-[13px] font-medium transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New request</span>
          </Link>

          {/* User Avatar Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="User menu"
              aria-expanded={menuOpen}
              className="w-[30px] h-[30px] rounded-full bg-[#EEF2F4] text-[#17324D] border border-[#DCE5EA] hover:border-[#0B7780] font-semibold text-[12px] flex items-center justify-center shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 active:scale-95 overflow-hidden"
            >
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt={userName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span>{userInitial}</span>
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white border border-[#DCE5EA] rounded-[8px] shadow-dropdown z-50 p-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150 font-sans">
                {/* Header info */}
                <div className="px-3 py-2 border-b border-[#DCE5EA]">
                  <p className="text-[13px] font-semibold text-[#182B3D] truncate">{userName}</p>
                  <p className="text-[11px] font-normal text-[#637587] truncate">{tenantName}</p>
                </div>

                {/* Menu items */}
                <div className="py-0.5 space-y-0.5">
                  <Link
                    href={`/${tenantSubdomain}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-normal text-[#526679] rounded-[6px] hover:bg-[#F6F8F9] hover:text-[#17324D] transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#637587]" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    href={`/${tenantSubdomain}/settings`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-normal text-[#526679] rounded-[6px] hover:bg-[#F6F8F9] hover:text-[#17324D] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#637587]" />
                    <span>Settings</span>
                  </Link>

                  <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-1.5 text-[13px] font-normal text-[#526679] rounded-[6px] hover:bg-[#F6F8F9] hover:text-[#17324D] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-[#637587]" />
                      <span>Landing page</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#637587] group-hover:text-[#17324D]" />
                  </Link>
                </div>

                {/* Divider & Logout */}
                <div className="pt-0.5 border-t border-[#DCE5EA]">
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-normal text-[#B42318] rounded-[6px] hover:bg-[#FEF3F2] transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-[#B42318]" />
                      <span>Sign out</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
