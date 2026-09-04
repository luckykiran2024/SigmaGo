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
    { name: 'Custom fields', href: `/${tenant}/admin/custom-fields`, icon: ListChecks },
    { name: 'Register', href: `/${tenant}/admin/register`, icon: ShieldCheck },
    { name: 'Settings', href: `/${tenant}/admin/settings`, icon: Settings }
  ];

  return (
    <aside className="w-full md:w-60 shrink-0 bg-white border border-[#E4E7EC] rounded-[8px] p-3 self-start shadow-none space-y-3 font-sans">
      <div className="px-2 pt-1 pb-0.5">
        <h3 className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
          Administration
        </h3>
        <p className="text-[12px] text-[#475467] mt-0.5">Governance rules & settings</p>
      </div>

      <nav className="space-y-0.5">
        {sidebarItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] rounded-[6px] transition-colors ${
                isActive
                  ? 'bg-[#F2F4F7] text-[#182230] font-semibold'
                  : 'text-[#475467] font-normal hover:bg-[#F9FAFB] hover:text-[#182230]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#182230]' : 'text-[#667085]'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
