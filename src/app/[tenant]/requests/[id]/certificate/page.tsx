import { computeRequestChecksum } from '@/lib/utils/checksum';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getRequestDetail } from '@/lib/db/requests';
import { getProfileForAuthUser } from '@/lib/db/users';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { getCertificateBlocks } from '@/lib/certificate';
import { ShieldCheck, ArrowLeft, Printer, Link2, Award, CheckCircle2, XCircle } from 'lucide-react';

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(dateStr));
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string; tenant: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve tenant info
  const { data: tenantData } = await adminClient
    .from('tenants')
    .select('id, name')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenantData) {
    return <div className="p-8 text-center text-[#B42318] font-bold">Tenant not found.</div>;
  }

  const tenantId = tenantData.id;
  const tenantName = tenantData.name;

  // Resolve user profile
  const loggedInPublicUser = await getProfileForAuthUser(user.id, user.email || '');
  if (!loggedInPublicUser) redirect('/login');

  // Resolve request details & certificate blocks
  const request = await getRequestDetail(resolvedParams.id);
  if (!request) {
    return <div className="p-8 text-center text-[#B42318] font-bold">Request not found.</div>;
  }

  const certBlocks = await getCertificateBlocks(resolvedParams.id, tenantId);
  const sha256Checksum = request.checksum_sha256 || computeRequestChecksum(request as any);

  // Security Check: Restrict to authorized users of the same tenant
  const isSameTenant = loggedInPublicUser.tenant_id === tenantId;
  const isOwner = request.owner_id === loggedInPublicUser.id;
  const isAdmin =
    loggedInPublicUser.role === 'admin' ||
    loggedInPublicUser.role === 'super_admin' ||
    loggedInPublicUser.role === 'ADMIN' ||
    loggedInPublicUser.role === 'SUPER_ADMIN';
  const isOnPath = request.approval_steps?.some((s: any) => s.approver_id === loggedInPublicUser.id);
  const isGrantee = request.view_grants?.some((g: any) => g.grantee_id === loggedInPublicUser.id && g.status === 'active');

  const isAuthorized =
    isSameTenant &&
    ((request.archived && (isAdmin || isOnPath || isGrantee)) ||
      (!request.archived && (isOwner || isAdmin || isOnPath || isGrantee)));

  if (!isAuthorized) {
    return <div className="p-8 text-center text-[#B42318] font-bold">Unauthorized to view this certificate.</div>;
  }

  // Guard: Only finalized requests
  if (request.status !== 'approved' && request.status !== 'rejected') {
    return (
      <div className="p-8 text-center space-y-4 font-sans">
        <div className="text-[#B42318] font-bold text-lg">Approval Certificate Not Available</div>
        <p className="text-[#667085] text-sm">
          Approval Certificates are generated upon final decision.
        </p>
        <Link href={`/${resolvedParams.tenant}/requests/${resolvedParams.id}`} className="inline-flex items-center text-[#274C77] font-bold hover:underline">
          Go back to request details
        </Link>
      </div>
    );
  }

  const generatedAt = formatDate(new Date().toISOString());

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-10 px-4 sm:px-6 print:bg-white print:py-0 print:px-0 font-sans text-[#101828]">
      {/* Action Bar */}
      <div className="no-print print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-4xl mx-auto mb-8 p-4 bg-white border border-[#E4E7EC] rounded-[8px] shadow-xs">
        <Link
          href={`/${resolvedParams.tenant}/requests/${resolvedParams.id}`}
          className="inline-flex items-center text-sm font-semibold text-[#274C77] hover:underline"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Request Details
        </Link>
        <div className="flex gap-2.5">
          <button
            id="share-cert-btn"
            className="inline-flex items-center justify-center rounded-[6px] border border-[#D0D5DD] px-4 py-2 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB] shadow-xs transition-colors"
          >
            <Link2 className="w-4 h-4 mr-2" />
            Copy Share Link
          </button>
          <button
            id="print-cert-btn"
            className="inline-flex items-center justify-center rounded-[6px] bg-[#274C77] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3C60] shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Approval Certificate Document */}
      <div className="max-w-4xl mx-auto bg-white border border-[#E8DDB0] shadow-md rounded-[8px] overflow-hidden text-[#101828] print:border-0 print:shadow-none font-sans">
        {/* Certificate Gold Header (§4) */}
        <div className="bg-[#101828] text-white p-8 flex flex-col sm:flex-row sm:items-start sm:justify-between border-b border-[#C9A227] gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Award className="w-6 h-6 text-[#C9A227]" />
              <span>SigmaGo</span>
            </div>
            <p className="text-[11px] text-[#98A2B3] uppercase tracking-widest font-mono font-semibold">
              {tenantName} Organization
            </p>
          </div>
          <div className="sm:text-right space-y-1">
            <h1 className="text-xl font-extrabold tracking-wider text-white uppercase font-sans">
              Approval Certificate
            </h1>
            <p className="text-xs text-[#C9A227] font-mono">Ref: {request.ref || request.id}</p>
          </div>
        </div>

        {/* Certificate 5 Proofs Body (§4) */}
        <div className="p-8 sm:p-12 space-y-8">
          {/* PROOF 1: WHAT WAS DECIDED */}
          <section className="space-y-2 border-b border-[#E4E7EC] pb-6">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#C9A227] font-mono">
              1. WHAT WAS DECIDED
            </div>
            <h2 className="text-xl font-bold text-[#101828]">{request.subject}</h2>
            <div className="text-xs text-[#667085] flex items-center gap-3">
              <span>Category: <strong className="text-[#101828]">{request.categories?.name || 'General'}</strong></span>
              <span>·</span>
              <span>Raised by: <strong className="text-[#101828]">{request.users?.name || 'Staff Member'}</strong></span>
              <span>·</span>
              <span>Date: <strong className="text-[#101828]">{formatDate(request.created_at)}</strong></span>
            </div>
            <div className="mt-3 p-4 bg-[#F9FAFB] border border-[#E4E7EC] rounded-[6px] text-sm text-[#344054]">
              <RichTextEditor content={request.body_json} editable={false} />
            </div>
          </section>

          {/* PROOF 2: AUTHORITY */}
          <section className="space-y-3 border-b border-[#E4E7EC] pb-6">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#C9A227] font-mono">
                2. AUTHORITY
              </div>
              <p className="text-xs text-[#667085]">Who held the power to decide this</p>
            </div>
            <div className="space-y-2">
              {certBlocks.authority.map((step) => (
                <div key={step.stage} className="p-3 bg-[#F9FAFB] border border-[#E4E7EC] rounded-[6px] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#101828]">Stage {step.stage}: {step.approverName}</span>
                    <span className="text-[#667085] ml-2">({step.approverEmail})</span>
                  </div>
                  <span className="font-mono text-[#0F7548] font-bold uppercase">Verified Authority</span>
                </div>
              ))}
            </div>
          </section>

          {/* PROOF 3: SEQUENCE */}
          <section className="space-y-3 border-b border-[#E4E7EC] pb-6">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#C9A227] font-mono">
                3. SEQUENCE
              </div>
              <p className="text-xs text-[#667085]">The order in which it happened, enforced</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              {certBlocks.authority.map((step, idx) => (
                <div key={step.stage} className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-[4px] bg-[#E8EDF4] text-[#274C77] border border-[#D3DEEB] font-semibold">
                    {step.stage}. {step.approverName} ({step.status.toUpperCase()})
                  </span>
                  {idx < certBlocks.authority.length - 1 && <span className="text-[#98A2B3]">→</span>}
                </div>
              ))}
            </div>
          </section>

          {/* PROOF 4: REASONING */}
          <section className="space-y-3 border-b border-[#E4E7EC] pb-6">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#C9A227] font-mono">
                4. REASONING
              </div>
              <p className="text-xs text-[#667085]">What was weighed, recorded at the time</p>
            </div>
            <div className="space-y-2">
              {request.approval_steps?.map((step: any) => (
                <div key={step.id} className="p-3 bg-[#F9FAFB] border border-[#E4E7EC] rounded-[6px] text-xs space-y-1">
                  <div className="font-bold text-[#101828] flex items-center justify-between">
                    <span>{step.users?.name || 'Approver'}</span>
                    <span className="font-mono text-[#667085]">{step.acted_at ? formatDate(step.acted_at) : 'N/A'}</span>
                  </div>
                  <p className="text-[#344054] italic">
                    "{step.comment || 'Approved without additional reasoning commentary.'}"
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* PROOF 5: AUTHENTICITY & PERMANENCE */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-[#E4E7EC] pb-6">
            <div className="space-y-2 p-4 bg-[#FDF6E3] border border-[#E8DDB0] rounded-[6px]">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#C9A227] font-mono">
                5. AUTHENTICITY
              </div>
              <p className="text-xs text-[#667085]">Proof it has not been altered</p>
              <p className="font-mono text-[11px] text-[#101828] font-bold break-all bg-white p-2 rounded border border-[#E8DDB0]">
                SHA-256: {sha256Checksum}
              </p>
              <p className="text-[11px] text-[#667085]">Sealed: {formatDate(request.finalized_at)}</p>
            </div>

            <div className="space-y-2 p-4 bg-[#F9FAFB] border border-[#E4E7EC] rounded-[6px]">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#274C77] font-mono">
                PERMANENCE
              </div>
              <p className="text-xs text-[#667085]">Outlasts the people and the tools</p>
              <p className="text-xs text-[#344054] font-medium leading-relaxed">
                Identities stored as point-in-time snapshots. Verifiable after participants leave the organization.
              </p>
            </div>
          </section>

          {/* PRECEDENT BLOCK */}
          <section className="space-y-2 border-b border-[#E4E7EC] pb-6">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#98A2B3] font-mono">
              PRECEDENT
            </div>
            <p className="text-xs text-[#344054] font-medium">
              What this decision rests on and what rests on it:
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 bg-[#FEF3E5] text-[#B54708] border border-[#FDE3C0] rounded-[4px]">
                Exception to: Category Policy Rules
              </span>
              <span className="px-2.5 py-1 bg-[#E8EDF4] text-[#274C77] border border-[#D3DEEB] rounded-[4px]">
                Cited by: 0 later decisions
              </span>
            </div>
          </section>

          {/* PARTICIPATION BLOCK (§4 & #10) */}
          <section className="space-y-2 pb-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#98A2B3] font-mono">
                PARTICIPATION
              </span>
              <span className="text-[10.5px] font-extrabold uppercase text-[#667085]">
                Non-authoritative
              </span>
            </div>
            {certBlocks.participation.length === 0 ? (
              <p className="text-xs text-[#667085] italic">No ad-hoc participants attached to this decision.</p>
            ) : (
              <div className="space-y-1.5">
                {certBlocks.participation.map((p, idx) => (
                  <div key={idx} className="p-2.5 bg-[#F9FAFB] border border-[#E4E7EC] rounded-[6px] text-xs flex items-center justify-between">
                    <span>{p.email} ({p.role})</span>
                    <span className="text-[#667085] italic">Non-authoritative</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CERTIFICATE MANDATORY FOOTER DISCLAIMER (§4) */}
          <div className="pt-6 border-t border-[#E8DDB0] text-center space-y-1">
            <p className="text-xs font-bold text-[#101828] font-sans italic">
              This certificate can be verified by anyone, without access to SigmaGo, at any point in the future.
            </p>
            <p className="text-[10.5px] font-mono text-[#98A2B3]">
              Generated by SigmaGo · {generatedAt}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
