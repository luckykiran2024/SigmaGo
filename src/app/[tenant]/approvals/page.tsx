import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { redirect } from 'next/navigation';
import ApprovalsSearchList from './ApprovalsSearchList';

export default async function ApprovalsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  // Phase 1: Resolve user auth session and tenant data concurrently to optimize page load latency
  const [authUserRes, tenantRes] = await Promise.all([
    supabase.auth.getUser(),
    adminClient
      .from('tenants')
      .select('id')
      .eq('subdomain', resolvedParams.tenant)
      .single()
  ]);

  const user = authUserRes.data?.user;
  const tenantData = tenantRes.data;

  if (!user) redirect('/login');
  if (!tenantData) redirect('/login');
  const tenantId = tenantData.id;

  // Phase 2: Resolve public user profile
  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) redirect('/login');

  // Phase 3: Fetch Raised by Me and Involved in Steps concurrently
  const [raisedByMeRes, involvedStepsRes] = await Promise.all([
    supabase
      .from('approval_requests')
      .select('id, subject, status, created_at, categories(name)')
      .eq('tenant_id', tenantId)
      .eq('owner_id', profile.id)
      .eq('archived', false),
    supabase
      .from('approval_steps')
      .select('request_id, type, status, approval_requests(id, subject, status, created_at, categories(name))')
      .eq('approver_id', profile.id)
  ]);

  const raisedByMe = raisedByMeRes.data;
  const involvedSteps = involvedStepsRes.data;

  // Deduplicate and map involved requests
  // A user might be on the path multiple times. We prioritize GENERAL (Direct) > PARALLEL (Parallel) > REFERENCE (Reference)
  const involvedMap = new Map();
  involvedSteps?.forEach((step: any) => {
    const req = step.approval_requests;
    if (req) {
      const existing = involvedMap.get(req.id);
      const typePriority: { [key: string]: number } = { 'GENERAL': 3, 'PARALLEL': 2, 'REFERENCE': 1 };
      const currentPriority = typePriority[step.type] || 0;
      const existingPriority = existing ? (typePriority[existing.user_role] || 0) : 0;

      if (!existing || currentPriority > existingPriority) {
        involvedMap.set(req.id, {
          ...req,
          user_role: step.type
        });
      }
    }
  });

  const involvedIn = Array.from(involvedMap.values());

  return (
    <div className="space-y-10 py-4 font-body max-w-7xl mx-auto">
      <div className="border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-ink">
          Approvals Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Track, search, and review all approval requests raised by you or requiring your sign-off.
        </p>
      </div>

      <ApprovalsSearchList
        raisedByMe={raisedByMe || []}
        involvedIn={involvedIn}
        tenantSubdomain={resolvedParams.tenant}
      />
    </div>
  );
}
