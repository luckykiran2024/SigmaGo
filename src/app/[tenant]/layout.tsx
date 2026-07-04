import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfileForAuthUser } from '@/lib/db/users';
import TopNav from '@/components/ui/TopNav';
import UserMenu from '@/components/ui/UserMenu';
import { Plus } from 'lucide-react';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile and tenant details concurrently
  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) {
    redirect('/login');
  }

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name, logo_url')
    .eq('id', profile.tenant_id)
    .single();

  const tenantName = tenant ? tenant.name : 'Workspace';

  const isAdmin = profile && (
    profile.role === 'admin' ||
    profile.role === 'super_admin' ||
    profile.role === 'ADMIN' ||
    profile.role === 'SUPER_ADMIN'
  );

  const signOut = async () => {
    'use server';
    const supabaseClient = await createClient();
    await supabaseClient.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col font-body">
      {/* Premium Header/Navbar */}
      <header className="bg-white border-b border-gray-100 shadow-sm z-30 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Left Section: Logo & Nav */}
            <div className="flex items-center gap-8">
              <Link href={`/${resolvedParams.tenant}`} className="flex items-center gap-2 group shrink-0">
                {tenant?.logo_url ? (
                  <img src={tenant.logo_url} alt={tenantName} className="max-h-8 object-contain" />
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center shadow-sm shadow-ink/10 group-hover:scale-105 transition">
                      <span className="text-white font-display font-extrabold text-xs tracking-tight">SG</span>
                    </div>
                    <span className="font-display text-sm font-black text-gray-400 tracking-tight flex items-center gap-1.5">
                      <span className="text-ink font-extrabold text-base">SigmaGo</span>
                      <span className="text-gray-300 font-light">|</span>
                      <span className="text-gray-600 font-semibold text-xs uppercase tracking-wider">{tenantName}</span>
                    </span>
                  </>
                )}
              </Link>

              {/* Dynamic top-nav highlighting component */}
              <TopNav tenant={resolvedParams.tenant} isAdmin={isAdmin} />
            </div>

            {/* Right Section: Actions & User menu */}
            <div className="flex items-center gap-4">
              <Link
                href={`/${resolvedParams.tenant}/requests/new`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white hover:bg-accent/90 rounded-xl text-xs font-bold shadow-md shadow-accent/10 transition duration-150 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="w-4 h-4" />
                New Request
              </Link>
              
              <div className="w-px h-6 bg-gray-100" />

              <UserMenu
                email={user.email || ''}
                name={profile.name || 'User'}
                tenantName={tenantName}
                tenantSubdomain={resolvedParams.tenant}
                signOutAction={signOut}
                avatarUrl={(profile as any).avatar_url}
              />
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
