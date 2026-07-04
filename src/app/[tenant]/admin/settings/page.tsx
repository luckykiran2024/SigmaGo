import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfileForAuthUser } from '@/lib/db/users';
import AdminSettingsForm from './AdminSettingsForm';

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) redirect('/login');

  // Verify Role is Admin/Super Admin
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';
  if (!isAdmin) {
    redirect(`/${resolvedParams.tenant}`);
  }

  // Resolve tenant info
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name, subdomain, logo_url, created_at, tenant_settings')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenant) {
    return <div className="p-8 text-center text-red-600 font-bold">Tenant not found.</div>;
  }

  return (
    <div className="space-y-6 font-body">
      <div className="border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-ink">
          Global Settings
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Configure branding, custom templates, overdue reminder policies, and governance rules.
        </p>
      </div>

      <AdminSettingsForm
        tenantData={tenant}
        tenantSubdomain={resolvedParams.tenant}
      />
    </div>
  );
}
