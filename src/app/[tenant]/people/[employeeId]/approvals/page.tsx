import { adminClient } from '@/lib/supabase/admin';
import { requireHRorAdmin } from '@/lib/auth/guards';
import { getValidityInfo } from '@/lib/utils/validity';
import Link from 'next/link';
import { ShieldAlert, User, CheckCircle2, Clock, XCircle, FileText, Lock } from 'lucide-react';

export default async function PerPersonRollupPage({
  params
}: {
  params: Promise<{ tenant: string; employeeId: string }>;
}) {
  const { tenant, employeeId } = await params;

  // C2 Fix: Guard verifies authenticated session, tenant membership, and HR/Admin role
  let ctx;
  try {
    ctx = await requireHRorAdmin(tenant);
  } catch (err: any) {
    return (
      <div className="p-8 text-center bg-white border border-red-100 rounded-lg max-w-lg mx-auto mt-12 shadow-sm font-sans text-ink space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold font-sans text-ink">Access Restricted (403)</h2>
        <p className="text-xs text-muted font-medium">
          {err.message || 'The Per-Person Rollup Dashboard is restricted exclusively to Tenant Administrators and HR personnel.'}
        </p>
        <Link
          href={`/${tenant}`}
          className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 text-ink text-xs font-bold rounded-xl transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { tenantId } = ctx;

  // Resolve Target Employee by employee_id or UUID within THIS tenant
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId);
  let targetUserQuery = adminClient
    .from('users')
    .select('id, name, email, designation, department, employee_id, career_level')
    .eq('tenant_id', tenantId);

  if (isUuid) {
    targetUserQuery = targetUserQuery.or(`employee_id.eq.${employeeId},id.eq.${employeeId}`);
  } else {
    targetUserQuery = targetUserQuery.eq('employee_id', employeeId);
  }

  const { data: targetUser } = await targetUserQuery.maybeSingle();

  if (!targetUser) {
    return (
      <div className="p-8 text-center bg-white border border-gray-100 rounded-lg max-w-lg mx-auto mt-12 shadow-sm font-sans text-ink space-y-3">
        <User className="w-10 h-10 text-gray-400 mx-auto" />
        <h2 className="text-lg font-bold font-sans text-ink">Employee Not Found</h2>
        <p className="text-xs text-muted">
          No employee matching ID "<span className="font-mono">{employeeId}</span>" was found for this tenant.
        </p>
      </div>
    );
  }

  // Fetch all requests for targetUser within THIS tenant
  const { data: requests } = await adminClient
    .from('approval_requests')
    .select(`
      id, ref, subject, status, created_at, finalized_at, valid_from, valid_until, review_date, owner_id, beneficiary_id,
      categories ( name ),
      owner:users!owner_id ( name, email, designation ),
      beneficiary:users!beneficiary_id ( name, email, designation )
    `)
    .eq('tenant_id', tenantId)
    .or(`owner_id.eq.${targetUser.id},beneficiary_id.eq.${targetUser.id}`)
    .order('created_at', { ascending: false });

  const allRequests = requests || [];

  const totalCount = allRequests.length;
  const approvedCount = allRequests.filter(r => r.status === 'approved').length;
  const pendingCount = allRequests.filter(r => r.status === 'pending').length;
  const rejectedCount = allRequests.filter(r => r.status === 'rejected').length;

  const asBeneficiaryCount = allRequests.filter(r => r.beneficiary_id === targetUser.id).length;
  const asRequesterCount = allRequests.filter(r => r.owner_id === targetUser.id).length;

  const categoryCounts: Record<string, number> = {};
  for (const r of allRequests) {
    const catName = (r.categories as any)?.name || 'Uncategorized';
    categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
  }

  return (
    <div className="space-y-8 font-sans max-w-6xl mx-auto py-4">
      {/* Privacy Notice Banner */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg px-5 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 text-xs text-amber-900 font-semibold">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Privacy Note: Visible to administrators and HR only.</span>
        </div>
        <span className="text-2xs font-bold uppercase tracking-wider font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
          HR Confidential
        </span>
      </div>

      {/* Target Employee Header */}
      <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand text-xl font-bold font-sans shrink-0">
            {targetUser.name ? targetUser.name.charAt(0).toUpperCase() : 'E'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-sans font-extrabold text-ink">{targetUser.name}</h1>
              {targetUser.employee_id && (
                <span className="text-xs font-mono font-bold bg-gray-100 text-muted px-2 py-0.5 rounded">
                  {targetUser.employee_id}
                </span>
              )}
            </div>
            <div className="text-xs text-muted font-medium mt-0.5 flex flex-wrap items-center gap-2">
              <span>{targetUser.email}</span>
              {targetUser.designation && <span>· {targetUser.designation}</span>}
              {targetUser.department && <span>· {targetUser.department}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold font-mono">
          <div className="px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-100 text-center">
            <div className="text-2xs text-muted uppercase">Requester</div>
            <div className="text-base text-ink font-extrabold mt-0.5">{asRequesterCount}</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-brand/10 border border-brand/20 text-center">
            <div className="text-2xs text-brand uppercase">Beneficiary (For)</div>
            <div className="text-base text-brand font-extrabold mt-0.5">{asBeneficiaryCount}</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
          <div className="text-2xs font-extrabold text-muted uppercase tracking-wider font-mono">Total Approvals</div>
          <div className="text-2xl font-black text-ink font-sans mt-1">{totalCount}</div>
        </div>
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 shadow-sm">
          <div className="text-2xs font-extrabold text-emerald-700 uppercase tracking-wider font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </div>
          <div className="text-2xl font-black text-emerald-800 font-sans mt-1">{approvedCount}</div>
        </div>
        <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 shadow-sm">
          <div className="text-2xs font-extrabold text-amber-700 uppercase tracking-wider font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending
          </div>
          <div className="text-2xl font-black text-amber-800 font-sans mt-1">{pendingCount}</div>
        </div>
        <div className="bg-red-50/50 border border-red-100 rounded-lg p-4 shadow-sm">
          <div className="text-2xs font-extrabold text-red-700 uppercase tracking-wider font-mono flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </div>
          <div className="text-2xl font-black text-red-800 font-sans mt-1">{rejectedCount}</div>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted font-mono">Category Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryCounts).map(([cat, count]) => (
              <span key={cat} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-ink">
                <span>{cat}:</span>
                <span className="font-mono text-brand">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Request History Table */}
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden space-y-0">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand" />
            Approval History ({allRequests.length})
          </h3>
        </div>

        {allRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No approval requests found for this employee.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-2xs font-extrabold text-muted uppercase tracking-wider font-mono">
                  <th className="px-6 py-3">Ref & Subject</th>
                  <th className="px-6 py-3">Role / Context</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Validity</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {allRequests.map(r => {
                  const val = getValidityInfo(r as any);
                  const isBeneficiary = r.beneficiary_id === targetUser.id;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-medium text-ink">
                        <Link href={`/${tenant}/requests/${r.id}`} className="font-mono text-brand hover:underline font-bold mr-2">
                          {r.ref}
                        </Link>
                        <span>{r.subject}</span>
                      </td>
                      <td className="px-6 py-4">
                        {isBeneficiary ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-bold bg-brand/10 text-brand font-mono">
                            Beneficiary (For)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-bold bg-gray-100 text-gray-600 font-mono">
                            Requester
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-ink">
                        {(r.categories as any)?.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-2xs font-bold uppercase tracking-wider font-mono ${
                          r.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                          r.status === 'rejected' ? 'bg-red-50 text-red-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {val.state !== 'NOT_APPLICABLE' && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-bold border font-mono ${val.badgeClass}`}>
                            {val.label}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/${tenant}/requests/${r.id}`} className="text-brand font-bold hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
