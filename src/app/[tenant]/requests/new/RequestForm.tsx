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
import { evaluatePolicyBound } from '@/lib/policies/bounds';

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

  // Misclassification calculation using canonical policy bound evaluator
  const governingPol = (selectedCategory as any)?.governing_policy;
  const boundEvaluation = evaluatePolicyBound(
    governingPol
      ? {
          boundType: governingPol.bound_type,
          boundValue: governingPol.bound_value,
          boundField: governingPol.bound_field,
          policyTitle: governingPol.title,
        }
      : null,
    customFieldValues
  );

  const isBreached = boundEvaluation.isBreached;
  const enteredNumericValue = boundEvaluation.enteredValue;
  const boundType = boundEvaluation.boundType;
  const boundValue = boundEvaluation.boundValue;
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
    <div className="space-y-6 font-sans max-w-4xl mx-auto py-4">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#17324D]">
            Create Approval Request
          </h1>
          <p className="mt-1 text-xs text-[#526679] font-medium">
            Define a custom approval path with Direct approvals, Parallel reviews, and FYI Reference notifications.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7 bg-white shadow-xs border border-[#DCE5EA] rounded-xl p-6 sm:p-8">
        
        {/* STEP 0: WORKFLOW SELECTOR */}
        {workflows.length > 0 && (
          <div className="bg-[#F6F8F9] border border-[#DCE5EA] rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#182B3D] flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-[#0B7780]" />
                Governance Workflow
              </label>
              {selectedWorkflow && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                  selectedWorkflow.is_locked
                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                }`}>
                  {selectedWorkflow.is_locked ? (
                    <>
                      <Lock className="w-3 h-3 text-amber-700" />
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
              className="block w-full rounded-lg border border-[#DCE5EA] py-2.5 px-3.5 text-sm text-[#182B3D] bg-white font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition"
            >
              <option value="">Custom Workflow (User-defined path)</option>
              {workflows.map((wf: any) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name} {wf.is_locked ? '[🔒 Locked Governance]' : '[Editable]'} {wf.base_step_type ? `· ${wf.base_step_type}` : ''}
                </option>
              ))}
            </select>

            {selectedWorkflow && (
              <div className="mt-3 pt-3 border-t border-[#DCE5EA] flex flex-wrap gap-2.5 text-xs font-semibold">
                {selectedWorkflow.description && (
                  <div className="text-[#526679] w-full font-normal">{selectedWorkflow.description}</div>
                )}
                {selectedWorkflow.default_sla_hours && (
                  <div className="text-[#17324D] bg-[#ECF6F5] px-2.5 py-1 rounded-md border border-[#DCE5EA]">
                    ⏱ Default SLA: {selectedWorkflow.default_sla_hours} hours
                  </div>
                )}
                {selectedWorkflow.base_step_type && (
                  <div className="text-[#315878] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    🏷 Base STEP: {selectedWorkflow.base_step_type}
                  </div>
                )}
                {selectedWorkflow.is_locked && (
                  <div className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1.5">
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
            disabled={Boolean(selectedWorkflow?.category_id)}
          />
          {selectedWorkflow?.category_id && (
            <p className="mt-1.5 text-xs text-indigo-700 font-semibold flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Category strictly bound to governance workflow &quot;{selectedWorkflow.name}&quot;
            </p>
          )}
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
          <label htmlFor="subject" className="block text-xs font-bold uppercase tracking-wider text-[#182B3D] mb-1.5">
            Subject
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="subject"
              id="subject"
              required
              className="block w-full rounded-lg border border-[#DCE5EA] py-2.5 px-3.5 text-[#182B3D] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition text-sm font-medium"
              placeholder="e.g. Q3 Marketing Budget Increase"
            />
          </div>
        </div>

        {/* Flat Approval Path Builder */}
        <div className="space-y-4">
          <div className="border-b border-[#DCE5EA] pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#17324D] font-sans flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0B7780]" />
                Approval Path Definition
              </h3>
              <p className="text-xs text-[#526679] font-medium mt-0.5">
                Sequence is derived from row position. Direct gates must approve first, followed by Parallels in the same order level. Reference paths are FYI only.
              </p>
            </div>
            {!isPathLocked && (
              <button
                type="button"
                onClick={addPathRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-[#17324D]/40 rounded-lg text-xs font-bold text-[#17324D] hover:bg-[#ECF6F5] hover:border-[#0B7780] transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Approver
              </button>
            )}
          </div>

          {isPathLocked && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
              <span>This approval route is strictly locked by organizational governance policy. Approvers, stages, and order are enforced server-side.</span>
            </div>
          )}

          <div className="space-y-2.5">
            {/* Headers for larger viewports */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-3 text-[11px] font-bold text-[#526679] uppercase tracking-wider">
              <div className={isPathLocked ? "col-span-8" : "col-span-6"}>Person</div>
              <div className="col-span-4">Role</div>
              {!isPathLocked && <div className="col-span-2 text-center">Actions</div>}
            </div>

            <div className="space-y-2.5">
              {approvalPath.map((row, idx) => (
                <div 
                  key={idx} 
                  className="p-3 rounded-lg border border-[#DCE5EA] bg-[#F6F8F9]/60 grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:bg-white hover:border-[#0B7780]/40 transition"
                >
                  {/* Person Picker */}
                  <div className={isPathLocked ? "col-span-1 md:col-span-8" : "col-span-1 md:col-span-6"}>
                    <label className="block md:hidden text-[11px] font-bold text-[#526679] uppercase tracking-wider mb-1">
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
                    <label className="block md:hidden text-[11px] font-bold text-[#526679] uppercase tracking-wider mb-1">
                      Role
                    </label>
                    <select
                      value={row.role}
                      onChange={(e) => updatePathRow(idx, 'role', e.target.value)}
                      required
                      disabled={isPathLocked}
                      className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-[#182B3D] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition font-medium disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="GENERAL">Direct Approver</option>
                      <option value="PARALLEL">Parallel Approver</option>
                      <option value="REFERENCE">FYI / Reference</option>
                    </select>
                  </div>

                  {/* Remove & Reorder Actions */}
                  {!isPathLocked && (
                    <div className="col-span-1 md:col-span-2 flex items-center justify-center gap-1 pt-2 md:pt-0">
                      <button
                        type="button"
                        onClick={() => moveRowUp(idx)}
                        disabled={idx === 0}
                        className="text-[#637587] hover:text-[#17324D] disabled:opacity-30 disabled:hover:text-[#637587] p-1.5 rounded-md transition hover:bg-[#EEF2F4]"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRowDown(idx)}
                        disabled={idx === approvalPath.length - 1}
                        className="text-[#637587] hover:text-[#17324D] disabled:opacity-30 disabled:hover:text-[#637587] p-1.5 rounded-md transition hover:bg-[#EEF2F4]"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePathRow(idx)}
                        disabled={approvalPath.length <= 1}
                        className="text-[#637587] hover:text-rose-600 disabled:opacity-30 disabled:hover:text-[#637587] p-1.5 rounded-md transition hover:bg-rose-50"
                        title="Remove Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Beneficiary (optional) */}
        <div className="border-t border-[#DCE5EA] pt-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#182B3D] mb-1">
            This request is for <span className="text-[#637587] font-normal normal-case">(optional)</span>
          </label>
          <p className="text-xs text-[#526679] font-medium mb-2">
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
              className="text-xs text-rose-600 hover:text-rose-800 mt-1.5 font-medium transition"
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
            <div className="border-t border-[#DCE5EA] pt-6 space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#182B3D]">
                {isReview ? 'Review Date' : 'Validity Duration'}
                {isRequired && <span className="text-rose-500 ml-1">*</span>}
              </label>
              <p className="text-xs text-[#526679] font-medium">
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
                  className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-[#182B3D] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition text-sm font-medium"
                />
              </div>
            </div>
          );
        })()}

        {/* Custom Fields */}
        {visibleCustomFields.length > 0 && (
          <div className="border-t border-[#DCE5EA] pt-6 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#182B3D]">Additional Information</h3>
            {visibleCustomFields.map(field => (
              <div key={field.id}>
                <label className="block text-xs font-semibold text-[#182B3D] mb-1">
                  {field.label}
                  {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                </label>
                {field.type === 'TEXT' && (
                  <input
                    type="text"
                    value={customFieldValues[field.key] || ''}
                    onChange={e => updateCustomFieldValue(field.key, e.target.value)}
                    required={field.required}
                    className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780]"
                  />
                )}
                {field.type === 'NUMBER' && (
                  <input
                    type="number"
                    value={customFieldValues[field.key] || ''}
                    onChange={e => updateCustomFieldValue(field.key, e.target.value)}
                    required={field.required}
                    className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780]"
                  />
                )}
                {field.type === 'DATE' && (
                  <input
                    type="date"
                    value={customFieldValues[field.key] || ''}
                    onChange={e => updateCustomFieldValue(field.key, e.target.value)}
                    required={field.required}
                    className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780]"
                  />
                )}
                {field.type === 'SELECT' && (
                  <select
                    value={customFieldValues[field.key] || ''}
                    onChange={e => updateCustomFieldValue(field.key, e.target.value)}
                    required={field.required}
                    className="block w-full rounded-lg border border-[#DCE5EA] py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780]"
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
        <div className="space-y-2 border-t border-[#DCE5EA] pt-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#182B3D]">
            Details & Justification
          </label>
          <div className="prose max-w-none">
            <RichTextEditor content={content} onChange={setContent} />
          </div>
        </div>

        {/* Attachments Section */}
        <div className="space-y-3.5 border-t border-[#DCE5EA] pt-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#182B3D] flex items-center gap-2">
              <svg className="w-4 h-4 text-[#0B7780]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Attachments (Optional)
            </label>
            <p className="text-xs text-[#526679] font-medium mt-0.5">
              Upload any files supporting your request (e.g. PDFs, images, spreadsheets). Max 50MB per file.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative border-2 border-dashed border-[#DCE5EA] hover:border-[#0B7780]/50 rounded-xl p-5 text-center cursor-pointer transition bg-[#F6F8F9]">
              <input
                type="file"
                multiple
                name="attachments"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="text-xs font-semibold text-[#526679] flex flex-col items-center gap-2">
                <svg className="w-7 h-7 text-[#637587]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Click or drag files here to attach</span>
              </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <ul className="divide-y divide-[#DCE5EA] border border-[#DCE5EA] rounded-lg bg-white overflow-hidden shadow-xs">
                {selectedFiles.map((file, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 hover:bg-[#F6F8F9] transition">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-4 h-4 text-[#637587] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs font-semibold text-[#182B3D] truncate max-w-xs md:max-w-md">{file.name}</span>
                      <span className="text-[11px] text-[#637587] font-mono shrink-0">({formatBytes(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-[#637587] hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[#DCE5EA] pt-6">
          <Link
            href={`/${tenant}`}
            className="inline-flex items-center justify-center px-4 py-2 border border-[#DCE5EA] rounded-lg text-xs font-semibold text-[#526679] bg-white hover:bg-[#F6F8F9] hover:text-[#17324D] focus:outline-none transition shadow-xs"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-[#17324D] hover:bg-[#224564] px-5 py-2 text-xs font-bold text-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0B7780] disabled:opacity-50 transition"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
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
