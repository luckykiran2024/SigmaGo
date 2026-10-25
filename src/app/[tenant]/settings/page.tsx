import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfileForAuthUser } from '@/lib/db/users';
import PersonalSettingsForm from './PersonalSettingsForm';

export default async function PersonalSettingsPage({
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

  // Resolve detailed user profile (with avatar, designation, employee_id)
  const { data: userData } = await adminClient
    .from('users')
    .select('id, name, email, designation, employee_id, avatar_url, user_settings')
    .eq('id', profile.id)
    .single();

  if (!userData) {
    return <div className="p-8 text-center text-red-600 font-bold">User profile not found.</div>;
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b border-[#DCE5EA] pb-5 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight text-[#182B3D] font-sans">
          Personal Settings
        </h1>
        <p className="mt-1 text-xs text-[#526679] font-medium">
          Manage your personal profile, identity credentials, and system notification preferences.
        </p>
      </div>

      <PersonalSettingsForm
        userData={userData}
        tenantSubdomain={resolvedParams.tenant}
      />
    </div>
  );
}
