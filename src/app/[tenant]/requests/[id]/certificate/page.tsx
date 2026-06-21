import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getRequestDetail } from '@/lib/db/requests';
import { getProfileForAuthUser } from '@/lib/db/users';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { ShieldCheck, ArrowLeft, Printer, CheckCircle2, XCircle } from 'lucide-react';

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
    .select('id, name')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenantData) {
    return <div className="p-8 text-center text-red-600 font-bold">Tenant not found.</div>;
  }

  const tenantId = tenantData.id;
  const tenantName = tenantData.name;

  // Resolve user profile
  const loggedInPublicUser = await getProfileForAuthUser(user.id, user.email || '');
  if (!loggedInPublicUser) redirect('/login');

  // Resolve request details
  const request = await getRequestDetail(resolvedParams.id);
  if (!request) {
    return <div className="p-8 text-center text-red-600 font-bold">Request not found.</div>;
  }

  // Security Check: Restrict to authorized users
  const isOwner = request.owner_id === loggedInPublicUser.id;
  const isAdmin = loggedInPublicUser.role === 'admin' || loggedInPublicUser.role === 'super_admin' || loggedInPublicUser.role === 'ADMIN' || loggedInPublicUser.role === 'SUPER_ADMIN';
  const isOnPath = request.approval_steps?.some((s: any) => s.approver_id === loggedInPublicUser.id);
  const isGrantee = request.view_grants?.some((g: any) => g.grantee_id === loggedInPublicUser.id && g.status === 'active');
  
  if (!isOwner && !isAdmin && !isOnPath && !isGrantee && request.visibility !== 'public') {
    return <div className="p-8 text-center text-red-600 font-bold">Unauthorized to view this certificate.</div>;
  }

  // Guard: Only finalized requests
  if (request.status !== 'approved' && request.status !== 'rejected') {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-red-600 font-bold text-lg">Certificate Not Available</div>
        <p className="text-gray-500 text-sm">Approval Certificates are only generated for finalized (approved or rejected) requests.</p>
        <Link href={`/${resolvedParams.tenant}/requests/${resolvedParams.id}`} className="inline-flex items-center text-accent font-bold hover:underline">
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
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 print:bg-white print:py-0 print:px-0">
      
      {/* Top Navigation & Print Action Bar (Hidden during printing) */}
      <div className="no-print print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-4xl mx-auto mb-8 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
        <Link 
          href={`/${resolvedParams.tenant}/requests/${resolvedParams.id}`}
          className="inline-flex items-center text-sm font-bold text-accent hover:text-accent-light transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Request details
        </Link>
        <button
          id="print-cert-btn"
          className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/10 hover:bg-accent-light focus:outline-none transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print / Save PDF
        </button>
      </div>

      {/* Main Certificate Sheet */}
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 shadow-sm p-8 sm:p-12 sm:rounded-3xl relative overflow-hidden font-body text-gray-900 print:border-0 print:shadow-none print:p-0 print:m-0">
        
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-accent to-indigo-600 print:hidden" />

        {/* Certificate Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b border-gray-200 pb-8 mb-8 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-accent font-display font-extrabold text-xl tracking-tight">
              <ShieldCheck className="w-6 h-6 text-accent" />
              <span>SigmaGo</span>
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">{tenantName} Organization</p>
          </div>
          <div className="sm:text-right space-y-1">
            <h1 className="text-2xl font-display font-black tracking-wider text-gray-900 uppercase">Approval Certificate</h1>
            <p className="text-xs text-gray-400 font-mono">Reference: {request.ref || request.id}</p>
          </div>
        </div>

        {/* Request Overview Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-100">
          <div className="space-y-4">
            <div>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Subject / Document</span>
              <h2 className="text-xl font-bold text-gray-900 mt-1">{request.subject}</h2>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Workflow Category</span>
              <p className="text-sm font-semibold text-gray-800 mt-1">{request.categories?.name || 'Uncategorized'}</p>
            </div>
          </div>
          
          <div className="space-y-4 md:border-l md:border-gray-100 md:pl-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Submitted By</span>
                <p className="text-sm font-bold text-gray-800 mt-1 truncate">{request.users?.name || 'Unknown'}</p>
                <p className="text-xs text-gray-500 font-mono truncate">{request.users?.email || ''}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Submission Date</span>
                <p className="text-sm font-semibold text-gray-800 mt-1">{formatDate(request.created_at)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Final Status</span>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                    request.status === 'approved' 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {request.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Finalized Date</span>
                <p className="text-sm font-semibold text-gray-800 mt-1">{formatDate(request.finalized_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Request Document Body */}
        <div className="mb-10 page-break-inside-avoid">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-4">Request Body & Content</span>
          <div className="border border-gray-100 rounded-2xl bg-gray-50/20 p-6 print:p-0 print:border-0">
            <RichTextEditor content={request.body_json} editable={false} />
          </div>
        </div>

        {/* Approval Steps Table */}
        <div className="mb-10 page-break-inside-avoid">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-4">Verification Steps & Sign-offs</span>
          <div className="overflow-x-auto border border-gray-200 rounded-2xl print:border-0">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm print:divide-gray-400">
              <thead className="bg-gray-50 font-bold text-gray-500 uppercase text-xxs tracking-wider print:bg-white">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Stage</th>
                  <th scope="col" className="px-4 py-3.5">Approver</th>
                  <th scope="col" className="px-4 py-3.5">Role</th>
                  <th scope="col" className="px-4 py-3.5">Decision</th>
                  <th scope="col" className="px-4 py-3.5">Completed At</th>
                  <th scope="col" className="px-4 py-3.5">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white font-medium text-gray-700 print:divide-gray-200">
                {sortedSteps.map((step: any) => {
                  const roleBadgeText = 
                    step.type === 'GENERAL' ? 'Direct' : 
                    step.type === 'PARALLEL' ? 'Parallel' : 
                    step.type === 'REFERENCE' ? 'Reference' : step.type;

                  let decisionText = '';
                  let decisionColorClass = 'text-gray-400';
                  
                  if (step.type === 'REFERENCE') {
                    decisionText = 'FYI';
                    decisionColorClass = 'text-blue-600 font-bold';
                  } else if (step.status === 'approved') {
                    decisionText = 'Approved';
                    decisionColorClass = 'text-green-600 font-bold';
                  } else if (step.status === 'rejected') {
                    decisionText = 'Rejected';
                    decisionColorClass = 'text-red-600 font-bold';
                  } else {
                    decisionText = step.status.charAt(0).toUpperCase() + step.status.slice(1);
                  }

                  return (
                    <tr key={step.id}>
                      <td className="whitespace-nowrap px-4 py-4 font-mono font-bold text-gray-500 text-xs">
                        Stage {step.stage_index ?? '0'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-gray-900">{step.users?.name || 'Unknown'}</div>
                        <div className="text-xxs text-gray-400 font-semibold uppercase tracking-wider pt-0.5">
                          {step.users?.designation || 'Staff'} {step.users?.employee_id ? `? ${step.users?.employee_id}` : ''}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-gray-500">
                        {roleBadgeText}
                      </td>
                      <td className={`whitespace-nowrap px-4 py-4 text-xs ${decisionColorClass}`}>
                        {decisionText}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-500 font-mono">
                        {step.acted_at ? formatDate(step.acted_at) : '?'}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500 italic max-w-xs break-words">
                        {step.comment || '?'}
                      </td>
                    </tr>
                  );
                })}
                {sortedSteps.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">
                      No approval steps found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integrity Checksum Block */}
        <div className="p-6 border border-dashed border-gray-200 bg-gray-50/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 page-break-inside-avoid">
          <div className="space-y-1 max-w-xl">
            <h4 className="text-xxs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>Tamper-Evident Security Verification</span>
            </h4>
            <p className="text-xxs text-gray-400 font-semibold leading-relaxed">
              This document contains an audit-defensible cryptographical checksum. Any modification to the contents of the approval requests, steps, or metadata invalidates the signature.
            </p>
          </div>
          <div className="shrink-0 space-y-1 w-full md:w-auto">
            <span className="text-xxs text-gray-400 font-bold uppercase tracking-wider">Integrity checksum (SHA-256)</span>
            <p className="text-xs font-mono font-bold bg-gray-50 border border-gray-150 p-2.5 rounded-xl break-all text-gray-800 select-all leading-tight">
              {request.checksum_sha256 || 'N/A'}
            </p>
          </div>
        </div>

        {/* Certificate Footer */}
        <div className="text-center text-xxs text-gray-400 border-t border-gray-100 pt-8 font-semibold tracking-wide">
          Generated by SigmaGo on {generatedAt}
        </div>

      </div>

      {/* Inline Client Print Trigger Script */}
      <script dangerouslySetInnerHTML={{ __html: `
        const btn = document.getElementById('print-cert-btn');
        if (btn) {
          btn.addEventListener('click', function() {
            window.print();
          });
        }
      ` }} />

    </div>
  );
}
