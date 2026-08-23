import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { getProfileForAuthUser } from '@/lib/db/users';
import Navbar from '@/components/ui/Navbar';
import ThemeInitializer from '@/components/providers/ThemeInitializer';

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

  // Enforce Super Admin isolation: Platform Super Admin operators do not view tenant approval queues
  const isSuperAdminEmail =
    user.email === 'admin@sigmago.com' ||
    user.email === 'superadmin@sigmago.com';

  if (isSuperAdminEmail) {
    redirect('/platform-admin');
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

  // Fetch pending approval count for Navbar pip
  const { count: pendingCount } = await adminClient
    .from('approval_steps')
    .select('id', { count: 'exact', head: true })
    .eq('approver_id', profile.id)
    .eq('status', 'pending');

  const userTheme = (profile as any).user_settings?.theme || 'light';

  return (
    <div className="min-h-screen bg-alt flex flex-col font-sans text-ink transition-colors duration-200">
      <ThemeInitializer userTheme={userTheme} />

      {/* Single Prompt #11 Navbar rendered across all tenant routes */}
      <Navbar
        tenantSubdomain={resolvedParams.tenant}
        tenantName={tenantName}
        pendingApprovalsCount={pendingCount || 0}
        userName={profile.name || user.email?.split('@')[0] || 'User'}
        userAvatarUrl={(profile as any).avatar_url}
        isAdmin={profile.role === 'admin' || profile.role === 'owner'}
      />
      
      {/* Main Content Area */}
      <main className="flex-grow w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
