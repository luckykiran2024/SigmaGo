"use client";

import { useState, useEffect, useRef } from 'react';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { submitNewRequest } from './actions';
import PersonPicker from '@/components/ui/PersonPicker';
import Link from 'next/link';
import { Plus, Trash2, Users, ArrowUp, ArrowDown, Search, GitBranch, Lock } from 'lucide-react';
import GroupedCategoryPicker, { CategoryOption } from '@/components/ui/GroupedCategoryPicker';
import MisclassificationBanner from '@/components/ui/MisclassificationBanner';
import CaseCReferencePicker, { ReferenceItem } from '@/components/ui/CaseCReferencePicker';

interface ActiveUser {
  id: string;
  name: string;
  designation: string | null;
  career_level: string | null;
  employee_id: string | null;
}

interface CustomFieldDef {
  id: string;
  label: string;
  key: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'PERSON';
  options: string[] | null;
  required: boolean;
  category_id: string | null;
}

interface RequestFormProps {
  renewFromRequest?: any;
  tenant: string;
  tenantId: string;
  categories: any[];
  activeUsers: ActiveUser[];
  workflows?: any[];
  loggedInUserId: string;
  customFields?: CustomFieldDef[];
  allActivePolicies?: any[];
}

interface ApprovalPathItem {
  userId: string;
  role: 'GENERAL' | 'PARALLEL' | 'REFERENCE';
}

export default function RequestForm({ tenant, tenantId, categories, activeUsers, workflows = [], loggedInUserId, customFields = [], renewFromRequest, allActivePolicies = [] }: RequestFormProps) {
  const [content, setContent] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Flat list approval path state
  const [approvalPath, setApprovalPath] = useState<ApprovalPathItem[]>([
    { userId: '', role: 'GENERAL' }
  ]);

  const [isPathLocked, setIsPathLocked] = useState(false);

  // Beneficiary state (optional - the person the request is ABOUT)
  const [beneficiaryId, setBeneficiaryId] = useState<string>('');

  // Custom field values
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [validUntil, setValidUntil] = useState<string>('');
  const [reviewDate, setReviewDate] = useState<string>('');

  const updateCustomFieldValue = (key: string, value: any) => {
    setCustomFieldValues(prev => ({ ...prev, [key]: value }));
  };

  // Get custom fields for selected category
  const selectedCategoryId = typeof document !== 'undefined'
    ? (document.querySelector('select[name="category"]') as HTMLSelectElement)?.value
    : '';
  const visibleCustomFields = customFields.filter(f =>
    !f.category_id || f.category_id === selectedCategoryId
  );

  // Category selection, reference picking, and misclassification state
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption | null>(categories.length > 0 ? categories[0] : null);
  const [selectedReference, setSelectedReference] = useState<ReferenceItem | null>(null);
  const [referenceRelationship, setReferenceRelationship] = useState<string>('BASED_ON');
  const [isReferenceSkipped, setIsReferenceSkipped] = useState<boolean>(false);
  const [isOverrideKept, setIsOverrideKept] = useState<boolean>(false);

  // Primary Workflow selection state
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const selectedWorkflow = workflows.find((w: any) => w.id === selectedWorkflowId) || null;

  const handleSelectWorkflow = (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    if (!workflowId) {
      setIsPathLocked(false);
      return;
    }

    const wf = workflows.find((w: any) => w.id === workflowId);
    if (!wf) return;

    // 1. Auto-select category if workflow specifies one
    if (wf.category_id) {
      const cat = categories.find((c: any) => c.id === wf.category_id);
      if (cat) {
        setSelectedCategory(cat);
        setIsOverrideKept(false);
      }
    }

    // 2. Pre-fill approval path
    const rawSteps = wf.steps && Array.isArray(wf.steps) ? wf.steps : [];
    if (rawSteps.length > 0) {
      const mappedSteps = rawSteps.map((s: any) => ({
        userId: s.userId || s.approver_id || s.approverId || '',
        role: s.role || s.type || 'GENERAL',
      }));
      setApprovalPath(mappedSteps);
    } else {
      setApprovalPath([{ userId: '', role: 'GENERAL' }]);
    }

    // 3. Enforce path locking
    setIsPathLocked(!!wf.is_locked);
  };

  const handleSelectCategory = (cat: CategoryOption | null) => {
    setSelectedCategory(cat);
    setIsOverrideKept(false);

    if (!cat) {
      setSelectedWorkflowId('');
      setApprovalPath([{ userId: '', role: 'GENERAL' }]);
      setIsPathLocked(false);
      return;
    }

    const linkedWorkflow = workflows.find(wf => wf.category_id === cat.id);
    if (linkedWorkflow) {
      setSelectedWorkflowId(linkedWorkflow.id);
      const rawSteps = linkedWorkflow.steps && Array.isArray(linkedWorkflow.steps) ? linkedWorkflow.steps : [];
      if (rawSteps.length > 0) {
        const mappedSteps = rawSteps.map((s: any) => ({
          userId: s.userId || s.approver_id || s.approverId || '',
          role: s.role || s.type || 'GENERAL'
        }));
        setApprovalPath(mappedSteps);
      } else {
        setApprovalPath([{ userId: '', role: 'GENERAL' }]);
      }
      setIsPathLocked(!!linkedWorkflow.is_locked);
    } else {
      setSelectedWorkflowId('');
      setApprovalPath([{ userId: '', role: 'GENERAL' }]);
      setIsPathLocked(false);
    }
  };

  // Misclassification calculation
  const governingPol = (selectedCategory as any)?.governing_policy;
  const boundType = governingPol?.bound_type || 'NONE';
  const boundValue = governingPol?.bound_value ? Number(governingPol.bound_value) : null;

  let enteredNumericValue: number | null = null;
  if (boundValue !== null && boundType !== 'NONE') {
    for (const val of Object.values(customFieldValues)) {
      const num = Number(val);
      if (!isNaN(num) && num > 0) {
        enteredNumericValue = num;
        break;
      }
    }
  }

  const isBreached = boundValue !== null && enteredNumericValue !== null && enteredNumericValue > boundValue;
  const exceptionCategory = categories.find((c: any) => c.step_type === 'EXCEPTION' && c.governing_policy_id === selectedCategory?.governing_policy_id);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const addPathRow = () => {
    setApprovalPath([...approvalPath, { userId: '', role: 'GENERAL' }]);
  };

  const removePathRow = (index: number) => {
    setApprovalPath(approvalPath.filter((_, idx) => idx !== index));
  };

  const moveRowUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...approvalPath];
    const temp = updated[idx];
    updated[idx] = updated[idx - 1];
    updated[idx - 1] = temp;
    setApprovalPath(updated);
  };

  const moveRowDown = (idx: number) => {
    if (idx === approvalPath.length - 1) return;
    const updated = [...approvalPath];
    const temp = updated[idx];
    updated[idx] = updated[idx + 1];
    updated[idx + 1] = temp;
    setApprovalPath(updated);
  };

  const updatePathRow = (index: number, key: keyof ApprovalPathItem, value: any) => {
    const updated = [...approvalPath];
    if (key === 'role') {
      updated[index].role = value;
    } else {
      updated[index].userId = value;
    }
    setApprovalPath(updated);
  };

  const validatePath = (path: ApprovalPathItem[]) => {
    const filledRows = path.filter(item => item.userId);
    if (filledRows.length === 0) {
      return "At least one approval step is required.";
    }

    const hasDirect = filledRows.some(item => item.role === 'GENERAL');
    if (!hasDirect) {
      return "At least one Direct Approver is required.";
    }

    const firstDirectIndex = filledRows.findIndex(item => item.role === 'GENERAL');
    const firstParallelIndex = filledRows.findIndex(item => item.role === 'PARALLEL');
    if (firstParallelIndex !== -1 && (firstDirectIndex === -1 || firstParallelIndex < firstDirectIndex)) {
      return "A Parallel Approver cannot be placed before the first Direct Approver.";
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const invalidFiles = filesArray.filter(f => f.size > 50 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        setErrorMsg("Some selected files exceed the 50MB size limit and were skipped.");
      }
      const validFiles = filesArray.filter(f => f.size <= 50 * 1024 * 1024);
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const validationError = validatePath(approvalPath);
    if (validationError) {
      setErrorMsg(validationError);
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData(e.currentTarget);
      if (selectedWorkflowId) {
        formData.set('workflow_id', selectedWorkflowId);
      }
      // Filter out unfilled rows before submission
      const cleanPath = approvalPath.filter(x => x.userId);

      // Append manually managed selected files
      formData.delete('attachments');
      const referenceData = selectedReference && !isReferenceSkipped ? {
        targetId: selectedReference.step_type !== 'PROCESS' ? selectedReference.id : null,
        policyId: selectedReference.step_type === 'PROCESS' ? selectedReference.id : null,
        relationship: referenceRelationship || 'BASED_ON'
      } : null;

      const overrideData = isOverrideKept ? {
        isOverride: true,
        reason: `Overrode policy bound for ${selectedCategory?.name}`
      } : null;

      const res = await submitNewRequest(
        formData, content, tenant, cleanPath, beneficiaryId || null, customFieldValues,
        { validUntil, reviewDate, renewedFromId: renewFromRequest?.id },
        referenceData,
        overrideData
      );

      if (res && res.requestId) {
        window.location.href = `/${tenant}/requests/${res.requestId}`;
      } else {
        window.location.href = `/${tenant}/approvals`;
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to submit request.");
      setIsSubmitting(false);
    }
  };

  const selectedUserIds = approvalPath.map(x => x.userId).filter(Boolean);

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto py-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-sans font-extrabold tracking-tight text-ink">
            Create Approval Request
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            Define a custom approval path with Direct approvals, Parallel reviews, and FYI Reference notifications.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm font-semibold text-red-700">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white shadow-sm border border-gray-100 rounded-lg p-6 sm:p-8">
        
        {/* STEP 0: WORKFLOW SELECTOR */}
        {workflows.length > 0 && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-ink flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-brand" />
                Governance Workflow
              </label>
              {selectedWorkflow && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  selectedWorkflow.is_locked
                    ? 'bg-amber-100 text-amber-900 border border-amber-300/50'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300/50'
                }`}>
                  {selectedWorkflow.is_locked ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Locked Governance Route
                    </>
                  ) : (
                    'Configurable Workflow'
                  )}
                </span>
              )}
            </div>

            <select
              value={selectedWorkflowId}
              onChange={(e) => handleSelectWorkflow(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 py-3 px-4 text-ink bg-white font-medium text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
            >
              <option value="">Custom Workflow (User-defined path)</option>
              {workflows.map((wf: any) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name} {wf.is_locked ? '[🔒 Locked Governance]' : '[Editable]'} {wf.base_step_type ? `· ${wf.base_step_type}` : ''}
                </option>
              ))}
            </select>

            {selectedWorkflow && (
              <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex flex-wrap gap-4 text-xs font-semibold">
                {selectedWorkflow.description && (
                  <div className="text-gray-600 w-full font-normal">{selectedWorkflow.description}</div>
                )}
                {selectedWorkflow.default_sla_hours && (
                  <div className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    ⏱ Default SLA: {selectedWorkflow.default_sla_hours} hours
                  </div>
                )}
                {selectedWorkflow.base_step_type && (
                  <div className="text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                    🏷 Base STEP Classification: {selectedWorkflow.base_step_type}
                  </div>
                )}
                {selectedWorkflow.is_locked && (
                  <div className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    Strict Route: Stages, approvers, and ordering are immutable
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 1: CATEGORY SELECTION */}
        <div>
          <GroupedCategoryPicker
            categories={categories}
            selectedCategoryId={selectedCategory?.id || ''}
            onSelectCategory={handleSelectCategory}
          />
        </div>

        {/* STEP 2: MISCLASSIFICATION DETECTION BANNER */}
        {selectedCategory && isBreached && enteredNumericValue !== null && governingPol && (
          <MisclassificationBanner
            currentCategory={selectedCategory}
            policyBound={{
              policyTitle: governingPol.title || 'Governing Policy',
              boundType: boundType,
              boundValue: boundValue || 0,
              boundField: governingPol.bound_field
            }}
            enteredValue={enteredNumericValue}
            exceptionCategory={exceptionCategory}
            onSwitchCategory={(newCat) => handleSelectCategory(newCat)}
            onKeepChoice={() => setIsOverrideKept(true)}
            isOverrideKept={isOverrideKept}
          />
        )}

        {/* STEP 3: CASE C REFERENCE PICKER (ALWAYS SHOWN DIRECTLY BELOW CATEGORY) */}
        {selectedCategory && (
          <CaseCReferencePicker
            tenantId={tenantId}
            categoryId={selectedCategory.id}
            categoryStepType={(selectedCategory.step_type as any) || 'TRANSACTIONAL'}
            governingPolicy={
              governingPol
                ? {
                    id: governingPol.id,
                    title: governingPol.title,
                    statement: governingPol.statement,
                    step_type: 'PROCESS',
                    exception_count_ytd: 0,
                  }
                : null
            }
            allActivePolicies={allActivePolicies}
            onSelectReference={(ref, rel, skipped) => {
              setSelectedReference(ref);
              setReferenceRelationship(rel);
              setIsReferenceSkipped(skipped);
            }}
            userId={loggedInUserId}
          />
        )}

        {/* SUBJECT */}
        <div>
          <label htmlFor="subject" className="block text-sm font-bold text-ink">
            Subject
          </label>
          <div className="mt-2">
            <input
              type="text"
              name="subject"
              id="subject"
              required
              className="block w-full rounded-xl border border-gray-200 py-3 px-4 text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-sm font-medium"
              placeholder="e.g. Q3 Marketing Budget Increase"
            />
          </div>
        </div>

        {/* Flat Approval Path Builder */}
        <div className="space-y-6">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-ink font-sans flex items-center gap-2">
                <Users className="w-5 h-5 text-brand" />
                Approval Path Definition
              </h3>
              <p className="text-xs text-gray-400 font-medium mt-1">
                Sequence is derived from row position. Direct gates must approve first, followed by Parallels in the same order level. Reference paths are FYI only.
              </p>
            </div>
            {!isPathLocked && (
              <button
                type="button"
                onClick={addPathRow}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-dashed border-brand/40 rounded-xl text-xs font-bold text-brand hover:bg-brand/5 hover:border-brand transition"
              >
                <Plus className="w-4 h-4" />
                Add Approver
              </button>
            )}
          </div>

          {isPathLocked && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs font-semibold flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>This approval route is strictly locked by organizational governance policy. Approvers, stages, and order are enforced server-side.</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Headers for larger viewports */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-xs font-bold text-ink uppercase tracking-wider">
              <div className={isPathLocked ? "col-span-8" : "col-span-6"}>Person</div>
              <div className="col-span-4">Role</div>
              {!isPathLocked && <div className="col-span-2 text-center">Actions</div>}
            </div>

            <div className="space-y-3">
              {approvalPath.map((row, idx) => (
                <div 
                  key={idx} 
                  className="p-4 rounded-xl border border-gray-100 bg-gray-50/10 grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:border-gray-200 transition duration-150"
                >
                  {/* Person Picker */}
                  <div className={isPathLocked ? "col-span-1 md:col-span-8" : "col-span-1 md:col-span-6"}>
                    <label className="block md:hidden text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Person
                    </label>
                    <PersonPicker
                      tenant={tenant}
                      exclude={[loggedInUserId, ...selectedUserIds.filter(id => id !== row.userId)]}
                      activeOnly={true}
                      value={row.userId}
                      disabled={isPathLocked}
                      onSelect={(val) => updatePathRow(idx, 'userId', val || '')}
                      placeholder="Search name, email, or ID..."
                    />
                  </div>

                  {/* Role Selector */}
                  <div className="col-span-1 md:col-span-4">
                    <label className="block md:hidden text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Role
                    </label>
                    <select
                      value={row.role}
                      onChange={(e) => updatePathRow(idx, 'role', e.target.value)}
                      required
                      disabled={isPathLocked}
                      className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-ink text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition font-semibold disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="GENERAL">Direct Approver</option>
                      <option value="PARALLEL">Parallel Approver</option>
                      <option value="REFERENCE">FYI / Reference</option>
                    </select>
                  </div>

                  {/* Remove & Reorder Actions */}
                  {!isPathLocked && (
                    <div className="col-span-1 md:col-span-2 flex items-center justify-center gap-1.5 pt-2 md:pt-0">
                      <button
                        type="button"
                        onClick={() => moveRowUp(idx)}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-brand disabled:opacity-30 disabled:hover:text-gray-400 p-1.5 rounded-lg transition hover:bg-gray-100"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRowDown(idx)}
                        disabled={idx === approvalPath.length - 1}
                        className="text-gray-400 hover:text-brand disabled:opacity-30 disabled:hover:text-gray-400 p-1.5 rounded-lg transition hover:bg-gray-100"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePathRow(idx)}
                        disabled={approvalPath.length <= 1}
                        className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 p-1.5 rounded-lg transition hover:bg-gray-100"
                        title="Remove Row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Beneficiary (optional) */}
        <div className="border-t border-gray-100 pt-6">
          <label className="block text-sm font-bold text-ink mb-1">
            This request is for <span className="text-gray-400 font-medium">(optional)</span>
          </label>
          <p className="text-xs text-gray-400 font-medium mb-2">
            If this request is about a specific person (e.g. employee leave, equipment for someone), select them here.
          </p>
          <PersonPicker
            tenant={tenant}
            value={beneficiaryId || null}
            onSelect={(id) => setBeneficiaryId(id || '')}
            exclude={[loggedInUserId]}
            placeholder="Search for a person..."
          />
          {beneficiaryId && (
            <button
              type="button"
              onClick={() => setBeneficiaryId('')}
              className="text-xs text-gray-400 hover:text-red-500 mt-1.5 font-medium transition"
            >
              ✕ Remove beneficiary
            </button>
          )}
        </div>

        
        {/* Validity & Expiry / Review Date */}
        {(() => {
          const selectedCatId = typeof document !== 'undefined'
            ? (document.querySelector('select[name="category"]') as HTMLSelectElement)?.value
            : '';
          const selectedCat = categories.find(c => (c as any).id === selectedCatId) as any;
          if (!selectedCat || selectedCat.validity_mode === 'NONE') return null;

          const isRequired = selectedCat.validity_mode === 'REQUIRED';
          const isReview = !!selectedCat.review_only;

          return (
            <div className="border-t border-gray-100 pt-6 space-y-3">
              <label className="block text-sm font-bold text-ink">
                {isReview ? 'Review Date' : 'Validity Duration'}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
              <p className="text-xs text-gray-400 font-medium">
                {isReview
                  ? 'Set a review reminder date. This does not automatically expire the approval.'
                  : isRequired
                  ? 'This category requires a valid until end date for all approvals.'
                  : 'Optionally set an expiration date for this approval.'
                }
                {selectedCat.max_validity_days && ` Maximum duration: ${selectedCat.max_validity_days} days.`}
              </p>

              <div className="max-w-xs">
                <input
                  type="date"
                  value={isReview ? reviewDate : validUntil}
                  onChange={(e) => isReview ? setReviewDate(e.target.value) : setValidUntil(e.target.value)}
                  required={isRequired}
                  className="block w-full rounded-xl border border-gray-200 py-3 px-4 text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-sm font-medium"
                />
              </div>
            </div>
          );
        })()}

        {/* Custom Fields */}
        {visibleCustomFields.length > 0 && (
          <div className="border-t border-gray-100 pt-6 space-y-4">
            <h3 className="text-sm font-bold text-ink">Additional Information</h3>
            {visibleCustomFields.map(field => (
              <div key={field.id}>
                <label className="block text-xs font-bold text-ink mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {field.type === 'TEXT' && (
                  <input
                    type="text"
                    value={customFieldValues[field.key] || ''}
                    onChange={e => updateCustomFieldValue(field.key, e.target.value)}
                    required={field.required}
                    className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                )}
                {field.type === 'NUMBER' && (
                  <input
                    type="number"
                    value={customFieldValues[field.key] || ''}
                    onChange={e => updateCustomFieldValue(field.key, e.target.value)}
                    required={field.required}
                    className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                )}
                {field.type === 'DATE' && (
                  <input
                    type="date"
                    value={customFieldValues[field.key] || ''}
                    onChange={e => updateCustomFieldValue(field.key, e.target.value)}
                    required={field.required}
                    className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                )}
                {field.type === 'SELECT' && (
                  <select
                    value={customFieldValues[field.key] || ''}
                    onChange={e => updateCustomFieldValue(field.key, e.target.value)}
                    required={field.required}
                    className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    {(field.options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {field.type === 'PERSON' && (
                  <PersonPicker
                    tenant={tenant}
                    value={customFieldValues[field.key] || null}
                    onSelect={id => updateCustomFieldValue(field.key, id || '')}
                    placeholder="Search for a person..."
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Content rich text editor */}
        <div className="space-y-2 border-t border-gray-100 pt-6">
          <label className="block text-sm font-bold text-ink">
            Details & Justification
          </label>
          <div className="prose max-w-none">
            <RichTextEditor content={content} onChange={setContent} />
          </div>
        </div>

        {/* Attachments Section */}
        <div className="space-y-4 border-t border-gray-100 pt-6">
          <div>
            <label className="block text-sm font-bold text-ink flex items-center gap-2">
              <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Attachments (Optional)
            </label>
            <p className="text-xs text-gray-400 font-medium mt-1">
              Upload any files supporting your request (e.g. PDFs, images, spreadsheets). Max 50MB per file.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative border-2 border-dashed border-gray-200 hover:border-brand/40 rounded-xl p-6 text-center cursor-pointer transition bg-gray-50/10">
              <input
                type="file"
                multiple
                name="attachments"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="text-sm font-semibold text-gray-500 flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Click or drag files here to attach</span>
              </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-white overflow-hidden shadow-sm">
                {selectedFiles.map((file, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3.5 hover:bg-gray-50/50 transition">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-semibold text-ink truncate max-w-xs md:max-w-md">{file.name}</span>
                      <span className="text-xs text-gray-400 font-medium shrink-0">({formatBytes(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-gray-100 transition shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        


        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
          <Link
            href={`/${tenant}`}
            className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 bg-white hover:bg-gray-50 hover:text-ink focus:outline-none transition shadow-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/10 hover:bg-brand/95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transform hover:-translate-y-0.5 active:translate-y-0 transition duration-150"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </>
            ) : 'Submit for Approval'}
          </button>
        </div>
      </form>
    </div>
  );
}
