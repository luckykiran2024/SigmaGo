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
    <header className="sticky top-0 z-40 bg-white border-b border-[#DDE5EC] h-[52px]">
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
            <span className="h-4 w-[1px] bg-[#DDE5EC]" />
            <span className="text-[12px] font-semibold text-[#132238] tracking-tight truncate max-w-[160px]">
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
                      ? 'text-[#012F6B] font-semibold bg-[#F1FBFC]/80'
                      : 'text-[#526377] font-normal hover:text-[#012F6B] hover:bg-[#F7FAFC]'
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
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#059DB0] rounded-t-sm" />
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#012F6B] hover:bg-[#033E79] active:bg-[#07182F] text-white text-[13px] font-medium transition-colors shadow-xs"
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
              className="w-[30px] h-[30px] rounded-full bg-[#F3F6F8] text-[#012F6B] border border-[#DDE5EC] hover:border-[#059DB0] font-semibold text-[12px] flex items-center justify-center shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-[#059DB0]/20 active:scale-95 overflow-hidden"
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
              <div className="absolute right-0 mt-1.5 w-52 bg-white border border-[#DDE5EC] rounded-[8px] shadow-dropdown z-50 p-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150 font-sans">
                {/* Header info */}
                <div className="px-3 py-2 border-b border-[#DDE5EC]">
                  <p className="text-[13px] font-semibold text-[#132238] truncate">{userName}</p>
                  <p className="text-[11px] font-normal text-[#8190A0] truncate">{tenantName}</p>
                </div>

                {/* Menu items */}
                <div className="py-0.5 space-y-0.5">
                  <Link
                    href={`/${tenantSubdomain}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-normal text-[#526377] rounded-[6px] hover:bg-[#F7FAFC] hover:text-[#012F6B] transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#8190A0]" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    href={`/${tenantSubdomain}/settings`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-normal text-[#526377] rounded-[6px] hover:bg-[#F7FAFC] hover:text-[#012F6B] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#8190A0]" />
                    <span>Settings</span>
                  </Link>

                  <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-1.5 text-[13px] font-normal text-[#526377] rounded-[6px] hover:bg-[#F7FAFC] hover:text-[#012F6B] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-[#8190A0]" />
                      <span>Landing page</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#8190A0] group-hover:text-[#012F6B]" />
                  </Link>
                </div>

                {/* Divider & Logout */}
                <div className="pt-0.5 border-t border-[#DDE5EC]">
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
