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

  // Enforce Super Admin isolation: Platform admins do not view tenant approval queues
  const normalizedEmail = (user.email || '').toLowerCase().trim();
  const envAdmins = process.env.PLATFORM_ADMIN_EMAILS;
  const configuredAdmins = envAdmins
    ? envAdmins.toLowerCase().split(',').map((e: string) => e.trim()).filter(Boolean)
    : [];
  const isPlatformAdmin =
    configuredAdmins.includes(normalizedEmail) ||
    user.app_metadata?.is_platform_admin === true;

  if (isPlatformAdmin) {
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
    .select('id, approval_requests!inner(tenant_id)', { count: 'exact', head: true })
    .eq('approver_id', profile.id)
    .eq('status', 'pending')
    .eq('approval_requests.tenant_id', profile.tenant_id);

  // Check if user holds an explicit active Intelligence Access Grant (§ Build Prompt #17 Decoupled Access Control)
  const userEmail = (profile.email || user.email || '').toLowerCase().trim();
  const { data: activeGrant } = await adminClient
    .from('intelligence_grants')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('email', userEmail)
    .is('revoked_at', null)
    .maybeSingle();

  const hasIntelligenceAccess = Boolean(activeGrant) || profile.role === 'admin' || profile.role === 'owner';

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
        hasIntelligenceGrant={hasIntelligenceAccess}
      />
      
      {/* Main Content Area */}
      <main className="flex-grow w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
