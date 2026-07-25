'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building, GitBranch, Users, Tag, Settings, ListChecks, ShieldCheck } from 'lucide-react';

export default function AdminSidebar({ tenant }: { tenant: string }) {
  const pathname = usePathname();

  const sidebarItems = [
    { name: 'Organization', href: `/${tenant}/admin/org`, icon: Building },
    { name: 'Workflows', href: `/${tenant}/admin/workflows`, icon: GitBranch },
    { name: 'Delegations', href: `/${tenant}/admin/delegations`, icon: Users },
    { name: 'Categories', href: `/${tenant}/admin/categories`, icon: Tag },
    { name: 'Custom Fields', href: `/${tenant}/admin/custom-fields`, icon: ListChecks },
    { name: 'Register', href: `/${tenant}/admin/register`, icon: ShieldCheck },
    { name: 'Settings', href: `/${tenant}/admin/settings`, icon: Settings }
  ];

  return (
    <aside className="w-full md:w-64 shrink-0 bg-ink rounded-lg p-4 self-start shadow-sm space-y-4 font-sans text-[#F2F0E8]">
      <div>
        <h3 className="px-3 text-2xs font-extrabold text-[#A8B0A2] uppercase tracking-widest font-mono">
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
                  ? 'bg-[#C9A227]/14 text-[#F2F0E8] border-l-[3px] border-[#C9A227]'
                  : 'text-[#A8B0A2] hover:bg-white/5 hover:text-[#F2F0E8]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#C9A227]' : 'text-[#A8B0A2]'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
