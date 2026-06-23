"use client";

import { useState } from 'react';
import { Users, AlertTriangle, Plus, Trash2, ArrowUp, ArrowDown, Settings, ShieldCheck, Check, Edit2 } from 'lucide-react';
import { amendPathAction } from './amendActions';

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
  // We represent the editable section as a list of items:
  // { id?: string (exists if it was an existing pending step), approverId: string, type: 'GENERAL' | 'PARALLEL' | 'REFERENCE' }
  const [editPendingSteps, setEditPendingSteps] = useState<Array<{ id?: string; approverId: string; type: 'GENERAL' | 'PARALLEL' | 'REFERENCE' }>>([]);

  const isRequestActive = requestStatus === 'pending' || requestStatus === 'blocked';
  const canAmend = isRequestActive && (isAdmin || loggedInPublicUserId === activeDirectApproverId);

  const startEditing = () => {
    // Separate pending/waiting steps and load them into state
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
      // Let the page revalidate and update initialSteps prop
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
    <div className="space-y-8">
      {/* Routing Slip (Timeline Card) */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6 border-b border-gray-50 pb-3">
          <h3 className="text-lg font-display font-extrabold text-ink">Routing Slip</h3>
          {canAmend && !isEditing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-accent/30 rounded-xl text-xs font-bold text-accent hover:bg-accent/5 hover:border-accent transition shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Amend Path
            </button>
          )}
        </div>

        {isEditing ? (
          /* AMEND PATH EDITING UI */
          <form onSubmit={handleSave} className="space-y-5">
            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-2xs font-semibold text-indigo-700 leading-relaxed">
              <strong>Path Amendment Guide:</strong> Acted steps are frozen and locked at the top of the path. You can add, delete, and reorder pending steps below them. Saving resets all modified pending steps to a queued state and recalculates indices.
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Acted (Frozen) Steps */}
              {actedSteps.map((step, idx) => {
                const u = tenantUsers.find(tu => tu.id === step.approver_id);
                return (
                  <div key={`acted-${idx}`} className="p-3.5 border border-gray-100 rounded-xl bg-gray-50/45 flex items-center justify-between gap-3 text-xs opacity-75">
                    <div className="min-w-0">
                      <div className="font-bold text-gray-500 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-gray-400" />
                        {u ? u.name : 'Unknown Approver'}
                        <span className="text-4xs font-extrabold bg-gray-200 text-gray-500 px-1 py-0.5 rounded border border-gray-300 uppercase tracking-wider">
                          Frozen
                        </span>
                      </div>
                      <div className="text-4xs font-bold text-gray-400 mt-1 uppercase tracking-wider">{step.type} Approver • {step.status}</div>
                    </div>
                  </div>
                );
              })}

              {/* Editable Steps Header */}
              {editPendingSteps.length > 0 && (
                <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-4xs font-bold text-gray-400 uppercase tracking-wider mt-4">
                  <div className="col-span-6">Approver</div>
                  <div className="col-span-4">Role</div>
                  <div className="col-span-2 text-center">Actions</div>
                </div>
              )}

              {/* Editable Pending Steps */}
              {editPendingSteps.map((row, idx) => (
                <div key={`pending-${idx}`} className="p-3.5 border border-gray-100 rounded-xl bg-white grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:border-gray-200 transition">
                  {/* User Selection */}
                  <div className="col-span-1 md:col-span-6">
                    <label className="block md:hidden text-4xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Approver
                    </label>
                    <select
                      value={row.approverId}
                      onChange={e => updateStep(idx, 'approverId', e.target.value)}
                      required
                      className="block w-full rounded-xl border border-gray-200 py-2 px-3 text-ink text-xs bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition font-semibold"
                    >
                      <option value="">Select active staff...</option>
                      {activeTenantUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.designation || 'Staff'} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role Selector */}
                  <div className="col-span-1 md:col-span-4">
                    <label className="block md:hidden text-4xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Role
                    </label>
                    <select
                      value={row.type}
                      onChange={e => updateStep(idx, 'type', e.target.value)}
                      required
                      className="block w-full rounded-xl border border-gray-200 py-2 px-3 text-ink text-xs bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition font-semibold"
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
                      className="text-gray-400 hover:text-accent disabled:opacity-30 disabled:hover:text-gray-400 p-1 rounded-lg transition hover:bg-gray-100"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStepDown(idx)}
                      disabled={idx === editPendingSteps.length - 1}
                      className="text-gray-400 hover:text-accent disabled:opacity-30 disabled:hover:text-gray-400 p-1 rounded-lg transition hover:bg-gray-100"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStepRow(idx)}
                      disabled={actedSteps.length + editPendingSteps.length <= 1}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 p-1 rounded-lg transition hover:bg-gray-100"
                      title="Remove Step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Path Actions Form footer */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
              <button
                type="button"
                onClick={addStepRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-dashed border-accent/40 rounded-xl text-[10px] font-bold text-accent hover:bg-accent/5 hover:border-accent transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Step
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 transition shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
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
              const steps = stageGroups[stageIdx] || [];
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
                                      {userMap.get(step.approver_id) || 'Unknown Approver'}
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
                          <span className="font-semibold text-ink">{userMap.get(step.approver_id) || 'Unknown User'}</span>
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
