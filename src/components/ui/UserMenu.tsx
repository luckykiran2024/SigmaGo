'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Settings, Globe, LogOut, ExternalLink } from 'lucide-react';

interface UserMenuProps {
  email: string;
  name: string;
  tenantName: string;
  tenantSubdomain: string;
  signOutAction: () => void;
  avatarUrl: string | null;
}

export default function UserMenu({
  email,
  name,
  tenantName,
  tenantSubdomain,
  signOutAction,
  avatarUrl
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = (name || email)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
        className="w-9 h-9 rounded-full bg-brand/5 hover:bg-brand/10 border border-brand/15 flex items-center justify-center font-bold text-brand shadow-xs transition active:scale-95 overflow-hidden"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover rounded-full" />
        ) : (
          initials
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-gray-100 pb-2.5">
            <p className="text-xs font-bold text-ink leading-tight truncate">{name}</p>
            <p className="text-[11px] font-medium text-gray-400 truncate mt-0.5">{email}</p>
            <p className="text-[10px] font-bold text-brand mt-1.5 bg-brand/5 px-2 py-0.5 rounded inline-block">
              {tenantName}
            </p>
          </div>

          <div className="py-1 space-y-0.5">
            <Link
              href={`/${tenantSubdomain}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-600 rounded-lg hover:bg-gray-50 hover:text-ink transition"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-gray-400" />
              <span>Dashboard</span>
            </Link>

            <Link
              href={`/${tenantSubdomain}/settings`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-600 rounded-lg hover:bg-gray-50 hover:text-ink transition"
            >
              <Settings className="w-3.5 h-3.5 text-gray-400" />
              <span>Settings</span>
            </Link>

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-600 rounded-lg hover:bg-gray-50 hover:text-ink transition group"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                <span>Landing Page</span>
              </div>
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-ink" />
            </Link>
          </div>

          <div className="pt-1 border-t border-gray-100">
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 rounded-lg hover:bg-red-50 transition text-left"
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
