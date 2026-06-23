"use client";

import { useState } from 'react';
import { Plus, Trash2, Edit2, ArrowUp, ArrowDown, Lock, Unlock, Settings, AlertCircle, Check } from 'lucide-react';
import { saveWorkflowAction, deleteWorkflowAction } from './actions';
import { Workflow, WorkflowStep } from '@/lib/db/workflows';

interface Category {
  id: string;
  name: string;
}

interface ActiveUser {
  id: string;
  name: string;
  designation: string | null;
  employee_id: string | null;
  email: string;
}

interface WorkflowsConsoleProps {
  tenantSubdomain: string;
  categories: Category[];
  activeUsers: ActiveUser[];
  initialWorkflows: Workflow[];
}

export default function WorkflowsConsole({
  tenantSubdomain,
  categories,
  activeUsers,
  initialWorkflows
}: WorkflowsConsoleProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { userId: '', role: 'GENERAL' }
  ]);

  // For delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startNewWorkflow = () => {
    setEditingId(undefined);
    setName('');
    setCategoryId('');
    setIsLocked(false);
    setSteps([{ userId: '', role: 'GENERAL' }]);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditing(true);
  };

  const startEdit = (wf: Workflow) => {
    setEditingId(wf.id);
    setName(wf.name);
    setCategoryId(wf.category_id || '');
    setIsLocked(wf.is_locked);
    setSteps(wf.steps && wf.steps.length > 0 ? [...wf.steps] : [{ userId: '', role: 'GENERAL' }]);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditing(true);
  };

  const addStepRow = () => {
    setSteps([...steps, { userId: '', role: 'GENERAL' }]);
  };

  const removeStepRow = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const moveStepUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...steps];
    const temp = updated[idx];
    updated[idx] = updated[idx - 1];
    updated[idx - 1] = temp;
    setSteps(updated);
  };

  const moveStepDown = (idx: number) => {
    if (idx === steps.length - 1) return;
    const updated = [...steps];
    const temp = updated[idx];
    updated[idx] = updated[idx + 1];
    updated[idx + 1] = temp;
    setSteps(updated);
  };

  const updateStep = (idx: number, key: keyof WorkflowStep, value: any) => {
    const updated = [...steps];
    if (key === 'role') {
      updated[idx].role = value;
    } else {
      updated[idx].userId = value;
    }
    setSteps(updated);
  };

  const validateWorkflow = () => {
    if (!name.trim()) return "Workflow name is required.";
    
    const filledSteps = steps.filter(s => s.userId);
    if (filledSteps.length === 0) return "At least one step is required.";
    
    const hasDirect = filledSteps.some(s => s.role === 'GENERAL');
    if (!hasDirect) return "At least one Direct Approver is required.";

    const firstDirectIndex = filledSteps.findIndex(s => s.role === 'GENERAL');
    const firstParallelIndex = filledSteps.findIndex(s => s.role === 'PARALLEL');
    if (firstParallelIndex !== -1 && (firstDirectIndex === -1 || firstParallelIndex < firstDirectIndex)) {
      return "A Parallel Approver cannot be placed before the first Direct Approver.";
    }

    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validateWorkflow();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const cleanSteps = steps.filter(s => s.userId);
      const saved = await saveWorkflowAction(tenantSubdomain, {
        id: editingId,
        name: name.trim(),
        categoryId: categoryId || null,
        isLocked,
        steps: cleanSteps
      });

      // Update local state list
      if (editingId) {
        setWorkflows(prev => prev.map(w => w.id === editingId ? (saved as Workflow) : w));
        setSuccessMsg(`Workflow "${name}" updated successfully.`);
      } else {
        setWorkflows(prev => [saved as Workflow, ...prev]);
        setSuccessMsg(`Workflow "${name}" created successfully.`);
      }
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save workflow.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await deleteWorkflowAction(tenantSubdomain, id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
      setSuccessMsg("Workflow deleted successfully.");
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to delete workflow.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm font-semibold text-red-700 flex items-start gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-sm font-semibold text-green-700 flex items-start gap-2.5 shadow-sm">
          <Check className="w-5 h-5 shrink-0 text-green-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {!isEditing ? (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-ink font-display">Workflow Rules</h2>
            <button
              onClick={startNewWorkflow}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/15 hover:bg-accent/95 transition transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              New Workflow
            </button>
          </div>

          {/* Workflows List */}
          {workflows.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl bg-white shadow-sm">
              <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-ink">No workflows defined</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                Define reusable approval paths and associate them with request categories to simplify the approval process.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {workflows.map((wf) => {
                const categoryName = (wf as any).categories?.name || 'All / General';
                return (
                  <div
                    key={wf.id}
                    className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:border-gray-200 transition duration-150 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* Left: Metadata */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-bold text-ink font-display">{wf.name}</h3>
                          {wf.is_locked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              <Unlock className="w-3 h-3" /> Editable
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 font-semibold">
                          Linked Category: <span className="text-accent">{categoryName}</span>
                        </p>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(wf)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 hover:text-ink transition shadow-sm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        
                        {confirmDeleteId === wf.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                            <button
                              onClick={() => handleDelete(wf.id)}
                              className="px-3 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-red-700 transition"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-2 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(wf.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-red-600 bg-white hover:bg-red-50 hover:text-red-700 transition shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Flowchart Visualization */}
                    <div className="bg-gray-50/30 border border-gray-50 rounded-xl p-4 overflow-x-auto">
                      <div className="flex items-center gap-3 min-w-max py-1">
                        {wf.steps.map((step, idx) => {
                          const user = activeUsers.find(u => u.id === step.userId);
                          const roleLabel = 
                            step.role === 'GENERAL' ? 'Direct' :
                            step.role === 'PARALLEL' ? 'Parallel' : 'FYI';
                          const roleBg = 
                            step.role === 'GENERAL' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                            step.role === 'PARALLEL' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                            'bg-gray-50 border-gray-100 text-gray-500';

                          return (
                            <div key={idx} className="flex items-center gap-3">
                              {idx > 0 && (
                                <div className="text-gray-300 font-bold select-none">➔</div>
                              )}
                              <div className="flex flex-col border border-gray-100 rounded-xl bg-white px-3.5 py-2 shadow-2xs">
                                <span className="text-xs font-bold text-ink truncate max-w-[150px]">
                                  {user ? user.name : 'Unknown User'}
                                </span>
                                <span className="text-3xs text-gray-400 font-semibold truncate max-w-[150px] mt-0.5">
                                  {user?.designation || 'Staff'}
                                </span>
                                <span className={`mt-1.5 text-4xs font-extrabold uppercase tracking-wider px-1.5 py-0.5 border rounded-full text-center ${roleBg}`}>
                                  {roleLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Workflow Edit / Create Interface */
        <form onSubmit={handleSave} className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-ink font-display">
              {editingId ? 'Edit Workflow Template' : 'Create Approval Workflow'}
            </h2>
            <p className="text-xs text-gray-400 mt-1 font-semibold">
              Design a template workflow. Requests in the selected category will automatically inherit this approval path.
            </p>
          </div>

          {/* Name & Category Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-bold text-ink">
                Workflow Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. Budget Procurement Path"
                className="block w-full rounded-xl border border-gray-200 py-2.5 px-4 text-ink text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="category" className="block text-sm font-bold text-ink">
                Category Association
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="block w-full rounded-xl border border-gray-200 py-2.5 px-4 text-ink text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition font-semibold"
              >
                <option value="">No Category (Stand-alone template)</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Locked vs Editable Checkboxes */}
          <div className="space-y-3 pt-2">
            <label className="block text-sm font-bold text-ink">
              Lock Policy
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Editable */}
              <div
                onClick={() => setIsLocked(false)}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                  !isLocked 
                    ? 'border-accent/40 bg-accent/5 shadow-2xs' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`mt-0.5 rounded-full w-4 h-4 border flex items-center justify-center ${
                  !isLocked ? 'border-accent bg-accent text-white' : 'border-gray-300'
                }`}>
                  {!isLocked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <Unlock className="w-3.5 h-3.5 text-blue-600" />
                    Editable by Requesters
                  </div>
                  <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                    Pre-fills the approval path builder. Requesters are allowed to add, remove, or reorder steps as needed.
                  </p>
                </div>
              </div>

              {/* Option 2: Locked */}
              <div
                onClick={() => setIsLocked(true)}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                  isLocked 
                    ? 'border-accent/40 bg-accent/5 shadow-2xs' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`mt-0.5 rounded-full w-4 h-4 border flex items-center justify-center ${
                  isLocked ? 'border-accent bg-accent text-white' : 'border-gray-300'
                }`}>
                  {isLocked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Locked & Enforced
                  </div>
                  <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                    Forces the requester to submit using this exact workflow path. Reordering, adding, or deleting steps is locked.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Steps Builder */}
          <div className="space-y-4 border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-base font-bold text-ink font-display">Approval Steps Definition</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-semibold">
                  Specify the sequence of users and roles that compose this workflow template.
                </p>
              </div>
              <button
                type="button"
                onClick={addStepRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-dashed border-accent/40 rounded-xl text-xs font-bold text-accent hover:bg-accent/5 hover:border-accent transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Approver
              </button>
            </div>

            <div className="space-y-3">
              {/* Headers for larger viewports */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-xs font-bold text-ink uppercase tracking-wider">
                <div className="col-span-6">Approver</div>
                <div className="col-span-4">Role</div>
                <div className="col-span-2 text-center">Actions</div>
              </div>

              <div className="space-y-3">
                {steps.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-gray-100 bg-gray-50/10 grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:border-gray-200 transition"
                  >
                    {/* Approver Select Dropdown */}
                    <div className="col-span-1 md:col-span-6">
                      <label className="block md:hidden text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Approver
                      </label>
                      <select
                        value={row.userId}
                        onChange={e => updateStep(idx, 'userId', e.target.value)}
                        required
                        className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-ink text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition font-semibold"
                      >
                        <option value="">Choose a user...</option>
                        {activeUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.designation || 'Staff'} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Role Selector */}
                    <div className="col-span-1 md:col-span-4">
                      <label className="block md:hidden text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Role
                      </label>
                      <select
                        value={row.role}
                        onChange={e => updateStep(idx, 'role', e.target.value)}
                        required
                        className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-ink text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition font-semibold"
                      >
                        <option value="GENERAL">Direct Approver</option>
                        <option value="PARALLEL">Parallel Approver</option>
                        <option value="REFERENCE">FYI / Reference</option>
                      </select>
                    </div>

                    {/* Action buttons (arrows, trash) */}
                    <div className="col-span-1 md:col-span-2 flex items-center justify-center gap-1.5 pt-2 md:pt-0">
                      <button
                        type="button"
                        onClick={() => moveStepUp(idx)}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-accent disabled:opacity-30 disabled:hover:text-gray-400 p-1.5 rounded-lg transition hover:bg-gray-100"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStepDown(idx)}
                        disabled={idx === steps.length - 1}
                        className="text-gray-400 hover:text-accent disabled:opacity-30 disabled:hover:text-gray-400 p-1.5 rounded-lg transition hover:bg-gray-100"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStepRow(idx)}
                        disabled={steps.length <= 1}
                        className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 p-1.5 rounded-lg transition hover:bg-gray-100"
                        title="Remove Row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 bg-white hover:bg-gray-50 hover:text-ink focus:outline-none transition shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/10 hover:bg-accent/95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transform hover:-translate-y-0.5 active:translate-y-0 transition duration-150"
            >
              {isSaving ? 'Saving...' : 'Save Workflow'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
