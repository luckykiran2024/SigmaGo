"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
    <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7EC] h-[52px]">
      <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between font-sans">
        {/* Left: Brand & Navigation Tabs */}
        <div className="flex items-center gap-6 h-full">
          <Link href={`/${tenantSubdomain}`} className="flex items-center gap-2.5 group">
            <div className="w-[26px] h-[26px] rounded-[6px] bg-[#182230] text-white font-bold text-[12px] flex items-center justify-center tracking-tight transition-opacity hover:opacity-90">
              SG
            </div>
            <span className="h-3.5 w-[1px] bg-[#E4E7EC]" />
            <span className="text-[11px] font-medium text-[#475467]">
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
                  className={`relative h-full flex items-center px-3 text-[13px] transition-colors ${
                    isActive ? 'text-[#182230] font-semibold' : 'text-[#475467] font-normal hover:text-[#182230]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count && item.count > 0 ? (
                    <span
                      aria-live="polite"
                      className="ml-1.5 px-1.5 py-0.5 rounded-[4px] text-[11px] font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] leading-none tabular-nums"
                    >
                      {item.count}
                    </span>
                  ) : null}

                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#274C77] rounded-t-sm" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Single Primary Action & Interactive User Profile Dropdown */}
        <div className="flex items-center gap-2.5">
          <Link
            href={`/${tenantSubdomain}/requests/new`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#274C77] hover:bg-[#1E3C60] text-white text-[13px] font-medium transition-colors"
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
              className="w-[30px] h-[30px] rounded-full bg-[#F2F4F7] text-[#182230] border border-[#E4E7EC] hover:border-[#98A2B3] font-semibold text-[12px] flex items-center justify-center shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-[#274C77]/20 active:scale-95 overflow-hidden"
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
              <div className="absolute right-0 mt-1.5 w-52 bg-white border border-[#E4E7EC] rounded-[8px] shadow-[0_8px_24px_rgba(15,23,42,0.08)] z-50 p-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150 font-sans">
                {/* Header info */}
                <div className="px-3 py-2 border-b border-[#E4E7EC]">
                  <p className="text-[13px] font-semibold text-[#182230] truncate">{userName}</p>
                  <p className="text-[11px] font-normal text-[#667085] truncate">{tenantName}</p>
                </div>

                {/* Menu items */}
                <div className="py-0.5 space-y-0.5">
                  <Link
                    href={`/${tenantSubdomain}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-normal text-[#344054] rounded-[6px] hover:bg-[#F9FAFB] hover:text-[#182230] transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#667085]" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    href={`/${tenantSubdomain}/settings`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-normal text-[#344054] rounded-[6px] hover:bg-[#F9FAFB] hover:text-[#182230] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#667085]" />
                    <span>Settings</span>
                  </Link>

                  <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-1.5 text-[13px] font-normal text-[#344054] rounded-[6px] hover:bg-[#F9FAFB] hover:text-[#182230] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-[#667085]" />
                      <span>Landing page</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#98A2B3] group-hover:text-[#344054]" />
                  </Link>
                </div>

                {/* Divider & Logout */}
                <div className="pt-0.5 border-t border-[#E4E7EC]">
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
