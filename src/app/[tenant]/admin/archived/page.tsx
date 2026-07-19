import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfileForAuthUser } from '@/lib/db/users';
import Link from 'next/link';
import { Archive, ArrowRight } from 'lucide-react';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).format(new Date(dateStr));
}

export default async function AdminArchivedPage({ params }: { params: Promise<{ tenant: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve tenant ID
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenant) redirect('/login');

  // Verify Role is Admin
  const profile = await getProfileForAuthUser(user.id, user.email || '');

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin' && profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
    redirect(`/${resolvedParams.tenant}`);
  }

  // Load archived requests in this tenant
  const { data: archivedRequests, error } = await adminClient
    .from('approval_requests')
    .select(`
      id,
      subject,
      status,
      created_at,
      owner:users!owner_id ( name, email, employee_id ),
      categories ( name )
    `)
    .eq('tenant_id', tenant.id)
    .eq('archived', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error loading archived requests:", error);
  }

  return (
    <div className="space-y-6 font-ibmsans text-ink">
      <div className="md:flex md:items-center md:justify-between border-b border-hair pb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-ibmserif font-extrabold tracking-tight text-ink flex items-center gap-3">
            <Archive className="w-8 h-8 text-accent" />
            Archived Requests
          </h1>
          <p className="mt-2 text-sm text-muted">
            View and manage archived requests belonging to exited or inactive employees of {tenant.name}.
          </p>
        </div>
      </div>

      {(!archivedRequests || archivedRequests.length === 0) ? (
        <div className="text-center py-16 border border-hair rounded-[14px] bg-paper shadow-[0_10px_28px_rgba(60,55,30,0.10)]">
          <Archive className="w-12 h-12 text-muted mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink font-ibmserif">No archived requests</h3>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto leading-relaxed">
            Requests raised by employees are automatically archived here when their status is changed to inactive.
          </p>
        </div>
      ) : (
        <div className="bg-paper border border-hair rounded-[14px] shadow-[0_10px_28px_rgba(60,55,30,0.10)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-hair">
              <thead className="bg-panel">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-muted uppercase tracking-wider font-ibmmono">
                    Subject
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-muted uppercase tracking-wider font-ibmmono">
                    Inactive Owner
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-muted uppercase tracking-wider font-ibmmono">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-muted uppercase tracking-wider font-ibmmono">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-muted uppercase tracking-wider font-ibmmono">
                    Date Created
                  </th>
                  <th scope="col" className="relative px-6 py-3.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-paper divide-y divide-hair">
                {archivedRequests.map((req: any) => {
                  const ownerName = req.owner?.name || 'Unknown';
                  const ownerEmail = req.owner?.email || 'N/A';
                  const categoryName = req.categories?.name || 'Uncategorized';
                  return (
                    <tr key={req.id} className="hover:bg-panel/30 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-ink truncate max-w-xs sm:max-w-sm">
                          {req.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-ink">{ownerName}</div>
                        <div className="text-xs text-muted font-medium font-ibmmono">{ownerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-muted">{categoryName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-3xs font-black uppercase tracking-widest border font-ibmmono ${
                          req.status === 'approved' ? 'bg-ok/10 text-ok border-ok/20' :
                          req.status === 'rejected' ? 'bg-err/10 text-err border-err/20' :
                          req.status === 'blocked' ? 'bg-err/10 text-err border-err/20 animate-pulse' :
                          req.status === 'in_discussion' ? 'bg-info/10 text-info border-info/20' :
                          'bg-warn/10 text-warn border-warn/20'
                        }`}>
                          {req.status === 'in_discussion' ? 'discuss' : req.status === 'pending' ? 'pending' : req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted font-semibold font-ibmmono">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                        <Link
                          href={`/${resolvedParams.tenant}/requests/${req.id}`}
                          className="inline-flex items-center gap-1 text-accent hover:text-accent-deep transition"
                        >
                          View Request
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
