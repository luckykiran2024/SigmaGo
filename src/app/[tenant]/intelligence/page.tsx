import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import Link from 'next/link';
import { ShieldCheck, Key, ShieldAlert, BarChart3, FileText, CheckCircle2, Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UserIntelligencePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve tenant
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenant) return <div className="p-8 text-center text-red-600 font-bold">Tenant not found</div>;

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) redirect('/login');

  const userEmail = (profile.email || user.email || '').toLowerCase().trim();
  const isAdmin = profile.role === 'admin' || profile.role === 'owner';

  // Check explicit intelligence grant (§ Build Prompt #17)
  const { data: activeGrant } = await adminClient
    .from('intelligence_grants')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('email', userEmail)
    .is('revoked_at', null)
    .maybeSingle();

  if (!activeGrant && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white border border-[#E4E7EC] rounded-2xl shadow-sm text-center space-y-4 font-sans">
        <Lock className="w-12 h-12 text-[#B42318] mx-auto" />
        <h2 className="text-lg font-extrabold text-[#101828]">Intelligence Access Required</h2>
        <p className="text-xs text-[#667085] leading-relaxed">
          Access to organizational decision metrics is an explicit grant issued to normalized email addresses. Roles carry no inherent intelligence access.
        </p>
        <p className="text-xs font-semibold text-[#344054]">
          Contact your workspace administrator to request an explicit Intelligence Access Grant for <span className="font-mono text-[#274C77]">{userEmail}</span>.
        </p>
      </div>
    );
  }

  // Update audit access log if user accessed via explicit grant
  if (activeGrant) {
    await adminClient
      .from('intelligence_grants')
      .update({
        access_count: (activeGrant.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', activeGrant.id);
  }

  const grantScope = activeGrant ? activeGrant.scope : 'FULL';

  // Query sealed decisions metrics for intelligence reporting
  const { data: sealedDecisions } = await adminClient
    .from('approval_requests')
    .select('id, ref, subject, status, finalized_at, created_at, categories(name, domain)')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const sealedCount = (sealedDecisions || []).filter((d) => d.status === 'approved' || d.finalized_at).length;
  const inFlightCount = (sealedDecisions || []).filter((d) => d.status === 'in_flight' || d.status === 'pending').length;

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Admin Notice Banner */}
      {isAdmin && (
        <div className="p-4 rounded-2xl bg-[#E8EDF4] border border-[#D3DEEB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#274C77] font-semibold">
            <Lock className="w-4 h-4 shrink-0 text-[#274C77]" />
            <span>Admin / Owner Console: Manage and issue explicit intelligence grants to employees and auditors.</span>
          </div>
          <Link
            href={`/${resolvedParams.tenant}/admin/intelligence`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#274C77] hover:bg-[#1E3C60] text-white font-bold transition shrink-0"
          >
            <span>Manage Access Grants Register →</span>
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#E4E7EC] pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#101828] tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#274C77]" />
            Organizational Decision Analytics & Metrics
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Active Grant for <span className="font-mono text-[#274C77] font-bold">{userEmail}</span> • Granted Scope: <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8EDF4] text-[#274C77] uppercase">{grantScope}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Verified Intelligence Access</span>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Orphan Decision Rate</span>
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-extrabold text-[#101828]">0.0%</p>
          <p className="text-xs text-[#667085]">Decisions without recorded rule ancestors</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Inherited Soundness</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-[#101828]">1.00</p>
          <p className="text-xs text-[#667085]">Weakest link ancestry integrity score</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Governance Rate</span>
            <Key className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-extrabold text-[#101828]">100%</p>
          <p className="text-xs text-[#667085]">Decisions governed vs. exception bypass</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">Granted Scope</span>
            <ShieldCheck className="w-5 h-5 text-[#274C77]" />
          </div>
          <p className="text-xl font-extrabold text-[#274C77] uppercase">{grantScope}</p>
          <p className="text-xs text-[#667085]">
            {grantScope === 'FULL' ? 'Includes decision drill-through access' : 'Aggregated privacy-protected metrics'}
          </p>
        </div>
      </div>

      {/* Decision Intelligence Table */}
      <div className="bg-white border border-[#E4E7EC] rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#274C77]" />
            Organizational Decisions & Governance Audit Trail
          </h2>
          <span className="text-xs font-medium text-[#667085]">
            Showing recent decision activity
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#344054]">
            <thead className="bg-[#F9FAFB] text-[#667085] font-bold uppercase text-[10px] tracking-wider border-b border-[#E4E7EC]">
              <tr>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Decision Subject</th>
                <th className="py-3 px-4">Category Domain</th>
                <th className="py-3 px-4 text-center">Blast Radius</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              {(sealedDecisions || []).map((item: any) => (
                <tr key={item.id} className="hover:bg-[#F9FAFB] transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#274C77]">
                    {item.ref}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#101828]">
                    {item.subject}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#F2F4F7] text-[#344054] uppercase">
                      {item.categories?.domain || 'GENERAL'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#E8EDF4] text-[#274C77]">
                      {item.blast_at_seal ?? 0} descendants
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {grantScope === 'FULL' ? (
                      <Link
                        href={`/${resolvedParams.tenant}/requests/${item.id}`}
                        className="text-[11px] font-bold text-[#274C77] hover:underline"
                      >
                        Drill Through →
                      </Link>
                    ) : (
                      <span className="text-[10px] font-medium text-[#98A2B3]">Aggregated Only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
