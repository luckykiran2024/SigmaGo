import AdminSidebar from '@/components/ui/AdminSidebar';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
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

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) {
    redirect('/login');
  }

  const role = (profile.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'owner' && role !== 'super_admin') {
    redirect(`/${resolvedParams.tenant}`);
  }

  // Double-check tenant boundary: user profile must match target route tenant
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, subdomain')
    .eq('subdomain', resolvedParams.tenant)
    .maybeSingle();

  if (!tenant || profile.tenant_id !== tenant.id) {
    redirect(`/${resolvedParams.tenant}`);
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 font-sans min-h-[500px]">
      {/* Client Sidebar Component */}
      <AdminSidebar tenant={resolvedParams.tenant} />

      {/* Main Admin Subpage Content Container */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
