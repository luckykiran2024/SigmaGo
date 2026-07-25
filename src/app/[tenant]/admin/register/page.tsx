import { adminClient } from '@/lib/supabase/admin';
import { requireTenantAdmin } from '@/lib/auth/guards';
import { getValidityInfo } from '@/lib/utils/validity';
import Link from 'next/link';

export default async function ComplianceRegisterPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  
  // C2 Fix: Shared tenant admin guard checks session, membership, and role
  const { tenantId } = await requireTenantAdmin(tenant);

  // Fetch all approved requests in force for THIS tenant
  const { data: requests } = await adminClient
    .from('approval_requests')
    .select(`
      id, ref, subject, created_at, finalized_at, valid_from, valid_until, review_date, status,
      categories ( name ),
      users!owner_id ( name, email ),
      beneficiary:users!beneficiary_id ( name )
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .not('valid_until', 'is', null)
    .order('valid_until', { ascending: true });

  const registerList = (requests || []).map(r => {
    const val = getValidityInfo(r as any);
    return { ...r, validity: val };
  });

  return (
    <div className="space-y-6 font-ibmsans">
      <div>
        <h1 className="text-2xl font-display font-extrabold tracking-tight text-ink">
          Compliance Register
        </h1>
        <p className="text-sm text-muted font-medium mt-1">
          Active & expiring approvals currently in force with defined validity periods.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted font-ibmmono">
            {registerList.length} Active Records with Expiry
          </span>
        </div>

        {registerList.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted">
            No active approvals with validity periods found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-2xs font-extrabold text-muted uppercase tracking-wider font-ibmmono">
                  <th className="px-6 py-3">Ref & Subject</th>
                  <th className="px-6 py-3">Requester / For</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Valid Until</th>
                  <th className="px-6 py-3">Validity Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {registerList.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-medium text-ink">
                      <Link href={`/${tenant}/requests/${r.id}`} className="font-mono text-accent hover:underline font-bold mr-2">
                        {r.ref}
                      </Link>
                      <span>{r.subject}</span>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      <div>{(r.users as any)?.name}</div>
                      {(r.beneficiary as any)?.name && (
                        <div className="text-2xs text-gray-400">For: {(r.beneficiary as any)?.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-ink">
                      {(r.categories as any)?.name}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-ink">
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(r.valid_until!))}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-bold border font-ibmmono ${r.validity.badgeClass}`}>
                        {r.validity.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/${tenant}/requests/${r.id}/certificate`}
                        className="text-accent hover:underline font-bold text-2xs"
                      >
                        Certificate
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
