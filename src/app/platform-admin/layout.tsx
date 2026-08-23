import { createClient } from '@/lib/supabase/server';
import { getProfileForAuthUser } from '@/lib/db/users';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Shield, Activity, PlusCircle, LifeBuoy, LogOut } from 'lucide-react';
import { signOutAction } from '@/app/login/actions';

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Allow super admin emails or super_admin role
  const isSuperAdminEmail =
    user.email === 'admin@sigmago.com' ||
    user.email === 'superadmin@sigmago.com' ||
    user.email?.includes('sigmago');

  const profile = await getProfileForAuthUser(user.id, user.email || '');

  if (!isSuperAdminEmail && profile?.role !== 'admin' && profile?.role !== 'owner') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] flex flex-col font-sans">
      {/* Platform Super Admin Navigation Header */}
      <header className="bg-[#1E293B] border-b border-[#334155] h-[60px] sticky top-0 z-50">
        <div className="max-w-[1240px] mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/platform-admin" className="flex items-center gap-2.5 group">
              <div className="w-[32px] h-[32px] rounded-lg bg-[#38BDF8] text-[#0F172A] font-black text-[13px] flex items-center justify-center tracking-tight shadow-md">
                SG
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-white tracking-tight flex items-center gap-1.5">
                  SigmaGo Platform Console
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30 uppercase">
                    Super Admin
                  </span>
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                href="/platform-admin"
                className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-bold text-[#94A3B8] hover:text-white hover:bg-[#334155]/50 rounded-lg transition"
              >
                <Activity className="w-4 h-4 text-[#38BDF8]" />
                <span>Tenant Observability</span>
              </Link>

              <Link
                href="/platform-admin/onboard"
                className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-bold text-[#94A3B8] hover:text-white hover:bg-[#334155]/50 rounded-lg transition"
              >
                <PlusCircle className="w-4 h-4 text-[#10B981]" />
                <span>Onboard Tenant</span>
              </Link>

              <Link
                href="/platform-admin/tickets"
                className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-bold text-[#94A3B8] hover:text-white hover:bg-[#334155]/50 rounded-lg transition"
              >
                <LifeBuoy className="w-4 h-4 text-[#F59E0B]" />
                <span>Support Tickets</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[12px] font-bold text-white truncate">{user.email}</p>
              <p className="text-[10px] font-medium text-[#94A3B8]">Platform Super Admin Operator</p>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[12px] font-bold border border-red-500/30 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-[1240px] w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
