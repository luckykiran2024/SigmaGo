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
}

export default function Navbar({
  tenantSubdomain,
  tenantName,
  pendingApprovalsCount = 0,
  userAvatarUrl,
  userName = 'User',
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
    { label: 'Policies', href: `/${tenantSubdomain}/admin/intelligence` },
    { label: 'Delegations', href: `/${tenantSubdomain}/delegations` },
    { label: 'Admin', href: `/${tenantSubdomain}/admin/approvers` },
  ];

  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'M';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7EC] h-[56px]">
      <div className="max-w-[1240px] mx-auto px-4 h-full flex items-center justify-between font-sans">
        {/* Left: Brand & Navigation Tabs */}
        <div className="flex items-center gap-6 h-full">
          <Link href={`/${tenantSubdomain}`} className="flex items-center gap-2.5 group">
            <div className="w-[28px] h-[28px] rounded-[6px] bg-[#274C77] text-white font-extrabold text-[12px] flex items-center justify-center tracking-tight shadow-xs transition-transform group-hover:scale-105">
              SG
            </div>
            <span className="h-4 w-[1px] bg-[#D0D5DD]" />
            <span className="text-[10.5px] font-bold text-[#98A2B3] uppercase tracking-[0.08em]">
              {tenantName}
            </span>
          </Link>

          <nav className="flex items-center gap-1 h-full pt-1">
            {navItems.map((item) => {
              const isActive =
                item.href === `/${tenantSubdomain}`
                  ? pathname === `/${tenantSubdomain}`
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`relative h-full flex items-center px-3 text-[13.5px] font-medium transition-colors ${
                    isActive ? 'text-[#274C77] font-semibold' : 'text-[#667085] hover:text-[#101828]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count && item.count > 0 ? (
                    <span
                      aria-live="polite"
                      className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B42318] text-white leading-none"
                    >
                      {item.count}
                    </span>
                  ) : null}

                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#274C77] rounded-t-full transition-all" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Single Primary Action & Interactive "M" User Profile Dropdown */}
        <div className="flex items-center gap-3">
          <Link
            href={`/${tenantSubdomain}/requests/new`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-[#274C77] hover:bg-[#1E3C60] text-white text-[12.5px] font-semibold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </Link>

          {/* "M" User Avatar Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="User menu"
              aria-expanded={menuOpen}
              className="w-[32px] h-[32px] rounded-full bg-[#E8EDF4] text-[#274C77] border border-[#D3DEEB] hover:border-[#274C77] font-bold text-[13px] flex items-center justify-center shrink-0 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#274C77]/20 active:scale-95 overflow-hidden"
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
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E4E7EC] rounded-xl shadow-lg z-50 p-1.5 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
                {/* Header info */}
                <div className="px-3 py-2 border-b border-[#F2F4F7]">
                  <p className="text-[13px] font-bold text-[#101828] truncate">{userName}</p>
                  <p className="text-[11px] font-medium text-[#667085] truncate">{tenantName}</p>
                </div>

                {/* Menu items */}
                <div className="py-1 space-y-0.5">
                  <Link
                    href={`/${tenantSubdomain}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#344054] rounded-lg hover:bg-[#F9FAFB] hover:text-[#101828] transition"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#667085]" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    href={`/${tenantSubdomain}/settings`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#344054] rounded-lg hover:bg-[#F9FAFB] hover:text-[#101828] transition"
                  >
                    <Settings className="w-4 h-4 text-[#667085]" />
                    <span>Settings</span>
                  </Link>

                  <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-[13px] font-medium text-[#344054] rounded-lg hover:bg-[#F9FAFB] hover:text-[#101828] transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-[#667085]" />
                      <span>Landing Page</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#98A2B3] group-hover:text-[#344054]" />
                  </Link>
                </div>

                {/* Divider & Logout */}
                <div className="pt-1 border-t border-[#F2F4F7]">
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#B42318] rounded-lg hover:bg-[#FEE8E6] transition text-left"
                    >
                      <LogOut className="w-4 h-4 text-[#B42318]" />
                      <span>Logout</span>
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
