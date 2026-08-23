import AdminSidebar from '@/components/ui/AdminSidebar';
import { createClient } from '@/lib/supabase/server';
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
  if (!profile || (profile.role !== 'admin' && profile.role !== 'owner')) {
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
