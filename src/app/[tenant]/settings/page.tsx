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
    <div className="space-y-6 font-body">
      <div className="border-b border-gray-100 pb-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-ink">
          Personal Settings
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Manage your personal profile, uploading avatars, password updates, and email notifications.
        </p>
      </div>

      <PersonalSettingsForm
        userData={userData}
        tenantSubdomain={resolvedParams.tenant}
      />
    </div>
  );
}
