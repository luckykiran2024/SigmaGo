import { getOutgoingReferences, getIncomingReferences, getExceptionCount } from '@/lib/db/references';
import { DecisionReferencesCard } from '@/components/ui/DecisionReferencesCard';
import RecordOfflineButton from './RecordOfflineButton';
import Link from 'next/link';
import { getRequestDetail, getSignedUrl } from '@/lib/db/requests';
import { getValidityInfo } from '@/lib/utils/validity';
import { getCustomFieldsForTenant } from '@/lib/db/customFields';
import { actOnStep } from '@/lib/db/steps';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { AlertTriangle, MessageSquare, ArrowLeft, Paperclip, Download, ShieldCheck } from 'lucide-react';
import { getProfileForAuthUser } from '@/lib/db/users';
import TimelineEditor from './TimelineEditor';
import LifecycleStrip from '@/components/ui/LifecycleStrip';
import StepBadge from '@/components/ui/StepBadge';

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
      .select('id, name, email, status, designation, career_level, employee_id')
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
  const customFieldDefs = tenantId ? await getCustomFieldsForTenant(tenantId) : [];
  const outgoingRefs = tenantId ? await getOutgoingReferences(resolvedParams.id, tenantId) : [];
  const incomingRefs = tenantId ? await getIncomingReferences(resolvedParams.id, tenantId) : [];
  const exceptionCount = tenantId ? await getExceptionCount(resolvedParams.id, tenantId) : 0;
    
  const userMap = new Map((tenantUsers || []).map(u => [u.id, u.name]));
  const activeTenantUsers = (tenantUsers || []).filter(u => u.status === 'active' || u.status === 'ACTIVE');
  const validity = getValidityInfo(request as any);

  const isOwner = request.owner_id === loggedInPublicUser?.id;
  const isAdmin = loggedInPublicUser?.role === 'admin' || loggedInPublicUser?.role === 'super_admin' || loggedInPublicUser?.role === 'ADMIN' || loggedInPublicUser?.role === 'SUPER_ADMIN';

  const isOnPath = request.approval_steps?.some((s: any) => s.approver_id === loggedInPublicUser?.id);
  const isGrantee = request.view_grants?.some((g: any) => g.grantee_id === loggedInPublicUser?.id && g.status === 'active');
  const hasAccessToArchived = isAdmin || isOnPath || isGrantee;

  if (request.archived && !hasAccessToArchived) {
    return (
      <div className="p-8 text-center bg-white border border-[#DDE5EC] rounded-[10px] max-w-lg mx-auto mt-12 shadow-xs font-sans text-[#132238]">
        <AlertTriangle className="w-10 h-10 text-[#B42318] mx-auto mb-3" />
        <h2 className="text-[18px] font-semibold text-[#132238]">Access Denied</h2>
        <p className="text-[13.5px] text-[#526377] mt-2">
          This approval request has been archived and is only accessible by administrators, assigned approvers, or explicitly authorized team members.
        </p>
      </div>
    );
  }

  const nowStr = new Date().toISOString();
  const { data: activeDelegations } = await supabase
    .from('delegations')
    .select('delegator_id')
    .eq('tenant_id', tenantId)
    .eq('delegate_id', loggedInPublicUser?.id)
    .eq('status', 'active')
    .filter('', 'and', `(or(starts_at.is.null,starts_at.lte.${nowStr}),or(ends_at.is.null,ends_at.gte.${nowStr}))`);

  const delegatorIds = activeDelegations?.map((d: any) => d.delegator_id) || [];

  const activeStep = request.approval_steps?.find(
    (s: any) => s.status === 'pending' && (
      s.approver_id === loggedInPublicUser?.id ||
      delegatorIds.includes(s.approver_id)
    )
  );

  const isDelegatedStep = activeStep && activeStep.approver_id !== loggedInPublicUser?.id;
  const delegatorName = isDelegatedStep ? (userMap.get(activeStep.approver_id) || 'Assigned Approver') : '';

  let activeDirectApproverId = null;
  const pendingStep = request.approval_steps?.find((s: any) => s.status === 'pending');
  const activeDirectStep = request.approval_steps?.find(
    (s: any) => s.status === 'pending' && s.type === 'GENERAL'
  );
  if (activeDirectStep) {
    activeDirectApproverId = activeDirectStep.approver_id;
  }

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

    if (action === 'discuss' && (!comment || comment.trim().length === 0)) {
      throw new Error('Comment is required when requesting a discussion.');
    }

    let actionVal: 'approved' | 'rejected' | 'discuss' = 'approved';
    if (action === 'reject') actionVal = 'rejected';
    else if (action === 'discuss') actionVal = 'discuss';

    await actOnStep({
      stepId,
      action: actionVal,
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

    const isUserOwner = request.owner_id === actionPublicUser.id;
    const isUserAdmin = actionPublicUser.role === 'admin' || actionPublicUser.role === 'super_admin' || actionPublicUser.role === 'ADMIN' || actionPublicUser.role === 'SUPER_ADMIN';
    if (!isUserOwner && !isUserAdmin) {
      throw new Error('Unauthorized to reassign step approver');
    }

    const stepId = formData.get('stepId') as string;
    const newApproverId = formData.get('newApproverId') as string;

    const { data: oldStep } = await adminClient
      .from('approval_steps')
      .select('approver_id')
      .eq('id', stepId)
      .single();

    if (!oldStep) return;

    await adminClient
      .from('approval_steps')
      .update({
        approver_id: newApproverId,
        status: 'pending'
      })
      .eq('id', stepId);

    await adminClient
      .from('approval_requests')
      .update({ status: 'pending' })
      .eq('id', resolvedParams.id);

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

  const stepType = request.categories?.step_type || 'TRANSACTIONAL';

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-6 font-sans text-[#132238] space-y-6">
      {/* Back Link */}
      <div>
        <Link 
          href={`/${resolvedParams.tenant}`}
          className="inline-flex items-center text-[13px] font-medium text-[#078899] hover:text-[#012F6B] transition gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {request.status === 'blocked' && (
        <div className="p-4 rounded-[8px] bg-[#FEF3F2] border border-[#FECDCA] flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-[#B42318] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[14px] font-semibold text-[#B42318]">Workflow Blocked</h4>
            <p className="text-[13px] text-[#526377] mt-0.5">
              This approval request is blocked because an assigned approver became inactive. The request owner or a workspace admin must reassign the pending step.
            </p>
          </div>
        </div>
      )}

      {request.status === 'in_discussion' && (
        <div className="p-4 rounded-[8px] bg-[#F1FBFC] border border-[#DDF5F7] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-3 items-start">
            <MessageSquare className="w-5 h-5 text-[#078899] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[14px] font-semibold text-[#012F6B]">Request in Discussion</h4>
              <p className="text-[13px] text-[#526377] mt-0.5">
                An approver has requested clarification on this request. Review the reasoning or resume the workflow.
              </p>
            </div>
          </div>
          {(request.owner_id === loggedInPublicUser?.id ||
            request.approval_steps?.some((s: any) => s.approver_id === loggedInPublicUser?.id) ||
            loggedInPublicUser?.role === 'admin' ||
            loggedInPublicUser?.role === 'super_admin' ||
            loggedInPublicUser?.role === 'ADMIN' ||
            loggedInPublicUser?.role === 'SUPER_ADMIN') && (
            <form action={async () => {
              'use server';
              const { resumeRequestAction } = await import('./discussionActions');
              await resumeRequestAction(resolvedParams.tenant, resolvedParams.id);
            }}>
              <button
                type="submit"
                className="shrink-0 bg-[#012F6B] hover:bg-[#033E79] text-white text-[12.5px] font-medium py-2 px-4 rounded-[6px] transition shadow-xs"
              >
                Resume & Review
              </button>
            </form>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left column: Document details & Audit logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* 4-State Decision Lifecycle Strip */}
          <LifecycleStrip
            request={{
              id: request.id,
              refCode: request.ref || `REQ-${request.id.slice(0, 8)}`,
              reasoning: request.approval_steps?.map((s: any) => s.comment).filter(Boolean).join(' '),
              sealed: Boolean(request.checksum_sha256 || request.finalized_at),
              finalizedAt: request.finalized_at,
              referenceCount: outgoingRefs.length,
            }}
          />

          {/* Main Document Details Card */}
          <div className="bg-white border border-[#DDE5EC] rounded-[10px] shadow-xs overflow-hidden">
            {/* Header info */}
            <div className="px-6 py-6 border-b border-[#DDE5EC] bg-[#F7FAFC]">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[12.5px] font-semibold text-[#012F6B] px-2 py-0.5 rounded-[4px] bg-[#EDF2F6] border border-[#DDE5EC]">
                      {request.ref || `REQ-${request.id.slice(0, 8)}`}
                    </span>
                    <StepBadge type={stepType} size="sm" />
                  </div>
                  <h1 className="text-[24px] font-semibold text-[#132238] leading-snug">{request.subject}</h1>
                  
                  {/* Beneficiary Info */}
                  {request.beneficiary && (
                    <div className="flex items-center gap-2 text-[13px] pt-0.5">
                      <span className="text-[#8190A0]">Beneficiary:</span>
                      <span className="font-semibold text-[#132238]">{(request.beneficiary as any).name}</span>
                      {(request.beneficiary as any).designation && (
                        <span className="text-[#526377]">— {(request.beneficiary as any).designation}</span>
                      )}
                      {(request.beneficiary as any).employee_id && (
                        <span className="text-[11px] text-[#526377] bg-[#F3F6F8] px-1.5 py-0.5 rounded-[4px] font-mono">{(request.beneficiary as any).employee_id}</span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#526377] pt-1">
                    <div>
                      <span className="text-[#8190A0]">Category:</span>{' '}
                      <span className="text-[#132238] font-medium">{request.categories?.name || 'Uncategorized'}</span>
                    </div>
                    <span>•</span>
                    <div>
                      <span className="text-[#8190A0]">Submitted by:</span>{' '}
                      <span className="text-[#132238] font-medium">{request.users?.name || 'Unknown User'}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-[#8190A0]">Submitted at:</span>{' '}
                      <span className="text-[#132238] font-medium">{formatDate(request.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  {(request.status === 'approved' || request.status === 'rejected') && (
                    <Link
                      href={`/${resolvedParams.tenant}/requests/${resolvedParams.id}/certificate`}
                      target="_blank"
                      className="inline-flex items-center justify-center rounded-[6px] bg-[#012F6B] hover:bg-[#033E79] px-3.5 py-2 text-[12.5px] font-medium text-white shadow-xs transition"
                    >
                      <ShieldCheck className="w-4 h-4 mr-1.5" />
                      Certificate
                    </Link>
                  )}
                  {/* Validity Badge */}
                  {validity.state !== 'NOT_APPLICABLE' && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-[4px] text-[11.5px] font-medium border font-mono ${validity.badgeClass}`}>
                      {validity.label}
                    </span>
                  )}
                  {/* Renew Button */}
                  {request.status === 'approved' && (validity.isExpired || validity.isExpiringSoon || request.valid_until) && (
                    <Link
                      href={`/${resolvedParams.tenant}/requests/new?renewFrom=${request.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#012F6B] text-white text-[12px] font-medium rounded-[6px] shadow-xs hover:bg-[#033E79] transition"
                    >
                      ↻ Renew
                    </Link>
                  )}
                  {/* Record Offline Button */}
                  {pendingStep && (isOwner || isAdmin) && (
                    <RecordOfflineButton
                      tenant={resolvedParams.tenant}
                      requestId={request.id}
                      stepId={pendingStep.id}
                      approverName={userMap.get(pendingStep.approver_id) || 'Approver'}
                    />
                  )}
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-[4px] text-[11px] font-semibold uppercase tracking-wider border font-mono ${
                    request.status === 'approved' ? 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]' :
                    request.status === 'rejected' ? 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]' :
                    request.status === 'blocked' ? 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]' :
                    request.status === 'in_discussion' ? 'bg-[#F1FBFC] text-[#078899] border-[#DDF5F7]' :
                    'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
                  }`}>
                    {request.status === 'in_discussion' ? 'discuss' : request.status}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Document Content (Rich Text) */}
            <div className="px-6 py-6 prose max-w-none text-[#132238] font-sans text-[14.5px] leading-[1.65] prose-headings:font-sans prose-headings:text-[#132238] prose-a:text-[#059DB0] hover:prose-a:underline select-text">
              <RichTextEditor content={request.body_json} editable={false} />

              {/* Custom Fields */}
              {request.custom_fields && Object.keys(request.custom_fields as Record<string, any>).length > 0 && (
                <div className="mt-6 border-t border-[#EAF0F4] pt-5">
                  <h3 className="text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider mb-3">Additional Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(request.custom_fields as Record<string, any>).map(([key, value]) => {
                      const fieldDef = customFieldDefs.find((f: any) => f.key === key);
                      const label = fieldDef ? fieldDef.label : key;
                      return (
                        <div key={key} className="bg-[#F7FAFC] border border-[#EAF0F4] rounded-[6px] px-3.5 py-2.5">
                          <div className="text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider">{label}</div>
                          <div className="text-[13.5px] font-medium text-[#132238] mt-0.5">{String(value) || '—'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Attachments Section */}
            {attachmentsWithUrls.length > 0 && (
              <div className="px-6 pb-6 border-t border-[#DDE5EC] pt-5">
                <h4 className="text-[12px] font-semibold text-[#8190A0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-[#012F6B]" />
                  Supporting Attachments
                </h4>
                <ul className="divide-y divide-[#EAF0F4] border border-[#DDE5EC] rounded-[8px] bg-white overflow-hidden shadow-xs">
                  {attachmentsWithUrls.map((att: any) => (
                    <li key={att.id} className="flex items-center justify-between p-3.5 hover:bg-[#F7FAFC] transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <Paperclip className="w-4 h-4 text-[#8190A0] shrink-0" />
                        <span className="text-[13.5px] font-medium text-[#132238] truncate max-w-xs md:max-w-md">{att.filename}</span>
                        <span className="text-[11.5px] text-[#8190A0] shrink-0 font-mono">({formatBytes(att.size_bytes)})</span>
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.filename}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#DDE5EC] hover:border-[#059DB0] rounded-[6px] text-[12px] font-medium text-[#526377] hover:text-[#012F6B] hover:bg-white transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Decision References Card */}
          <DecisionReferencesCard
            tenantSubdomain={resolvedParams.tenant}
            requestId={resolvedParams.id}
            outgoingRefs={outgoingRefs as any}
            incomingRefs={incomingRefs as any}
            exceptionCount={exceptionCount}
            currentUserId={loggedInPublicUser?.id || ''}
            isAdmin={isAdmin}
          />

          {/* Action Box */}
          {activeStep && request.status !== 'blocked' && (
            <div className="bg-white shadow-xs border border-[#059DB0]/40 rounded-[10px] p-6 relative overflow-hidden space-y-4">
              <div>
                <h3 className="text-[16px] font-semibold text-[#132238]">
                  {isDelegatedStep ? 'Approval Required (Acting as Delegate)' : 'Your Approval Required'}
                </h3>
                <p className="text-[13px] text-[#526377] mt-0.5">
                  {isDelegatedStep 
                    ? `You are acting on behalf of ${delegatorName} as their active delegate. Please review the document and record your decision.`
                    : 'Please review the document and record your decision below.'
                  }
                </p>
              </div>
              
              <form action={submitAction} className="space-y-4">
                <input type="hidden" name="stepId" value={activeStep.id} />
                <div>
                  <textarea 
                    name="comment" 
                    rows={3} 
                    className="block w-full rounded-[6px] border border-[#DDE5EC] py-2.5 px-3.5 text-[#132238] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#059DB0] transition text-[13.5px]" 
                    placeholder="Add an optional comment or reasoning rationale..."
                  ></textarea>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="submit" 
                    name="action" 
                    value="approve" 
                    className="flex-1 inline-flex items-center justify-center bg-[#0F7548] hover:bg-[#0c5e3a] text-white py-2 px-4 rounded-[6px] text-[13px] font-medium shadow-xs transition"
                  >
                    Approve
                  </button>
                  <button 
                    type="submit" 
                    name="action" 
                    value="reject" 
                    className="flex-1 inline-flex items-center justify-center bg-[#B42318] hover:bg-[#911c13] text-white py-2 px-4 rounded-[6px] text-[13px] font-medium shadow-xs transition"
                  >
                    Reject
                  </button>
                  <button 
                    type="submit" 
                    name="action" 
                    value="discuss" 
                    className="flex-1 inline-flex items-center justify-center bg-[#012F6B] hover:bg-[#033E79] text-white py-2 px-4 rounded-[6px] text-[13px] font-medium shadow-xs transition"
                  >
                    Discuss
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Audit Log Card */}
          <div className="bg-white border border-[#DDE5EC] rounded-[10px] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#DDE5EC] bg-[#F7FAFC]">
              <h3 className="text-[15px] font-semibold text-[#132238]">Audit History & System Lineage</h3>
            </div>
            <div className="px-6 py-5">
              <ul className="space-y-4">
                {(auditLogs || []).map((log: any) => (
                  <li key={log.id} className="text-[13px] flex items-start justify-between gap-4">
                    <div className="flex gap-2.5 items-start">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#059DB0] shrink-0" />
                      <div>
                        {log.metadata?.summary ? (
                          <span className="text-[#132238] font-medium">{log.metadata.summary}</span>
                        ) : (
                          <>
                            <span className="font-semibold text-[#132238]">{userMap.get(log.actor_id) || 'System / Staff'}</span>
                            {' '}
                            <span className="text-[#526377]">
                              {log.action_type === 'step_approved' ? 'approved this step' :
                               log.action_type === 'step_rejected' ? 'rejected this step' :
                               log.action_type === 'step_approve' ? 'approved this step' :
                               log.action_type === 'step_reject' ? 'rejected this step' :
                               log.action_type === 'step_discussion' ? 'requested discussion' :
                               log.action_type === 'request_resumed' ? 'resumed this request' :
                               log.action_type === 'request_blocked' ? 'blocked this request (approver inactive)' :
                               log.action_type === 'step_reassigned' ? 'reassigned this approval step' :
                               log.action_type.replace(/_/g, ' ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-[#8190A0] text-[11.5px] shrink-0 font-mono">{formatDate(log.created_at)}</span>
                  </li>
                ))}
                {(!auditLogs || auditLogs.length === 0) && (
                  <p className="text-[13px] text-[#8190A0] italic">No events recorded yet.</p>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Right column: Timeline Editor */}
        <div className="space-y-6">
          <TimelineEditor
            tenantSubdomain={resolvedParams.tenant}
            requestId={resolvedParams.id}
            initialSteps={request.approval_steps as any || []}
            tenantUsers={tenantUsers || []}
            activeTenantUsers={activeTenantUsers || []}
            loggedInPublicUserId={loggedInPublicUser?.id || ''}
            isAdmin={isAdmin}
            activeDirectApproverId={activeDirectApproverId}
            reassignAction={reassignAction}
            isRequestBlocked={request.status === 'blocked'}
            isOwner={isOwner}
            requestStatus={request.status}
          />
        </div>
      </div>
    </div>
  );
}
