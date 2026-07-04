import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { redirect } from 'next/navigation';
import { createDelegationAction, revokeDelegationAction } from '../../delegations/actions';
import PersonPicker from '@/components/ui/PersonPicker';
import { Calendar, Trash2, Shield, User, Clock } from 'lucide-react';

export default async function AdminDelegationsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const [authUserRes, tenantRes] = await Promise.all([
    supabase.auth.getUser(),
    adminClient
      .from('tenants')
      .select('id, name')
      .eq('subdomain', resolvedParams.tenant)
      .single()
  ]);

  const user = authUserRes.data?.user;
  const tenantData = tenantRes.data;

  if (!user || !tenantData) redirect('/login');
  const tenantId = tenantData.id;

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) redirect('/login');

  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';
  if (!isAdmin) {
    return <div className="p-8 text-center text-red-600 font-bold">Access Denied: Tenant Admin privileges required.</div>;
  }

  const { data: allUsers } = await adminClient
    .from('users')
    .select('id, name, email, designation, status')
    .eq('tenant_id', tenantId)
    .order('name');

  const { data: activeUsers } = await adminClient
    .from('users')
    .select('id, name, email, designation, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('name');

  const { data: delegations } = await adminClient
    .from('delegations')
    .select(`
      id,
      delegator_id,
      delegate_id,
      starts_at,
      ends_at,
      status,
      created_at,
      delegator:users!delegator_id ( name, email, designation ),
      delegate:users!delegate_id ( name, email, designation )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  async function handleAdminCreateDelegation(formData: FormData) {
    'use server';
    const delegatorId = formData.get('delegatorId') as string;
    const delegateId = formData.get('delegateId') as string;
    const startsAt = formData.get('startsAt') as string || null;
    const endsAt = formData.get('endsAt') as string || null;
    const durationType = formData.get('durationType') as string;
    const openEnded = durationType === 'open';

    await createDelegationAction(resolvedParams.tenant, {
      delegatorId,
      delegateId,
      startsAt,
      endsAt,
      openEnded,
      isSelfService: false
    });
  }

  async function handleAdminRevokeDelegation(formData: FormData) {
    'use server';
    const delegationId = formData.get('delegationId') as string;
    await revokeDelegationAction(resolvedParams.tenant, delegationId);
  }

  const now = new Date();
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Open-Ended';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(new Date(dateStr));
  };

  const isDelegationLive = (d: any) => {
    if (d.status !== 'active') return false;
    const starts = d.starts_at ? new Date(d.starts_at) : null;
    const ends = d.ends_at ? new Date(d.ends_at) : null;
    if (starts && now < starts) return false;
    if (ends && now > ends) return false;
    return true;
  };

  return (
    <div className="space-y-10 py-4 font-body max-w-6xl mx-auto">
      <div className="border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-ink">
          Admin Delegations Management
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Create and revoke approval delegations on behalf of any staff member in your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-ink font-display flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Override Delegation
            </h3>
            <p className="text-xs text-gray-400 mt-1">Force an approval proxy for absent or exited employees.</p>
          </div>

          <form action={handleAdminCreateDelegation} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
                Original Approver (Delegator)
              </label>
              <PersonPicker
                tenant={resolvedParams.tenant}
                activeOnly={false}
                name="delegatorId"
                placeholder="Select delegator..."
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
                Delegate To
              </label>
              <PersonPicker
                tenant={resolvedParams.tenant}
                activeOnly={true}
                name="delegateId"
                placeholder="Select delegate..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
                Duration Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="durationType"
                    value="open"
                    defaultChecked
                    className="w-4 h-4 text-accent border-gray-200 focus:ring-accent"
                  />
                  Open-Ended
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="durationType"
                    value="range"
                    className="w-4 h-4 text-accent border-gray-200 focus:ring-accent"
                  />
                  Date Range
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
                  Starts At (Optional)
                </label>
                <input
                  type="datetime-local"
                  name="startsAt"
                  className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-ink text-xs bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
                  Ends At (Optional)
                </label>
                <input
                  type="datetime-local"
                  name="endsAt"
                  className="block w-full rounded-xl border border-gray-200 py-2 px-3 text-ink text-xs bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center bg-accent hover:bg-accent-light text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-md shadow-accent/10 hover:bg-accent-light focus:outline-none transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
            >
              Apply Override
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-ink font-display">System-wide Delegations</h2>
          
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {(!delegations || delegations.length === 0) ? (
                <li className="px-6 py-12 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-2">
                  <div className="p-3 bg-gray-50 rounded-full text-gray-300">
                    <User className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-gray-500">No delegations configured</span>
                  <span>There are no active or historic delegations in this organization.</span>
                </li>
              ) : (
                delegations.map((del: any) => {
                  const live = isDelegationLive(del);
                  const statusLabel = del.status === 'revoked' ? 'Revoked' : live ? 'Active Now' : 'Expired / Scheduled';
                  const statusColor = del.status === 'revoked' ? 'bg-red-50 text-red-600 border-red-100' : live ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100';

                  return (
                    <li key={del.id} className="p-6 transition hover:bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <p className="text-sm font-bold text-ink">
                            {del.delegator?.name || 'Unknown'} ➔ {del.delegate?.name || 'Colleague'}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider border ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-semibold">
                          Delegator: {del.delegator?.email} | Delegate: {del.delegate?.email}
                        </p>
                        
                        <div className="flex items-center gap-3 text-xxs text-gray-400 pt-2 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Start: {formatDate(del.starts_at)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            End: {formatDate(del.ends_at)}
                          </span>
                        </div>
                      </div>

                      {del.status === 'active' && (
                        <form action={handleAdminRevokeDelegation}>
                          <input type="hidden" name="delegationId" value={del.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition shadow-2xs"
                            title="Revoke Delegation Override"
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            <span className="text-xs font-bold">Revoke</span>
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
