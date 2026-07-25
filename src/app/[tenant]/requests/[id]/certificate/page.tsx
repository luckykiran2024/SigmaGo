import { getOutgoingReferences } from '@/lib/db/references';
import { computeRequestChecksum } from '@/lib/utils/checksum';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getRequestDetail } from '@/lib/db/requests';
import { getValidityInfo } from '@/lib/utils/validity';
import { getProfileForAuthUser } from '@/lib/db/users';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { ShieldCheck, ArrowLeft, Printer, CheckCircle2, XCircle, Link2 } from 'lucide-react';

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }).format(new Date(dateStr));
}

export default async function CertificatePage({ params }: { params: Promise<{ id: string, tenant: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve tenant info
  const { data: tenantData } = await adminClient
    .from('tenants')
    .select('id, name, logo_url')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenantData) {
    return <div className="p-8 text-center text-err font-bold">Tenant not found.</div>;
  }

  const tenantId = tenantData.id;
  const tenantName = tenantData.name;

  // Resolve user profile
  const loggedInPublicUser = await getProfileForAuthUser(user.id, user.email || '');
  if (!loggedInPublicUser) redirect('/login');

  // Resolve request details
  const request = await getRequestDetail(resolvedParams.id);
  const validity = getValidityInfo(request as any);
  const sha256Checksum = request.checksum_sha256 || computeRequestChecksum(request as any);
  if (!request) {
    return <div className="p-8 text-center text-err font-bold">Request not found.</div>;
  }

  // Security Check: Restrict to authorized users of the same tenant (non-public)
  const isSameTenant = loggedInPublicUser.tenant_id === tenantId;
  const isOwner = request.owner_id === loggedInPublicUser.id;
  const isAdmin = loggedInPublicUser.role === 'admin' || loggedInPublicUser.role === 'super_admin' || loggedInPublicUser.role === 'ADMIN' || loggedInPublicUser.role === 'SUPER_ADMIN';
  const isOnPath = request.approval_steps?.some((s: any) => s.approver_id === loggedInPublicUser.id);
  const isGrantee = request.view_grants?.some((g: any) => g.grantee_id === loggedInPublicUser.id && g.status === 'active');
  
  const isAuthorized = isSameTenant && (
    (request.archived && (isAdmin || isOnPath || isGrantee)) ||
    (!request.archived && (isOwner || isAdmin || isOnPath || isGrantee))
  );
  
  if (!isAuthorized) {
    return <div className="p-8 text-center text-err font-bold">Unauthorized to view this certificate.</div>;
  }

  // Guard: Only finalized requests
  if (request.status !== 'approved' && request.status !== 'rejected') {
    return (
      <div className="p-8 text-center space-y-4 font-sans">
        <div className="text-err font-bold text-lg font-sans">Certificate Not Available</div>
        <p className="text-muted text-sm">Approval Certificates are only generated for finalized (approved or rejected) requests.</p>
        <Link href={`/${resolvedParams.tenant}/requests/${resolvedParams.id}`} className="inline-flex items-center text-brand font-bold hover:underline">
          Go back to request details
        </Link>
      </div>
    );
  }

  const steps = request.approval_steps || [];
  // Sort steps: Stage index first, then order index
  const sortedSteps = [...steps].sort((a: any, b: any) => {
    if (a.stage_index !== b.stage_index) {
      return (a.stage_index ?? 0) - (b.stage_index ?? 0);
    }
    return (a.order_index ?? 0) - (b.order_index ?? 0);
  });

  const generatedAt = formatDate(new Date().toISOString());

  return (
    <div className="min-h-screen bg-bg py-10 px-4 sm:px-6 print:bg-white print:py-0 print:px-0 font-sans text-ink">
      
      {/* Top Navigation & Print Action Bar (Hidden during printing) */}
      <div className="no-print print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-4xl mx-auto mb-8 p-4 bg-surface border border-border rounded-lg shadow-[0_10px_28px_rgba(60,55,30,0.10)]">
        <Link 
          href={`/${resolvedParams.tenant}/requests/${resolvedParams.id}`}
          className="inline-flex items-center text-sm font-bold text-brand hover:text-brand-deep transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Request details
        </Link>
        <div className="flex gap-2.5">
          <button
            id="share-cert-btn"
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-bold text-ink hover:text-brand hover:bg-bg focus:outline-none transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150 shadow-sm"
          >
            <Link2 className="w-4 h-4 mr-2" />
            Copy share link
          </button>
          <button
            id="print-cert-btn"
            className="inline-flex items-center justify-center rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-ink shadow-md shadow-accent/10 hover:bg-brand/90 focus:outline-none transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Main Certificate Sheet */}
      <div className="max-w-4xl mx-auto bg-surface border border-border shadow-[0_10px_28px_rgba(60,55,30,0.10)] rounded-lg relative overflow-hidden text-ink print:border-0 print:shadow-none print:p-0 print:m-0">
        
        {/* Certificate Header - Dark Forest Background */}
        <div className="bg-ink text-paper p-8 flex flex-col sm:flex-row sm:items-start sm:justify-between border-b border-border gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-2xl font-sans font-bold tracking-tight">
              <ShieldCheck className="w-6 h-6 text-brand" />
              <span>
                <span className="text-[#F7F8FA]">Sigma</span>
                <span className="text-brand">Go</span>
              </span>
            </div>
            <p className="text-xs text-panel uppercase tracking-widest font-semibold font-mono">{tenantName} Organization</p>
          </div>
          <div className="sm:text-right space-y-1">
            <h1 className="text-xl font-sans font-extrabold tracking-wider text-[#F7F8FA] uppercase">Approval Certificate</h1>
            <p className="text-xs text-[#F7F8FA]/75 font-mono">Ref: {request.ref || request.id}</p>
          </div>
        </div>

        {/* Inner Content Padding */}
        <div className="p-8 sm:p-12 space-y-8">

          {/* Request Overview Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-border">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-muted font-bold uppercase tracking-wider font-mono">Subject / Document</span>
                <h2 className="text-xl font-bold text-ink mt-1">{request.subject}</h2>
              </div>
              <div>
                <span className="text-xs text-muted font-bold uppercase tracking-wider font-mono">Workflow Category</span>
                <p className="text-sm font-semibold text-ink mt-1">{request.categories?.name || 'Uncategorized'}</p>
              </div>
            </div>
            
            <div className="space-y-4 md:border-l md:border-border md:pl-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted font-bold uppercase tracking-wider font-mono">Submitted By</span>
                  <p className="text-sm font-bold text-ink mt-1 truncate">{request.users?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted font-mono truncate">{request.users?.email || ''}</p>
                </div>
                <div>
                  <span className="text-xs text-muted font-bold uppercase tracking-wider font-mono">Submission Date</span>
                  <p className="text-sm font-semibold text-ink mt-1 font-mono">{formatDate(request.created_at)}</p>
                </div>
              {/* Beneficiary */}
              {request.beneficiary && (
                <div className="text-center">
                  <div className="text-xs text-muted uppercase tracking-widest font-semibold mb-1">Beneficiary</div>
                  <div className="text-sm font-bold text-ink">{(request.beneficiary as any).name}</div>
                  {(request.beneficiary as any).designation && (
                    <div className="text-xs text-gray-400">{(request.beneficiary as any).designation}</div>
                  )}
                </div>
              )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted font-bold uppercase tracking-wider font-mono">Final Status</span>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border bg-brand/15 text-brand border-brand/30 font-mono">
                      {request.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted font-bold uppercase tracking-wider font-mono">Finalized Date</span>
                  <p className="text-sm font-semibold text-ink mt-1 font-mono">{formatDate(request.finalized_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Request Document Body */}
          <div className="page-break-inside-avoid">
            <span className="text-xs text-muted font-bold uppercase tracking-wider block mb-3 font-mono">Request Body & Content</span>
            <div className="border border-border rounded-lg bg-bg/30 p-6 print:p-0 print:border-0 prose max-w-none text-[#4B5347] font-sans text-[19px] leading-[1.65] prose-headings:font-sans prose-headings:text-ink prose-a:text-brand">
              <RichTextEditor content={request.body_json} editable={false} />
            </div>
          </div>

          {/* Approval Steps Table */}
          <div className="page-break-inside-avoid">
            <span className="text-xs text-muted font-bold uppercase tracking-wider block mb-3 font-mono">Verification Steps & Sign-offs</span>
            <div className="overflow-x-auto border border-border rounded-lg print:border-0">
              <table className="min-w-full divide-y divide-border text-left text-sm print:divide-border">
                <thead className="bg-bg font-bold text-muted uppercase text-xs tracking-wider font-mono">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">Stage</th>
                    <th scope="col" className="px-4 py-3.5">Approver</th>
                    <th scope="col" className="px-4 py-3.5">Role</th>
                    <th scope="col" className="px-4 py-3.5">Decision</th>
                    <th scope="col" className="px-4 py-3.5">Completed At</th>
                    <th scope="col" className="px-4 py-3.5">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white font-medium text-ink">
                  {sortedSteps.map((step: any) => {
                    const roleBadgeText = 
                      step.type === 'GENERAL' ? 'Direct' : 
                      step.type === 'PARALLEL' ? 'Parallel' : 
                      step.type === 'REFERENCE' ? 'Reference' : step.type;

                    let decisionText = '';
                    let decisionColorClass = 'text-muted';
                    const isStepApproved = step.status === 'approved';
                    const isStepRejected = step.status === 'rejected';
                    
                    if (step.type === 'REFERENCE') {
                      decisionText = 'FYI';
                      decisionColorClass = 'text-info font-bold';
                    } else if (step.acted_by_id && step.acted_by_id !== step.approver_id) {
                      const verb = step.status === 'approved' ? 'Approved' : step.status === 'rejected' ? 'Rejected' : 'Actioned';
                      decisionText = `${verb} by ${step.acted_by?.name || 'Delegate'}`;
                      decisionColorClass = isStepApproved ? 'text-ok font-bold' : 'text-err font-bold';
                    } else if (step.status === 'approved') {
                      if (step.recorded_offline) {
                        const ratStr = step.ratification_status ? ` [${step.ratification_status.toUpperCase()}]` : '';
                        decisionText = `Approved (Offline: ${step.offline_source || 'Recorded'}${ratStr})`;
                        decisionColorClass = 'text-amber-800 font-bold';
                      } else {
                        decisionText = 'Approved';
                        decisionColorClass = 'text-ok font-bold';
                      }
                    } else if (step.status === 'rejected') {
                      decisionText = 'Rejected';
                      decisionColorClass = 'text-err font-bold';
                    } else {
                      decisionText = step.status.charAt(0).toUpperCase() + step.status.slice(1);
                    }

                    return (
                      <tr key={step.id} className={isStepApproved ? 'bg-ok/5 hover:bg-ok/10 transition' : 'hover:bg-bg/30 transition'}>
                        <td className="whitespace-nowrap px-4 py-4 font-mono font-bold text-muted text-xs font-mono">
                          Stage {step.stage_index ?? '0'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-ink">
                            {step.acted_by_id && step.acted_by_id !== step.approver_id ? (
                              <span>
                                {step.users?.name || 'Unknown'}{' '}
                                <span className="text-xs text-brand font-semibold normal-case font-sans">
                                  (Actioned by {step.acted_by?.name || 'Delegate'} as delegate)
                                </span>
                              </span>
                            ) : (
                              step.users?.name || 'Unknown'
                            )}
                          </div>
                          <div className="text-xs text-muted font-semibold uppercase tracking-wider pt-0.5 font-mono">
                            {step.users?.designation || 'Staff'} {step.users?.employee_id ? `• ${step.users?.employee_id}` : ''}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-muted font-mono">
                          {roleBadgeText}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs">
                          <span className={`inline-flex items-center ${decisionColorClass}`}>
                            {isStepApproved && <CheckCircle2 className="w-3.5 h-3.5 text-ok mr-1.5 shrink-0" />}
                            {isStepRejected && <XCircle className="w-3.5 h-3.5 text-err mr-1.5 shrink-0" />}
                            {decisionText}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-muted font-mono font-mono">
                          {step.acted_at ? formatDate(step.acted_at) : 'N/A'}
                        </td>
                        <td className="px-4 py-4 text-xs text-muted italic max-w-xs break-words">
                          {step.comment || 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                  {sortedSteps.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted italic">
                        No approval steps found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Integrity Checksum Block */}
          <div className="p-6 border border-dashed border-border bg-bg/30 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 page-break-inside-avoid">
            <div className="space-y-1 max-w-xl">
              <h4 className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-4 h-4 text-ok" />
                <span>Tamper-Evident Security Verification</span>
              </h4>
              <p className="text-xs text-muted font-semibold leading-relaxed">
                This document contains an audit-defensible cryptographical checksum. Any modification to the contents of the approval requests, steps, or metadata invalidates the signature.
              </p>
            </div>
            <div className="shrink-0 space-y-1 w-full md:w-auto">
              <span className="text-xs text-muted font-bold uppercase tracking-wider font-mono">Integrity checksum (SHA-256)</span>
              <p className="text-xs font-mono font-bold bg-white border border-border p-2.5 rounded-xl break-all text-ink select-all leading-tight font-mono">
                {sha256Checksum}
              </p>
            </div>
          </div>

          {/* Verification Gold Seal Ring & Signature Footer */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-border page-break-inside-avoid">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-md border-2 border-double border-brand text-brand shrink-0">
                <ShieldCheck className="w-7 h-7 text-brand" />
              </div>
              <div>
                <p className="text-xs font-bold text-ink uppercase tracking-wider font-mono">SigmaGo Verified</p>
                <p className="text-[10px] text-muted font-medium mt-0.5">Tamper-evident cryptographical record</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs text-muted font-semibold tracking-wider font-mono uppercase">Generated by SigmaGo</p>
              <p className="text-xs text-ink font-bold font-mono mt-0.5">{generatedAt}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Inline Client Print & Copy Trigger Script */}
      <script dangerouslySetInnerHTML={{ __html: `
        const printBtn = document.getElementById('print-cert-btn');
        if (printBtn) {
          printBtn.addEventListener('click', function() {
            window.print();
          });
        }
        
        const shareBtn = document.getElementById('share-cert-btn');
        if (shareBtn) {
          shareBtn.addEventListener('click', function() {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(function() {
              const originalText = shareBtn.innerHTML;
              shareBtn.innerHTML = '<svg class="w-4 h-4 mr-2 text-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Copied!';
              shareBtn.classList.add('border-ok/20', 'bg-ok/10', 'text-ok');
              setTimeout(function() {
                shareBtn.innerHTML = originalText;
                shareBtn.classList.remove('border-ok/20', 'bg-ok/10', 'text-ok');
              }, 2000);
            }).catch(function(err) {
              console.error('Failed to copy link: ', err);
            });
          });
        }
      ` }} />

    </div>
  );
}
