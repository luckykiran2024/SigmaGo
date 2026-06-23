import Link from 'next/link';
import { getRequestDetail, getSignedUrl } from '@/lib/db/requests';
import { actOnStep } from '@/lib/db/steps';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { AlertTriangle, Users } from 'lucide-react';
import { getProfileForAuthUser } from '@/lib/db/users';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(new Date(dateStr));
}

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}



export default async function RequestDetail({ params }: { params: Promise<{ id: string, tenant: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  
  // Concurrently run queries that do not depend on each other's results
  const [authUserRes, tenantRes, request, auditLogsRes] = await Promise.all([
    supabase.auth.getUser(),
    adminClient
      .from('tenants')
      .select('id')
      .eq('subdomain', resolvedParams.tenant)
      .single(),
    getRequestDetail(resolvedParams.id),
    supabase
      .from('audit_log')
      .select('*')
      .eq('request_id', resolvedParams.id)
      .order('created_at', { ascending: false })
  ]);

  const user = authUserRes.data?.user;
  const tenantData = tenantRes.data;
  const tenantId = tenantData?.id;
  const auditLogs = auditLogsRes.data;

  // Concurrently run queries that depend on the resolved user or tenantId
  const [loggedInPublicUser, tenantUsersRes] = await Promise.all([
    getProfileForAuthUser(user?.id || '', user?.email || ''),
    supabase
      .from('users')
      .select('id, name, status, designation, career_level')
      .eq('tenant_id', tenantId)
  ]);

  // Pre-generate signed URLs for all attachments concurrently
  const attachmentsWithUrls = request.attachments ? await Promise.all(
    (request.attachments as any[]).map(async (att: any) => {
      try {
        const url = await getSignedUrl(att.storage_path);
        return { ...att, url };
      } catch (err) {
        console.error("Error generating signed URL for attachment:", att.id, err);
        return { ...att, url: '#' };
      }
    })
  ) : [];

  const tenantUsers = tenantUsersRes.data;
    
  const userMap = new Map((tenantUsers || []).map(u => [u.id, u.name]));
  const activeTenantUsers = (tenantUsers || []).filter(u => u.status === 'active' || u.status === 'ACTIVE');

  const isOwner = request.owner_id === loggedInPublicUser?.id;
  const isAdmin = loggedInPublicUser?.role === 'admin' || loggedInPublicUser?.role === 'super_admin' || loggedInPublicUser?.role === 'ADMIN' || loggedInPublicUser?.role === 'SUPER_ADMIN';

  const isOnPath = request.approval_steps?.some((s: any) => s.approver_id === loggedInPublicUser?.id);
  const isGrantee = request.view_grants?.some((g: any) => g.grantee_id === loggedInPublicUser?.id && g.status === 'active');
  const hasAccessToArchived = isAdmin || isOnPath || isGrantee;

  if (request.archived && !hasAccessToArchived) {
    return (
      <div className="p-8 text-center bg-white border border-gray-100 rounded-2xl max-w-lg mx-auto mt-12 shadow-sm font-body">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-ink">Access Denied</h2>
        <p className="text-sm text-gray-500 mt-2">
          This approval request has been archived and is only accessible by administrators, assigned approvers, or explicitly authorized team members.
        </p>
      </div>
    );
  }

  const activeStep = request.approval_steps?.find(
    (s: any) => s.status === 'pending' && s.approver_id === loggedInPublicUser?.id
  );



  async function submitAction(formData: FormData) {
    'use server';
    const supabaseServer = await createClient();
    const { data: { user: actionUser } } = await supabaseServer.auth.getUser();
    if (!actionUser) return;

    const actionPublicUser = await getProfileForAuthUser(actionUser.id, actionUser.email || '');
    if (!actionPublicUser) return;

    const action = formData.get('action') as string;
    const comment = formData.get('comment') as string;
    const stepId = formData.get('stepId') as string;

    await actOnStep({
      stepId,
      action: action === 'approve' ? 'approved' : 'rejected',
      actorId: actionPublicUser.id,
      tenantId,
      comment,
      actionSource: 'web'
    });

    revalidatePath(`/${resolvedParams.tenant}/requests/${resolvedParams.id}`);
  }

  async function reassignAction(formData: FormData) {
    'use server';
    const supabaseServer = await createClient();
    const { data: { user: actionUser } } = await supabaseServer.auth.getUser();
    if (!actionUser) return;

    const actionPublicUser = await getProfileForAuthUser(actionUser.id, actionUser.email || '');
    if (!actionPublicUser) return;

    // Verify permission: Must be owner or admin
    const isUserOwner = request.owner_id === actionPublicUser.id;
    const isUserAdmin = actionPublicUser.role === 'admin' || actionPublicUser.role === 'super_admin' || actionPublicUser.role === 'ADMIN' || actionPublicUser.role === 'SUPER_ADMIN';
    if (!isUserOwner && !isUserAdmin) {
      throw new Error('Unauthorized to reassign step approver');
    }

    const stepId = formData.get('stepId') as string;
    const newApproverId = formData.get('newApproverId') as string;

    // Fetch old step info
    const { data: oldStep } = await adminClient
      .from('approval_steps')
      .select('approver_id')
      .eq('id', stepId)
      .single();

    if (!oldStep) return;

    // 1. Update approver for the step
    await adminClient
      .from('approval_steps')
      .update({
        approver_id: newApproverId,
        status: 'pending' // Re-activate step as pending
      })
      .eq('id', stepId);

    // 2. Unlock the request back to 'pending' status
    await adminClient
      .from('approval_requests')
      .update({ status: 'pending' })
      .eq('id', resolvedParams.id);

    // 3. Log the reassignment to the Audit Log
    await adminClient.from('audit_log').insert({
      tenant_id: tenantId,
      request_id: resolvedParams.id,
      actor_id: actionPublicUser.id,
      action_type: 'step_reassigned',
      metadata: {
        step_id: stepId,
        previous_approver_id: oldStep.approver_id,
        new_approver_id: newApproverId
      }
    });

    revalidatePath(`/${resolvedParams.tenant}/requests/${resolvedParams.id}`);
  }

  // Group steps for timeline
  const referenceSteps = (request.approval_steps || []).filter((s: any) => s.type === 'REFERENCE');
  const stageSteps = (request.approval_steps || []).filter((s: any) => s.type !== 'REFERENCE');

  const stageGroups: { [key: number]: any[] } = {};
  stageSteps.forEach((s: any) => {
    const stageIdx = s.stage_index ?? 0;
    if (!stageGroups[stageIdx]) {
      stageGroups[stageIdx] = [];
    }
    stageGroups[stageIdx].push(s);
  });

  const sortedStageIndices = Object.keys(stageGroups)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6 py-4 font-body">
      {/* Back Link */}
      <div>
        <Link 
          href={`/${resolvedParams.tenant}`}
          className="inline-flex items-center text-sm font-semibold text-accent hover:text-accent-light transition"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {request.status === 'blocked' && (
        <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h4 className="text-sm font-bold text-yellow-800">Workflow Blocked</h4>
            <p className="text-xs text-yellow-700 mt-1 font-medium">
              This approval request is blocked because one or more active approvers became inactive. The request owner or a tenant admin must reassign the pending step.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left column: Document details & Audit logs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Document Details Card */}
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
            {/* Header info */}
            <div className="px-6 py-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-display font-extrabold text-ink leading-tight">{request.subject}</h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium pt-1">
                    <div>
                      <span className="text-gray-400">Category:</span>{' '}
                      <span className="text-gray-700 font-semibold">{request.categories?.name || 'Uncategorized'}</span>
                    </div>
                    <span>•</span>
                    <div>
                      <span className="text-gray-400">Submitted by:</span>{' '}
                      <span className="text-gray-700 font-semibold">{request.users?.name || 'Unknown User'}</span>
                    </div>
                    <span>•</span>
                    <div>
                      <span className="text-gray-400">Submitted at:</span>{' '}
                      <span className="text-gray-700 font-semibold">{formatDate(request.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  {(request.status === 'approved' || request.status === 'rejected') && (
                    <Link
                      href={`/${resolvedParams.tenant}/requests/${resolvedParams.id}/certificate`}
                      target="_blank"
                      className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-accent/10 hover:bg-accent-light focus:outline-none transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Certificate
                    </Link>
                  )}
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    request.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                    request.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                    request.status === 'blocked' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                    'bg-yellow-50 text-yellow-700 border border-yellow-100'
                  }`}>
                    {request.status}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Document Content (Rich Text) */}
            <div className="px-6 py-8 prose max-w-none">
              <RichTextEditor content={request.body_json} editable={false} />
            </div>

            {/* Attachments Section */}
            {attachmentsWithUrls.length > 0 && (
              <div className="px-6 pb-8 border-t border-gray-100 pt-6">
                <h4 className="text-sm font-bold text-ink uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Supporting Attachments
                </h4>
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm">
                  {attachmentsWithUrls.map((att: any) => (
                    <li key={att.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-bold text-ink truncate max-w-xs md:max-w-md">{att.filename}</span>
                        <span className="text-xs text-gray-400 font-medium shrink-0">({formatBytes(att.size_bytes)})</span>
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.filename}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:border-accent/40 rounded-xl text-xs font-bold text-gray-600 hover:text-accent hover:bg-accent/5 transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Box */}
          {activeStep && request.status !== 'blocked' && (
            <div className="bg-white shadow-sm border-2 border-accent rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl pointer-events-none" />
              
              <h3 className="text-lg font-display font-extrabold text-ink mb-2">Your Approval Required</h3>
              <p className="text-xs text-gray-500 font-medium mb-4">Please review the document and submit your decision below.</p>
              
              <form action={submitAction} className="space-y-4">
                <input type="hidden" name="stepId" value={activeStep.id} />
                <div>
                  <textarea 
                    name="comment" 
                    rows={3} 
                    className="block w-full rounded-xl border border-gray-200 py-3 px-4 text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-sm" 
                    placeholder="Add an optional comment..."
                  ></textarea>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="submit" 
                    name="action" 
                    value="approve" 
                    className="flex-1 inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-xl text-sm font-bold shadow-md shadow-green-600/10 transition transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Approve
                  </button>
                  <button 
                    type="submit" 
                    name="action" 
                    value="reject" 
                    className="flex-1 inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-xl text-sm font-bold shadow-md shadow-red-600/10 transition transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Reject
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Audit Log Card */}
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-bold text-ink font-display">Audit Log</h3>
            </div>
            <div className="px-6 py-6">
              <ul className="space-y-5">
                {(auditLogs || []).map((log: any) => (
                  <li key={log.id} className="text-sm flex items-start justify-between gap-4">
                    <div className="flex gap-2.5 items-start">
                      {/* Bullet icon */}
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                      <div>
                        <span className="font-bold text-ink">{userMap.get(log.actor_id) || 'System / Staff'}</span>
                        {' '}
                        <span className="text-gray-500 font-medium">
                          {log.action_type === 'step_approve' ? 'approved this step' :
                           log.action_type === 'step_reject' ? 'rejected this step' :
                           log.action_type === 'request_blocked' ? 'blocked this request (approver inactive)' :
                           log.action_type === 'step_reassigned' ? 'reassigned this approval step' :
                           log.action_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <span className="text-gray-400 text-xs font-semibold shrink-0">{formatDate(log.created_at)}</span>
                  </li>
                ))}
                {(!auditLogs || auditLogs.length === 0) && (
                  <p className="text-sm text-gray-400 italic">No events recorded yet.</p>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Right column: Routing Slip */}
        <div className="space-y-8">

          {/* Routing Slip (Timeline) */}
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6">
            <h3 className="text-lg font-display font-extrabold text-ink mb-6">Routing Slip</h3>
            <div className="space-y-6">
              {sortedStageIndices.map((stageIdx) => {
                const steps = stageGroups[stageIdx] || [];
                // Sort steps: GENERAL first (order_index=0), then PARALLELs (order_index=1)
                steps.sort((a: any, b: any) => a.order_index - b.order_index);

                return (
                  <div key={stageIdx} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/20">
                    <div className="flex items-center gap-2 mb-4 bg-accent/5 px-2.5 py-1 rounded-lg border border-accent/10 w-fit">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase text-accent">
                        Stage {stageIdx + 1}
                      </span>
                    </div>
                    <div className="flow-root">
                      <ul className="-mb-8">
                        {steps.map((step: any, stepIdx: number) => {
                          const isLast = stepIdx === steps.length - 1;
                          const isApproved = step.status === 'approved';
                          const isRejected = step.status === 'rejected';
                          const isPending = step.status === 'pending';
                          
                          const stepApproverUser = tenantUsers?.find((tu: any) => tu.id === step.approver_id);
                          const isApproverInactive = stepApproverUser?.status === 'inactive' || stepApproverUser?.status === 'INACTIVE';

                          return (
                            <li key={step.id}>
                              <div className="relative pb-8">
                                {!isLast && (
                                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-100" aria-hidden="true"></span>
                                )}
                                <div className="relative flex space-x-3 items-start">
                                  {/* Icon sphere */}
                                  <div>
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white transition
                                      ${isApproved ? 'bg-green-500 text-white' : 
                                        isRejected ? 'bg-red-500 text-white' : 
                                        isPending ? (isApproverInactive ? 'bg-red-600 text-white' : 'bg-yellow-400 text-white') : 'bg-gray-100 text-gray-400'}`}
                                    >
                                      {isApproved ? (
                                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      ) : isRejected ? (
                                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                      ) : (
                                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </span>
                                  </div>
                                  
                                  {/* Step details */}
                                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1">
                                    <div className="space-y-1 w-full">
                                      <p className="text-sm font-bold text-ink">
                                        {step.users?.name || 'Unknown Approver'}
                                        {isApproverInactive && (
                                          <span className="ml-2 text-2xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 font-bold uppercase">
                                            Inactive
                                          </span>
                                        )}
                                      </p>
                                      <div className="flex items-center gap-1.5">
                                        <span className="inline-flex text-[10px] leading-4 font-bold rounded-md bg-gray-100 text-gray-500 uppercase tracking-wider px-1.5">
                                          {step.type}
                                        </span>
                                        {isPending && (
                                          <span className={`inline-flex text-[10px] leading-4 font-bold rounded-md uppercase tracking-wider px-1.5 ${
                                            isApproverInactive ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-600'
                                          }`}>
                                            {isApproverInactive ? 'Blocked' : 'Pending'}
                                          </span>
                                        )}
                                      </div>
                                      {step.comment && (
                                        <div className="mt-2 text-xs italic text-gray-600 bg-gray-50 border border-gray-100 p-2.5 rounded-xl">
                                          "{step.comment}"
                                        </div>
                                      )}

                                      {/* Blocked step reassignment interface */}
                                      {isPending && isApproverInactive && (isOwner || isAdmin) && (
                                        <form action={reassignAction} className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                                          <input type="hidden" name="stepId" value={step.id} />
                                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                            Reassign Approver
                                          </label>
                                          <div className="flex gap-2">
                                            <select 
                                              name="newApproverId" 
                                              required
                                              className="block flex-1 rounded-lg border border-gray-200 py-1.5 px-3 text-xs text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
                                            >
                                              <option value="">Select active staff...</option>
                                              {activeTenantUsers.map(u => (
                                                <option key={u.id} value={u.id}>
                                                  {u.name} - {u.designation || 'Staff'} ({u.career_level || 'L1'})
                                                </option>
                                              ))}
                                            </select>
                                            <button 
                                              type="submit" 
                                              className="inline-flex items-center justify-center px-3 py-1.5 bg-accent hover:bg-accent-light text-white text-xs font-bold rounded-lg transition"
                                            >
                                              Reassign
                                            </button>
                                          </div>
                                        </form>
                                      )}
                                    </div>
                                    <div className="whitespace-nowrap text-right text-xs text-gray-400 font-semibold">
                                      {step.acted_at ? formatDate(step.acted_at) : isPending ? 'Active' : 'Waiting'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })}

              {/* Reference Steps Section */}
              {referenceSteps.length > 0 && (
                <div className="border-t border-gray-100 pt-6 mt-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-gray-400" />
                    FYI / References
                  </h4>
                  <ul className="space-y-4">
                    {referenceSteps.map((step: any) => {
                      const isApproved = step.status === 'approved';
                      const isRejected = step.status === 'rejected';
                      const isPending = step.status === 'pending';
                      const stepApproverUser = tenantUsers?.find((tu: any) => tu.id === step.approver_id);
                      const isApproverInactive = stepApproverUser?.status === 'inactive' || stepApproverUser?.status === 'INACTIVE';

                      return (
                        <li key={step.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              isApproved ? 'bg-green-500' :
                              isRejected ? 'bg-red-500' :
                              isPending ? (isApproverInactive ? 'bg-red-500' : 'bg-yellow-400') :
                              'bg-gray-300'
                            }`} />
                            <span className="font-semibold text-ink">{step.users?.name || 'Unknown User'}</span>
                            {isApproverInactive && (
                              <span className="text-[10px] text-red-600 bg-red-50 px-1 rounded uppercase font-bold">
                                Inactive
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 font-semibold">
                            {step.acted_at ? formatDate(step.acted_at) : isPending ? 'Active' : 'Waiting'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
