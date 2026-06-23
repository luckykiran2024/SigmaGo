import { adminClient } from '@/lib/supabase/admin';
import RequestForm from './RequestForm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfileForAuthUser } from '@/lib/db/users';
import { getWorkflows } from '@/lib/db/workflows';

export default async function NewRequestPage({ params }: { params: Promise<{ tenant: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  // Ensure user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  const loggedInPublicUserId = profile?.id;
  
  // Fetch tenant details by subdomain using adminClient to bypass RLS restrictions
  const { data: tenantData } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  let categories: { id: string; name: string }[] = [];
  let activeUsers: { id: string; name: string; designation: string | null; career_level: string | null; employee_id: string | null }[] = [];
  let workflows: any[] = [];

  if (tenantData) {
    const { data: cats } = await adminClient
      .from('categories')
      .select('id, name')
      .eq('tenant_id', tenantData.id);
    if (cats) {
      categories = cats;
    }

    const { data: users } = await adminClient
      .from('users')
      .select('id, name, email, designation, career_level, employee_id, auth_user_id')
      .eq('tenant_id', tenantData.id)
      .eq('status', 'active');

    if (users) {
      // Group by email to merge duplicate user rows
      const groups = new Map<string, any[]>();
      for (const u of users) {
        const emailKey = (u.email || '').toLowerCase().trim();
        if (!groups.has(emailKey)) {
          groups.set(emailKey, []);
        }
        groups.get(emailKey)!.push(u);
      }

      const mergedUsers: any[] = [];
      for (const [email, list] of groups.entries()) {
        if (list.length === 1) {
          mergedUsers.push(list[0]);
        } else {
          // Find the one with auth_user_id set
          const authRow = list.find(u => u.auth_user_id !== null);
          // Find the one with auth_user_id null (CSV row)
          const csvRow = list.find(u => u.auth_user_id === null);

          if (authRow && csvRow) {
            mergedUsers.push({
              id: authRow.id, // Store and display using the auth-linked user row id
              name: csvRow.name || authRow.name,
              email: csvRow.email,
              designation: csvRow.designation,
              career_level: csvRow.career_level,
              employee_id: csvRow.employee_id,
              auth_user_id: authRow.auth_user_id
            });
          } else {
            // Pick auth row if exists, else first one
            mergedUsers.push(authRow || list[0]);
          }
        }
      }

      // Exclude logged-in user from the active users list to prevent self-approvals
      activeUsers = mergedUsers.filter((u: any) => u.id !== loggedInPublicUserId);
    }

    // Load workflows for tenant
    const tenantWorkflows = await getWorkflows(tenantData.id);
    if (tenantWorkflows) {
      workflows = tenantWorkflows;
    }
  }

  // Sort activeUsers by name ascending
  activeUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return (
    <div className="max-w-4xl mx-auto py-4">
      <RequestForm
        tenant={resolvedParams.tenant}
        categories={categories}
        activeUsers={activeUsers}
        workflows={workflows}
      />
    </div>
  );
}
