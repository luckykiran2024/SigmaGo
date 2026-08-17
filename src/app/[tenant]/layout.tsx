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
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans text-ink">
      {/* Main Content Area */}
      <main className="flex-grow w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
