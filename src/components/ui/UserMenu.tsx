'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

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
    <div className="relative font-body" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-xl bg-accent/5 hover:bg-accent/10 border border-accent/15 flex items-center justify-center font-bold text-accent shadow-sm transition active:scale-95 overflow-hidden"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-2 border-b border-gray-100 pb-3">
            <p className="text-sm font-bold text-ink leading-tight truncate">{name}</p>
            <p className="text-xs font-medium text-gray-400 truncate mt-0.5">{email}</p>
            <p className="text-xs font-bold text-accent mt-2 bg-accent/5 px-2.5 py-1 rounded-lg inline-block">
              {tenantName}
            </p>
          </div>

          <div className="space-y-0.5">
            <Link
              href={`/${tenantSubdomain}/settings`}
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50 hover:text-ink transition"
            >
              Settings
            </Link>

            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full text-left flex items-center px-4 py-2.5 text-sm font-bold text-red-600 rounded-xl hover:bg-red-50 transition"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
