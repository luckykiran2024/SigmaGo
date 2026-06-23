import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfileForAuthUser } from '@/lib/db/users';
import Link from 'next/link';
import { Archive, AlertCircle, ArrowRight } from 'lucide-react';

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
    <div className="space-y-6 font-body">
      <div className="md:flex md:items-center md:justify-between border-b border-gray-100 pb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-ink flex items-center gap-3">
            <Archive className="w-8 h-8 text-accent" />
            Archived Requests
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            View and manage archived requests belonging to exited or inactive employees of {tenant.name}.
          </p>
        </div>
      </div>

      {(!archivedRequests || archivedRequests.length === 0) ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl bg-white shadow-sm">
          <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink">No archived requests</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Requests raised by employees are automatically archived here when their status is changed to inactive.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Inactive Owner
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Date Created
                  </th>
                  <th scope="col" className="relative px-6 py-3.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {archivedRequests.map((req: any) => {
                  const ownerName = req.owner?.name || 'Unknown';
                  const ownerEmail = req.owner?.email || 'N/A';
                  const categoryName = req.categories?.name || 'Uncategorized';
                  return (
                    <tr key={req.id} className="hover:bg-gray-50/30 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-ink truncate max-w-xs sm:max-w-sm">
                          {req.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-ink">{ownerName}</div>
                        <div className="text-xs text-gray-400 font-medium">{ownerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-500">{categoryName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          req.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                          req.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                          req.status === 'blocked' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-yellow-50 text-yellow-700 border border-yellow-100'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-semibold">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                        <Link
                          href={`/${resolvedParams.tenant}/requests/${req.id}`}
                          className="inline-flex items-center gap-1 text-accent hover:text-accent-light transition"
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
