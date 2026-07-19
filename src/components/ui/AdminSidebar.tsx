'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building, GitBranch, Users, Tag, Settings } from 'lucide-react';

export default function AdminSidebar({ tenant }: { tenant: string }) {
  const pathname = usePathname();

  const sidebarItems = [
    { name: 'Organization', href: `/${tenant}/admin/org`, icon: Building },
    { name: 'Workflows', href: `/${tenant}/admin/workflows`, icon: GitBranch },
    { name: 'Delegations', href: `/${tenant}/admin/delegations`, icon: Users },
    { name: 'Categories', href: `/${tenant}/admin/categories`, icon: Tag },
    { name: 'Settings', href: `/${tenant}/admin/settings`, icon: Settings }
  ];

  return (
    <aside className="w-full md:w-64 shrink-0 bg-forest rounded-2xl p-4 self-start shadow-sm space-y-4 font-ibmsans text-[#F2F0E8]">
      <div>
        <h3 className="px-3 text-2xs font-extrabold text-[#A8B0A2] uppercase tracking-widest font-ibmmono">
          Admin Console
        </h3>
        <p className="px-3 text-[10px] text-[#A8B0A2] font-semibold mt-0.5">Management & Rules</p>
      </div>

      <nav className="space-y-1">
        {sidebarItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-xl transition ${
                isActive
                  ? 'bg-[#D4A017]/14 text-[#F2F0E8] border-l-[3px] border-[#D4A017]'
                  : 'text-[#A8B0A2] hover:bg-white/5 hover:text-[#F2F0E8]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4A017]' : 'text-[#A8B0A2]'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
