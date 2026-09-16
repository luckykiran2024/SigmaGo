"use client";

import { useState } from 'react';
import { Users, AlertTriangle, Plus, Trash2, ArrowUp, ArrowDown, Check, Edit2 } from 'lucide-react';
import { amendPathAction } from './amendActions';
import PersonPicker from '@/components/ui/PersonPicker';

interface TenantUser {
  id: string;
  name: string;
  email: string;
  status: string;
  designation: string | null;
  career_level: string | null;
  employee_id: string | null;
}

interface Step {
  id: string;
  approver_id: string;
  type: 'GENERAL' | 'PARALLEL' | 'REFERENCE';
  status: 'waiting' | 'pending' | 'approved' | 'rejected' | 'skipped';
  acted_at: string | null;
  comment: string | null;
  acted_by_id?: string | null;
  acted_by?: {
    id: string;
    name: string;
  } | null;
}

interface TimelineEditorProps {
  tenantSubdomain: string;
  requestId: string;
  initialSteps: Step[];
  tenantUsers: TenantUser[];
  activeTenantUsers: TenantUser[];
  loggedInPublicUserId: string;
  isAdmin: boolean;
  activeDirectApproverId: string | null;
  reassignAction: (formData: FormData) => Promise<void>;
  isRequestBlocked: boolean;
  isOwner: boolean;
  requestStatus: string;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(new Date(dateStr));
}

export default function TimelineEditor({
  tenantSubdomain,
  requestId,
  initialSteps,
  tenantUsers,
  activeTenantUsers,
  loggedInPublicUserId,
  isAdmin,
  activeDirectApproverId,
  reassignAction,
  isRequestBlocked,
  isOwner,
  requestStatus
}: TimelineEditorProps) {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Editable path state
  const [editPendingSteps, setEditPendingSteps] = useState<Array<{ id?: string; approverId: string; type: 'GENERAL' | 'PARALLEL' | 'REFERENCE' }>>([]);

  const isRequestActive = requestStatus === 'pending' || requestStatus === 'blocked';
  const canAmend = isRequestActive && (isAdmin || loggedInPublicUserId === activeDirectApproverId);

  const startEditing = () => {
    const pending = steps.filter(s => s.status === 'pending' || s.status === 'waiting');
    setEditPendingSteps(pending.map(s => ({
      id: s.id,
      approverId: s.approver_id,
      type: s.type
    })));
    setErrorMsg(null);
    setIsEditing(true);
  };

  const addStepRow = () => {
    setEditPendingSteps([...editPendingSteps, { approverId: '', type: 'GENERAL' }]);
  };

  const removeStepRow = (idx: number) => {
    setEditPendingSteps(editPendingSteps.filter((_, i) => i !== idx));
  };

  const moveStepUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...editPendingSteps];
    const temp = updated[idx];
    updated[idx] = updated[idx - 1];
    updated[idx - 1] = temp;
    setEditPendingSteps(updated);
  };

  const moveStepDown = (idx: number) => {
    if (idx === editPendingSteps.length - 1) return;
    const updated = [...editPendingSteps];
    const temp = updated[idx];
    updated[idx] = updated[idx + 1];
    updated[idx + 1] = temp;
    setEditPendingSteps(updated);
  };

  const updateStep = (idx: number, key: 'approverId' | 'type', value: any) => {
    const updated = [...editPendingSteps];
    updated[idx] = {
      ...updated[idx],
      [key]: value
    };
    setEditPendingSteps(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const filledSteps = editPendingSteps.filter(s => s.approverId);
    if (filledSteps.length === 0) {
      setErrorMsg("At least one step is required in the pending path.");
      return;
    }

    setIsSaving(true);
    try {
      await amendPathAction(tenantSubdomain, requestId, filledSteps);
      setIsEditing(false);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save amended path.");
      setIsSaving(false);
    }
  };

  // Group steps for display timeline
  const referenceSteps = steps.filter((s: any) => s.type === 'REFERENCE');
  const stageSteps = steps.filter((s: any) => s.type !== 'REFERENCE');

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

  const userMap = new Map(tenantUsers.map(u => [u.id, u.name]));
  const actedSteps = steps.filter(s => s.status === 'approved' || s.status === 'rejected' || s.status === 'skipped');

  return (
    <div className="space-y-8 font-sans text-[#132238]">
      {/* Routing Slip (Timeline Card) */}
      <div className="bg-white border border-[#DDE5EC] rounded-[10px] shadow-xs p-6">
        <div className="flex items-center justify-between mb-5 border-b border-[#EAF0F4] pb-3">
          <h3 className="text-[16px] font-semibold text-[#132238]">Routing Slip</h3>
          {canAmend && !isEditing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#DDE5EC] rounded-[6px] text-[12.5px] font-medium text-[#526377] hover:text-[#012F6B] hover:bg-[#F7FAFC] transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Amend Path</span>
            </button>
          )}
        </div>

        {isEditing ? (
          /* AMEND PATH EDITING UI */
          <form onSubmit={handleSave} className="space-y-4">
            <div className="p-3.5 rounded-[6px] bg-[#F1FBFC] border border-[#DDF5F7] text-[12px] text-[#078899] leading-relaxed">
              <strong>Path Amendment Guide:</strong> Acted steps are frozen and locked at the top of the path. You can add, delete, and reorder pending steps below them. Saving resets modified pending steps to queued status and recalculates sequence order.
            </div>

            {errorMsg && (
              <div className="p-3 rounded-[6px] bg-[#FEF3F2] border border-[#FECDCA] text-[12px] font-medium text-[#B42318] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#B42318]" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2.5">
              {/* Acted (Frozen) Steps */}
              {actedSteps.map((step, idx) => {
                const u = tenantUsers.find(tu => tu.id === step.approver_id);
                return (
                  <div key={`acted-${idx}`} className="p-3 border border-[#DDE5EC] rounded-[6px] bg-[#F7FAFC] flex items-center justify-between gap-3 text-[12px] opacity-80">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#526377] flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#8190A0]" />
                        {u ? u.name : 'Unknown Approver'}
                        <span className="text-[10px] font-medium bg-[#EDF2F6] text-[#526377] px-1.5 py-0.5 rounded border border-[#DDE5EC] uppercase tracking-wider">
                          Frozen
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8190A0] mt-0.5 uppercase tracking-wider font-mono">{step.type} Approver • {step.status}</div>
                    </div>
                  </div>
                );
              })}

              {/* Editable Steps Header */}
              {editPendingSteps.length > 0 && (
                <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider mt-3">
                  <div className="col-span-6">Approver</div>
                  <div className="col-span-4">Role</div>
                  <div className="col-span-2 text-center">Actions</div>
                </div>
              )}

              {/* Editable Pending Steps */}
              {editPendingSteps.map((row, idx) => (
                <div key={`pending-${idx}`} className="p-3 border border-[#DDE5EC] rounded-[6px] bg-white grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:border-[#059DB0] transition">
                  {/* User Selection */}
                  <div className="col-span-1 md:col-span-6">
                    <label className="block md:hidden text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider mb-1">
                      Approver
                    </label>
                    <PersonPicker
                      tenant={tenantSubdomain}
                      activeOnly={true}
                      value={row.approverId}
                      onSelect={(val) => updateStep(idx, 'approverId', val || '')}
                      placeholder="Select active staff..."
                    />
                  </div>

                  {/* Role Selector */}
                  <div className="col-span-1 md:col-span-4">
                    <label className="block md:hidden text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider mb-1">
                      Role
                    </label>
                    <select
                      value={row.type}
                      onChange={e => updateStep(idx, 'type', e.target.value)}
                      required
                      className="block w-full rounded-[6px] border border-[#DDE5EC] py-2 px-2.5 text-[#132238] text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-[#059DB0] transition font-medium"
                    >
                      <option value="GENERAL">Direct Approver</option>
                      <option value="PARALLEL">Parallel Approver</option>
                      <option value="REFERENCE">FYI / Reference</option>
                    </select>
                  </div>

                  {/* Move Up, Down, Delete Actions */}
                  <div className="col-span-1 md:col-span-2 flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveStepUp(idx)}
                      disabled={idx === 0}
                      className="text-[#8190A0] hover:text-[#012F6B] disabled:opacity-30 p-1 rounded transition hover:bg-[#F7FAFC]"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStepDown(idx)}
                      disabled={idx === editPendingSteps.length - 1}
                      className="text-[#8190A0] hover:text-[#012F6B] disabled:opacity-30 p-1 rounded transition hover:bg-[#F7FAFC]"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStepRow(idx)}
                      disabled={actedSteps.length + editPendingSteps.length <= 1}
                      className="text-[#8190A0] hover:text-[#B42318] disabled:opacity-30 p-1 rounded transition hover:bg-[#FEF3F2]"
                      title="Remove Step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Path Actions Form footer */}
            <div className="flex items-center justify-between border-t border-[#EAF0F4] pt-3 mt-2">
              <button
                type="button"
                onClick={addStepRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-dashed border-[#059DB0] rounded-[6px] text-[12px] font-medium text-[#078899] hover:bg-[#F1FBFC] transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Step
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 border border-[#DDE5EC] text-[#526377] rounded-[6px] text-[12.5px] font-medium hover:bg-[#F7FAFC] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-[#012F6B] hover:bg-[#033E79] text-white rounded-[6px] text-[12.5px] font-medium transition shadow-xs disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* DISPLAY MODE TIMELINE */
          <div className="space-y-4">
            {sortedStageIndices.map((stageIdx) => {
              const stageStepsList = stageGroups[stageIdx] || [];
              stageStepsList.sort((a: any, b: any) => a.order_index - b.order_index);

              return (
                <div key={stageIdx} className="border border-[#DDE5EC] rounded-[8px] p-4 bg-[#F7FAFC]/50">
                  <div className="flex items-center gap-2 mb-3 bg-[#F1FBFC] px-2.5 py-1 rounded-[4px] border border-[#DDF5F7] w-fit">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-[#012F6B]">
                      Stage {stageIdx + 1}
                    </span>
                  </div>
                  <div className="flow-root">
                    <ul className="-mb-6">
                      {stageStepsList.map((step: any, stepIdx: number) => {
                        const isLast = stepIdx === stageStepsList.length - 1;
                        const isApproved = step.status === 'approved';
                        const isRejected = step.status === 'rejected';
                        const isPending = step.status === 'pending';
                        
                        const stepApproverUser = tenantUsers?.find((tu: any) => tu.id === step.approver_id);
                        const isApproverInactive = stepApproverUser?.status === 'inactive' || stepApproverUser?.status === 'INACTIVE';

                        return (
                          <li key={step.id}>
                            <div className="relative pb-6">
                              {!isLast && (
                                <span className="absolute top-4 left-4 -ml-px h-full w-[2px] bg-[#DDE5EC]" aria-hidden="true"></span>
                              )}
                              <div className="relative flex space-x-3 items-start">
                                {/* Icon sphere */}
                                <div>
                                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white transition
                                    ${isApproved ? 'bg-[#0F7548] text-white' : 
                                      isRejected ? 'bg-[#B42318] text-white' : 
                                      isPending ? (isApproverInactive ? 'bg-[#B42318] text-white' : 'bg-[#059DB0] text-white') : 'bg-[#F3F6F8] text-[#8190A0] border border-[#DDE5EC]'}`}
                                  >
                                    {isApproved ? (
                                      <Check className="h-4 w-4 stroke-[2.5]" />
                                    ) : isRejected ? (
                                      <span className="text-sm font-bold">✕</span>
                                    ) : (
                                      <span className="w-2 h-2 rounded-full bg-white" />
                                    )}
                                  </span>
                                </div>
                                
                                {/* Step details */}
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1">
                                  <div className="space-y-1 w-full">
                                    <p className="text-[13.5px] font-semibold text-[#132238]">
                                      {step.acted_by_id && step.acted_by_id !== step.approver_id ? (
                                        <span>
                                          {step.status === 'approved' ? 'Approved' : step.status === 'rejected' ? 'Rejected' : 'Actioned'} by{' '}
                                          <span className="text-[#012F6B] font-semibold">{step.acted_by?.name || 'Delegate'}</span>{' '}
                                          (delegate for {userMap.get(step.approver_id) || 'Unknown Approver'})
                                        </span>
                                      ) : (
                                        userMap.get(step.approver_id) || 'Unknown Approver'
                                      )}
                                      {isApproverInactive && (
                                        <span className="ml-2 text-[10px] text-[#B42318] bg-[#FEF3F2] px-1.5 py-0.5 rounded border border-[#FECDCA] font-semibold uppercase">
                                          Inactive
                                        </span>
                                      )}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex text-[10.5px] font-medium rounded-[4px] bg-[#F3F6F8] text-[#526377] uppercase tracking-wider px-1.5 py-0.5 border border-[#DDE5EC]">
                                        {step.type}
                                      </span>
                                      {isPending && (
                                        <span className={`inline-flex text-[10.5px] font-medium rounded-[4px] uppercase tracking-wider px-1.5 py-0.5 border ${
                                          isApproverInactive ? 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]' : 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
                                        }`}>
                                          {isApproverInactive ? 'Blocked' : 'Pending'}
                                        </span>
                                      )}
                                    </div>
                                    {step.comment && (
                                      <div className="mt-2 text-[12px] italic text-[#526377] bg-white border border-[#DDE5EC] p-2.5 rounded-[6px]">
                                        &quot;{step.comment}&quot;
                                      </div>
                                    )}

                                    {/* Blocked step reassignment interface */}
                                    {isPending && isApproverInactive && (isOwner || isAdmin) && (
                                      <form action={reassignAction} className="mt-3 p-3 bg-white border border-[#DDE5EC] rounded-[6px] space-y-2">
                                        <input type="hidden" name="stepId" value={step.id} />
                                        <label className="block text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider">
                                          Reassign Approver
                                        </label>
                                        <div className="flex gap-2">
                                          <div className="flex-1">
                                            <PersonPicker
                                              tenant={tenantSubdomain}
                                              activeOnly={true}
                                              name="newApproverId"
                                              placeholder="Select active staff..."
                                            />
                                          </div>
                                          <button 
                                            type="submit" 
                                            className="inline-flex items-center justify-center px-3.5 py-1.5 bg-[#012F6B] hover:bg-[#033E79] text-white text-[12px] font-medium rounded-[6px] transition shadow-xs"
                                          >
                                            Reassign
                                          </button>
                                        </div>
                                      </form>
                                    )}
                                  </div>
                                  <div className="whitespace-nowrap text-right text-[11px] text-[#8190A0] font-mono">
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
              <div className="border-t border-[#EAF0F4] pt-4 mt-2">
                <h4 className="text-[11px] font-semibold text-[#8190A0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#8190A0]" />
                  FYI / References
                </h4>
                <ul className="space-y-2.5">
                  {referenceSteps.map((step: any) => {
                    const isApproved = step.status === 'approved';
                    const isRejected = step.status === 'rejected';
                    const isPending = step.status === 'pending';
                    const stepApproverUser = tenantUsers?.find((tu: any) => tu.id === step.approver_id);
                    const isApproverInactive = stepApproverUser?.status === 'inactive' || stepApproverUser?.status === 'INACTIVE';

                    return (
                      <li key={step.id} className="flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            isApproved ? 'bg-[#0F7548]' :
                            isRejected ? 'bg-[#B42318]' :
                            isPending ? (isApproverInactive ? 'bg-[#B42318]' : 'bg-[#059DB0]') :
                            'bg-[#DDE5EC]'
                          }`} />
                          <span className="font-medium text-[#132238]">{userMap.get(step.approver_id) || 'Unknown User'}</span>
                          {isApproverInactive && (
                            <span className="text-[10px] text-[#B42318] bg-[#FEF3F2] px-1 rounded uppercase font-semibold">
                              Inactive
                            </span>
                          )}
                        </div>
                        <span className="text-[11.5px] text-[#8190A0] font-mono">
                          {step.acted_at ? formatDate(step.acted_at) : isPending ? 'Active' : 'Waiting'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Lock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}
