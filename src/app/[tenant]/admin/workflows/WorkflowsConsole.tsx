"use client";

import { useState } from 'react';
import { Plus, Trash2, Edit2, ArrowUp, ArrowDown, Lock, Unlock, Settings, AlertCircle, Check } from 'lucide-react';
import { saveWorkflowAction, deleteWorkflowAction } from './actions';
import { Workflow, WorkflowStep } from '@/lib/db/workflows';

interface Category {
  id: string;
  name: string;
}

interface PolicyOption {
  id: string;
  title: string;
  bound_type?: string | null;
  bound_value?: any;
  bound_field?: string | null;
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
  policies?: PolicyOption[];
}

export default function WorkflowsConsole({
  tenantSubdomain,
  categories,
  activeUsers,
  initialWorkflows,
  policies = [],
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
  const [governingPolicyId, setGoverningPolicyId] = useState<string>('');
  const [rulesJsonStr, setRulesJsonStr] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);
  const [baseStepType, setBaseStepType] = useState<'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS'>('TRANSACTIONAL');
  const [defaultSlaHours, setDefaultSlaHours] = useState<number | ''>('');
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { userId: '', role: 'GENERAL' }
  ]);

  // For delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startNewWorkflow = () => {
    setEditingId(undefined);
    setName('');
    setCategoryId('');
    setGoverningPolicyId('');
    setRulesJsonStr('');
    setIsLocked(false);
    setBaseStepType('TRANSACTIONAL');
    setDefaultSlaHours('');
    setSteps([{ userId: '', role: 'GENERAL' }]);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditing(true);
  };

  const startEdit = (wf: Workflow) => {
    setEditingId(wf.id);
    setName(wf.name);
    setCategoryId(wf.category_id || '');
    setGoverningPolicyId((wf as any).governing_policy_id || '');
    setRulesJsonStr(
      (wf as any).classification_rules_json && Object.keys((wf as any).classification_rules_json).length > 0
        ? JSON.stringify((wf as any).classification_rules_json, null, 2)
        : ''
    );
    setIsLocked(wf.is_locked);
    setBaseStepType((wf as any).base_step_type || 'TRANSACTIONAL');
    setDefaultSlaHours(
      (wf as any).default_sla_hours !== null && (wf as any).default_sla_hours !== undefined
        ? (wf as any).default_sla_hours
        : ''
    );
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
      let parsedRules: Record<string, any> = {};
      if (rulesJsonStr.trim()) {
        try {
          parsedRules = JSON.parse(rulesJsonStr);
        } catch (e: any) {
          setErrorMsg("Invalid JSON syntax in Classification / Exception Rules: " + e.message);
          setIsSaving(false);
          return;
        }
      }

      const cleanSteps = steps.filter(s => s.userId);
      const saved = await saveWorkflowAction(tenantSubdomain, {
        id: editingId,
        name: name.trim(),
        categoryId: categoryId || null,
        isLocked,
        steps: cleanSteps,
        baseStepType,
        governingPolicyId: governingPolicyId || null,
        defaultSlaHours: typeof defaultSlaHours === 'number' && defaultSlaHours > 0 ? defaultSlaHours : null,
        classificationRulesJson: parsedRules,
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
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-start gap-2 shadow-xs">
          <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {!isEditing ? (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-[#17324D]">Workflow Rules</h2>
              <p className="text-xs text-[#526679] font-medium mt-0.5">
                Manage governance routing slips, approval hierarchies, and policy bounds.
              </p>
            </div>
            <button
              onClick={startNewWorkflow}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#17324D] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#224564] transition"
            >
              <Plus className="w-3.5 h-3.5" />
              New Workflow
            </button>
          </div>

          {/* Workflows List */}
          {workflows.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-[#DCE5EA] rounded-xl bg-white shadow-xs">
              <Settings className="w-10 h-10 text-[#637587] mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#182B3D]">No workflows defined</h3>
              <p className="text-xs text-[#526679] mt-1 max-w-sm mx-auto">
                Define reusable approval paths and associate them with request categories to simplify the approval process.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {workflows.map((wf) => {
                const categoryName = (wf as any).categories?.name || 'All / General';
                return (
                  <div
                    key={wf.id}
                    className="bg-white border border-[#DCE5EA] rounded-xl p-5 shadow-xs hover:border-[#0B7780]/40 transition space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* Left: Metadata */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[#182B3D]">{wf.name}</h3>
                          {wf.is_locked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Lock className="w-3 h-3 text-amber-700" /> Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#ECF6F5] text-[#17324D] border border-[#DCE5EA]">
                              <Unlock className="w-3 h-3 text-[#0B7780]" /> Editable
                            </span>
                          )}
                          {(wf as any).base_step_type && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-[#315878] border border-blue-200">
                              {(wf as any).base_step_type}
                            </span>
                          )}
                          {(wf as any).default_sla_hours && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {(wf as any).default_sla_hours}h SLA
                            </span>
                          )}
                          {(wf as any).governing_policy_id && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#ECF6F5] text-[#096A72] border border-[#DCE5EA]">
                              Policy Linked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#526679] font-medium">
                          Linked Category: <span className="text-[#17324D] font-semibold">{categoryName}</span>
                        </p>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(wf)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#DCE5EA] rounded-lg text-xs font-semibold text-[#526679] bg-white hover:bg-[#F6F8F9] hover:text-[#17324D] transition shadow-xs"
                        >
                          <Edit2 className="w-3 h-3 text-[#0B7780]" />
                          Edit
                        </button>

                        {confirmDeleteId === wf.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                            <button
                              onClick={() => handleDelete(wf.id)}
                              className="px-2.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-rose-700 transition"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1.5 border border-[#DCE5EA] text-[#526679] rounded-lg text-xs font-semibold hover:bg-[#F6F8F9] transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(wf.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#DCE5EA] rounded-lg text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 hover:text-rose-700 transition shadow-xs"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Flowchart Visualization */}
                    <div className="bg-[#F6F8F9] border border-[#DCE5EA] rounded-lg p-3.5 overflow-x-auto">
                      <div className="flex items-center gap-2.5 min-w-max py-0.5">
                        {wf.steps.map((step, idx) => {
                          const user = activeUsers.find(u => u.id === step.userId);
                          const roleLabel =
                            step.role === 'GENERAL' ? 'Direct' :
                            step.role === 'PARALLEL' ? 'Parallel' : 'FYI';
                          const roleBg =
                            step.role === 'GENERAL' ? 'bg-[#ECF6F5] border-[#DCE5EA] text-[#17324D]' :
                            step.role === 'PARALLEL' ? 'bg-purple-50 border-purple-200 text-purple-800' :
                            'bg-gray-50 border-gray-200 text-[#526679]';

                          return (
                            <div key={idx} className="flex items-center gap-2.5">
                              {idx > 0 && (
                                <div className="text-[#637587] text-xs font-bold select-none">➔</div>
                              )}
                              <div className="flex flex-col border border-[#DCE5EA] rounded-lg bg-white px-3 py-1.5 shadow-2xs">
                                <span className="text-xs font-bold text-[#182B3D] truncate max-w-[150px]">
                                  {user ? user.name : 'Unknown User'}
                                </span>
                                <span className="text-[11px] text-[#637587] truncate max-w-[150px]">
                                  {user?.designation || 'Staff'}
                                </span>
                                <span className={`mt-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border rounded text-center ${roleBg}`}>
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
        <form onSubmit={handleSave} className="bg-white border border-[#DCE5EA] rounded-xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-[#DCE5EA] pb-4">
            <h2 className="text-xl font-bold text-[#17324D]">
              {editingId ? 'Edit Workflow Template' : 'Create Approval Workflow'}
            </h2>
            <p className="text-xs text-[#526679] mt-1 font-medium">
              Design a template workflow. Requests in the selected category will automatically inherit this approval path.
            </p>
          </div>

          {/* Name & Category Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-[#182B3D]">
                Workflow Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. Budget Procurement Path"
                className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-[#182B3D] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition font-medium"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="category" className="block text-xs font-bold uppercase tracking-wider text-[#182B3D]">
                Category Association
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-[#182B3D] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition font-medium"
              >
                <option value="">No Category (Stand-alone template)</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="baseStepType" className="block text-xs font-bold uppercase tracking-wider text-[#182B3D]">
                Base STEP Classification
              </label>
              <select
                id="baseStepType"
                value={baseStepType}
                onChange={e => setBaseStepType(e.target.value as any)}
                className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-[#182B3D] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition font-medium"
              >
                <option value="STRUCTURAL">Structural (Policy & Org Governance)</option>
                <option value="TRANSACTIONAL">Transactional (Routine Operational Flow)</option>
                <option value="EXCEPTION">Exception (High Risk & Deviation Path)</option>
                <option value="PROCESS">Process (System & Batch Automation)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="defaultSlaHours" className="block text-xs font-bold uppercase tracking-wider text-[#182B3D]">
                Default SLA Target (Hours)
              </label>
              <input
                type="number"
                id="defaultSlaHours"
                min="1"
                step="1"
                value={defaultSlaHours}
                onChange={e => setDefaultSlaHours(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                placeholder="e.g. 24 (Default target turnaround)"
                className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-[#182B3D] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition font-medium"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="governingPolicy" className="block text-xs font-bold uppercase tracking-wider text-[#182B3D]">
                Governing Policy Association
              </label>
              <select
                id="governingPolicy"
                value={governingPolicyId}
                onChange={e => setGoverningPolicyId(e.target.value)}
                className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-[#182B3D] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition font-medium"
              >
                <option value="">No Governing Policy (General Authority)</option>
                {policies.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.bound_type ? `(${p.bound_type}: ${p.bound_value} on ${p.bound_field || 'amount'})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor="rulesJson" className="block text-xs font-bold uppercase tracking-wider text-[#182B3D] flex items-center justify-between">
                <span>Classification & Exception Rules (JSON Configuration)</span>
                <span className="text-[11px] text-[#637587] font-normal normal-case">Optional automated routing rules</span>
              </label>
              <textarea
                id="rulesJson"
                rows={3}
                value={rulesJsonStr}
                onChange={e => setRulesJsonStr(e.target.value)}
                placeholder='e.g. { "rules": [{ "field": "amount", "operator": "GT", "threshold": 50000, "escalate_to_role": "FINANCE" }] }'
                className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-[#182B3D] text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition"
              />
            </div>
          </div>

          {/* Locked vs Editable Checkboxes */}
          <div className="space-y-2.5 pt-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#182B3D]">
              Governance Lock Policy
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Option 1: Editable */}
              <div
                onClick={() => setIsLocked(false)}
                className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
                  !isLocked
                    ? 'border-[#0B7780] bg-[#ECF6F5] shadow-xs'
                    : 'border-[#DCE5EA] bg-white hover:border-[#637587]'
                }`}
              >
                <div className={`mt-0.5 rounded-full w-4 h-4 border flex items-center justify-center ${
                  !isLocked ? 'border-[#0B7780] bg-[#0B7780] text-white' : 'border-[#DCE5EA]'
                }`}>
                  {!isLocked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[#182B3D] flex items-center gap-1.5">
                    <Unlock className="w-3.5 h-3.5 text-[#0B7780]" />
                    Editable by Requesters
                  </div>
                  <p className="text-[11px] text-[#526679] font-medium leading-relaxed">
                    Pre-fills the approval path builder. Requesters are allowed to add, remove, or reorder steps as needed.
                  </p>
                </div>
              </div>

              {/* Option 2: Locked */}
              <div
                onClick={() => setIsLocked(true)}
                className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
                  isLocked
                    ? 'border-[#0B7780] bg-[#ECF6F5] shadow-xs'
                    : 'border-[#DCE5EA] bg-white hover:border-[#637587]'
                }`}
              >
                <div className={`mt-0.5 rounded-full w-4 h-4 border flex items-center justify-center ${
                  isLocked ? 'border-[#0B7780] bg-[#0B7780] text-white' : 'border-[#DCE5EA]'
                }`}>
                  {isLocked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[#182B3D] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Locked & Enforced
                  </div>
                  <p className="text-[11px] text-[#526679] font-medium leading-relaxed">
                    Forces the requester to submit using this exact workflow path. Reordering, adding, or deleting steps is locked.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Steps Builder */}
          <div className="space-y-3.5 border-t border-[#DCE5EA] pt-5">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-sm font-bold text-[#17324D]">Approval Steps Definition</h3>
                <p className="text-xs text-[#526679] mt-0.5 font-medium">
                  Specify the sequence of users and roles that compose this workflow template.
                </p>
              </div>
              <button
                type="button"
                onClick={addStepRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-dashed border-[#17324D]/40 rounded-lg text-xs font-bold text-[#17324D] hover:bg-[#ECF6F5] hover:border-[#0B7780] transition"
              >
                <Plus className="w-3 h-3" />
                Add Approver
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Headers for larger viewports */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-3 text-[11px] font-bold text-[#526679] uppercase tracking-wider">
                <div className="col-span-6">Approver</div>
                <div className="col-span-4">Role</div>
                <div className="col-span-2 text-center">Actions</div>
              </div>

              <div className="space-y-2.5">
                {steps.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-[#DCE5EA] bg-[#F6F8F9]/60 grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:bg-white hover:border-[#0B7780]/40 transition"
                  >
                    {/* Approver Select Dropdown */}
                    <div className="col-span-1 md:col-span-6">
                      <label className="block md:hidden text-[11px] font-bold text-[#526679] uppercase tracking-wider mb-1">
                        Approver
                      </label>
                      <select
                        value={row.userId}
                        onChange={e => updateStep(idx, 'userId', e.target.value)}
                        required
                        className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-[#182B3D] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition font-medium"
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
                      <label className="block md:hidden text-[11px] font-bold text-[#526679] uppercase tracking-wider mb-1">
                        Role
                      </label>
                      <select
                        value={row.role}
                        onChange={e => updateStep(idx, 'role', e.target.value)}
                        required
                        className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-[#182B3D] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition font-medium"
                      >
                        <option value="GENERAL">Direct Approver</option>
                        <option value="PARALLEL">Parallel Approver</option>
                        <option value="REFERENCE">FYI / Reference</option>
                      </select>
                    </div>

                    {/* Action buttons (arrows, trash) */}
                    <div className="col-span-1 md:col-span-2 flex items-center justify-center gap-1 pt-2 md:pt-0">
                      <button
                        type="button"
                        onClick={() => moveStepUp(idx)}
                        disabled={idx === 0}
                        className="text-[#637587] hover:text-[#17324D] disabled:opacity-30 disabled:hover:text-[#637587] p-1.5 rounded-md transition hover:bg-[#EEF2F4]"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStepDown(idx)}
                        disabled={idx === steps.length - 1}
                        className="text-[#637587] hover:text-[#17324D] disabled:opacity-30 disabled:hover:text-[#637587] p-1.5 rounded-md transition hover:bg-[#EEF2F4]"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStepRow(idx)}
                        disabled={steps.length <= 1}
                        className="text-[#637587] hover:text-rose-600 disabled:opacity-30 disabled:hover:text-[#637587] p-1.5 rounded-md transition hover:bg-rose-50"
                        title="Remove Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[#DCE5EA] pt-5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center justify-center px-4 py-2 border border-[#DCE5EA] rounded-lg text-xs font-semibold text-[#526679] bg-white hover:bg-[#F6F8F9] hover:text-[#17324D] focus:outline-none transition shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-lg bg-[#17324D] hover:bg-[#224564] px-5 py-2 text-xs font-bold text-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0B7780] disabled:opacity-50 transition"
            >
              {isSaving ? 'Saving...' : 'Save Workflow'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
