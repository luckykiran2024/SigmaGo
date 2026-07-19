"use client";

import { useState } from 'react';
import { Users, AlertTriangle, Plus, Trash2, ArrowUp, ArrowDown, ShieldCheck, Check, Edit2 } from 'lucide-react';
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
    <div className="space-y-8 font-ibmsans text-ink">
      {/* Routing Slip (Timeline Card) */}
      <div className="bg-paper border border-hair rounded-[14px] shadow-[0_10px_28px_rgba(60,55,30,0.10)] p-6">
        <div className="flex items-center justify-between mb-6 border-b border-hair pb-3">
          <h3 className="text-lg font-ibmserif font-bold text-ink">Routing Slip</h3>
          {canAmend && !isEditing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-hair rounded-full text-xs font-bold text-ink hover:bg-panel transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Amend Path
            </button>
          )}
        </div>

        {isEditing ? (
          /* AMEND PATH EDITING UI */
          <form onSubmit={handleSave} className="space-y-5">
            <div className="p-3.5 rounded-xl bg-info/10 border border-info/20 text-2xs font-semibold text-info leading-relaxed">
              <strong>Path Amendment Guide:</strong> Acted steps are frozen and locked at the top of the path. You can add, delete, and reorder pending steps below them. Saving resets all modified pending steps to a queued state and recalculates indices.
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-err/10 border border-err/20 text-xs font-bold text-err flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-err" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Acted (Frozen) Steps */}
              {actedSteps.map((step, idx) => {
                const u = tenantUsers.find(tu => tu.id === step.approver_id);
                return (
                  <div key={`acted-${idx}`} className="p-3.5 border border-hair rounded-xl bg-panel/50 flex items-center justify-between gap-3 text-xs opacity-75">
                    <div className="min-w-0">
                      <div className="font-bold text-muted flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-muted/65" />
                        {u ? u.name : 'Unknown Approver'}
                        <span className="text-4xs font-extrabold bg-panel text-muted px-1 py-0.5 rounded border border-hair uppercase tracking-wider font-ibmmono">
                          Frozen
                        </span>
                      </div>
                      <div className="text-4xs font-bold text-muted mt-1 uppercase tracking-wider font-ibmmono">{step.type} Approver • {step.status}</div>
                    </div>
                  </div>
                );
              })}

              {/* Editable Steps Header */}
              {editPendingSteps.length > 0 && (
                <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-4xs font-bold text-muted uppercase tracking-wider mt-4 font-ibmmono">
                  <div className="col-span-6">Approver</div>
                  <div className="col-span-4">Role</div>
                  <div className="col-span-2 text-center">Actions</div>
                </div>
              )}

              {/* Editable Pending Steps */}
              {editPendingSteps.map((row, idx) => (
                <div key={`pending-${idx}`} className="p-3.5 border border-hair rounded-xl bg-white grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:border-accent/40 transition">
                  {/* User Selection */}
                  <div className="col-span-1 md:col-span-6">
                    <label className="block md:hidden text-4xs font-bold text-muted uppercase tracking-wider mb-1 font-ibmmono">
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
                    <label className="block md:hidden text-4xs font-bold text-muted uppercase tracking-wider mb-1 font-ibmmono">
                      Role
                    </label>
                    <select
                      value={row.type}
                      onChange={e => updateStep(idx, 'type', e.target.value)}
                      required
                      className="block w-full rounded-xl border border-hair py-2 px-3 text-ink text-xs bg-white focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-transparent transition font-semibold"
                    >
                      <option value="GENERAL">Direct Approver</option>
                      <option value="PARALLEL">Parallel Approver</option>
                      <option value="REFERENCE">FYI / Reference</option>
                    </select>
                  </div>

                  {/* Move Up, Down, Delete Actions */}
                  <div className="col-span-1 md:col-span-2 flex items-center justify-center gap-1.5 pt-1.5 md:pt-0">
                    <button
                      type="button"
                      onClick={() => moveStepUp(idx)}
                      disabled={idx === 0}
                      className="text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted p-1 rounded-lg transition hover:bg-panel"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStepDown(idx)}
                      disabled={idx === editPendingSteps.length - 1}
                      className="text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted p-1 rounded-lg transition hover:bg-panel"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStepRow(idx)}
                      disabled={actedSteps.length + editPendingSteps.length <= 1}
                      className="text-muted hover:text-err disabled:opacity-30 disabled:hover:text-muted p-1 rounded-lg transition hover:bg-panel"
                      title="Remove Step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Path Actions Form footer */}
            <div className="flex items-center justify-between border-t border-hair pt-4 mt-2">
              <button
                type="button"
                onClick={addStepRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-dashed border-accent/40 rounded-full text-[10px] font-bold text-accent hover:bg-accent/5 hover:border-accent transition font-ibmmono"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Step
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-hair text-ink rounded-full text-xs font-bold hover:bg-panel transition shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-ink rounded-full text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* DISPLAY MODE TIMELINE */
          <div className="space-y-6">
            {sortedStageIndices.map((stageIdx) => {
              const stageStepsList = stageGroups[stageIdx] || [];
              stageStepsList.sort((a: any, b: any) => a.order_index - b.order_index);

              return (
                <div key={stageIdx} className="border border-hair rounded-[14px] p-4 bg-panel/30">
                  <div className="flex items-center gap-2 mb-4 bg-accent/10 px-2.5 py-1 rounded-lg border border-accent/20 w-fit">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-accent font-ibmmono">
                      Stage {stageIdx + 1}
                    </span>
                  </div>
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {stageStepsList.map((step: any, stepIdx: number) => {
                        const isLast = stepIdx === stageStepsList.length - 1;
                        const isApproved = step.status === 'approved';
                        const isRejected = step.status === 'rejected';
                        const isPending = step.status === 'pending';
                        
                        const stepApproverUser = tenantUsers?.find((tu: any) => tu.id === step.approver_id);
                        const isApproverInactive = stepApproverUser?.status === 'inactive' || stepApproverUser?.status === 'INACTIVE';

                        return (
                          <li key={step.id}>
                            <div className="relative pb-8">
                              {!isLast && (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-hair" aria-hidden="true"></span>
                              )}
                              <div className="relative flex space-x-3 items-start">
                                {/* Icon sphere */}
                                <div>
                                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white transition
                                    ${isApproved ? 'bg-ok text-white' : 
                                      isRejected ? 'bg-err text-white' : 
                                      isPending ? (isApproverInactive ? 'bg-err text-white' : 'bg-warn text-white') : 'bg-panel text-muted border border-hair'}`}
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
                                      {step.acted_by_id && step.acted_by_id !== step.approver_id ? (
                                        <span>
                                          {step.status === 'approved' ? 'Approved' : step.status === 'rejected' ? 'Rejected' : 'Actioned'} by{' '}
                                          <span className="text-accent">{step.acted_by?.name || 'Delegate'}</span>{' '}
                                          (delegate for {userMap.get(step.approver_id) || 'Unknown Approver'})
                                        </span>
                                      ) : (
                                        userMap.get(step.approver_id) || 'Unknown Approver'
                                      )}
                                      {isApproverInactive && (
                                        <span className="ml-2 text-2xs text-err bg-err/10 px-1.5 py-0.5 rounded border border-err/20 font-bold uppercase font-ibmmono">
                                          Inactive
                                        </span>
                                      )}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                      <span className="inline-flex text-[10px] leading-4 font-bold rounded-md bg-panel text-muted uppercase tracking-wider px-1.5 font-ibmmono">
                                        {step.type}
                                      </span>
                                      {isPending && (
                                        <span className={`inline-flex text-[10px] leading-4 font-bold rounded-md uppercase tracking-wider px-1.5 font-ibmmono ${
                                          isApproverInactive ? 'bg-err/10 text-err' : 'bg-warn/10 text-warn'
                                        }`}>
                                          {isApproverInactive ? 'Blocked' : 'Pending'}
                                        </span>
                                      )}
                                    </div>
                                    {step.comment && (
                                      <div className="mt-2 text-xs italic text-muted bg-panel border border-hair p-2.5 rounded-[14px]">
                                        "{step.comment}"
                                      </div>
                                    )}

                                    {/* Blocked step reassignment interface */}
                                    {isPending && isApproverInactive && (isOwner || isAdmin) && (
                                      <form action={reassignAction} className="mt-4 p-3 bg-panel border border-hair rounded-[14px] space-y-2">
                                        <input type="hidden" name="stepId" value={step.id} />
                                        <label className="block text-[10px] font-bold text-muted uppercase tracking-wider font-ibmmono">
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
                                            className="inline-flex items-center justify-center px-4 py-2 bg-accent hover:bg-accent/90 text-ink text-xs font-bold rounded-full transition"
                                          >
                                            Reassign
                                          </button>
                                        </div>
                                      </form>
                                    )}
                                  </div>
                                  <div className="whitespace-nowrap text-right text-xs text-muted font-semibold font-ibmmono">
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
              <div className="border-t border-hair pt-6 mt-4">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-1.5 font-ibmmono">
                  <Users className="w-4 h-4 text-muted" />
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
                            isApproved ? 'bg-ok' :
                            isRejected ? 'bg-err' :
                            isPending ? (isApproverInactive ? 'bg-err' : 'bg-warn') :
                            'bg-muted'
                          }`} />
                          <span className="font-semibold text-ink">{userMap.get(step.approver_id) || 'Unknown User'}</span>
                          {isApproverInactive && (
                            <span className="text-[10px] text-err bg-err/10 px-1 rounded uppercase font-bold font-ibmmono">
                              Inactive
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted font-semibold font-ibmmono">
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

// Lock helper icon component
function Lock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}
