'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopNav({ tenant, isAdmin }: { tenant: string; isAdmin: boolean }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: `/${tenant}` },
    { name: 'Approvals', href: `/${tenant}/approvals` },
    { name: 'AI Assistant', href: `/${tenant}/ai` },
    { name: 'Delegations', href: `/${tenant}/delegations` },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Admin', href: `/${tenant}/admin` });
  }

  return (
    <nav className="hidden md:flex items-center gap-6">
      {navItems.map((item) => {
        const isActive = item.name === 'Dashboard' 
          ? pathname === item.href 
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`text-[13.5px] font-medium transition-colors relative py-1 ${
              isActive
                ? 'text-[#17324D] font-semibold'
                : 'text-[#526679] hover:text-[#17324D]'
            }`}
          >
            {item.name}
            {isActive && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0B7780] rounded-sm" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
