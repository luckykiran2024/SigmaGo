"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';

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

  const navItems = [
    { label: 'Dashboard', href: `/${tenantSubdomain}` },
    { label: 'Approvals', href: `/${tenantSubdomain}/approvals`, count: pendingApprovalsCount },
    { label: 'Decision Record', href: `/${tenantSubdomain}?tab=decisions` },
    { label: 'Policies', href: `/${tenantSubdomain}/admin/intelligence` },
    { label: 'Delegations', href: `/${tenantSubdomain}/delegations` },
    { label: 'Admin', href: `/${tenantSubdomain}/admin/approvers` },
  ];

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

        {/* Right: Single Primary Action & User Profile */}
        <div className="flex items-center gap-3">
          <Link
            href={`/${tenantSubdomain}/requests/new`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-[#274C77] hover:bg-[#1E3C60] text-white text-[12.5px] font-semibold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </Link>

          <div className="w-[30px] h-[30px] rounded-full bg-[#E8EDF4] text-[#274C77] border border-[#D3DEEB] font-bold text-[12px] flex items-center justify-center shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
