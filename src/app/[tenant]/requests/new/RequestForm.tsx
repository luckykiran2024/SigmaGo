"use client";

import { useState, useEffect, useRef } from 'react';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { submitNewRequest } from './actions';
import PersonPicker from '@/components/ui/PersonPicker';
import Link from 'next/link';
import { Plus, Trash2, Users, ArrowUp, ArrowDown, Search } from 'lucide-react';

interface ActiveUser {
  id: string;
  name: string;
  designation: string | null;
  career_level: string | null;
  employee_id: string | null;
}

interface RequestFormProps {
  tenant: string;
  categories: { id: string; name: string }[];
  activeUsers: ActiveUser[];
  workflows?: any[];
  loggedInUserId: string;
}

interface ApprovalPathItem {
  userId: string;
  role: 'GENERAL' | 'PARALLEL' | 'REFERENCE';
}

export default function RequestForm({ tenant, categories, activeUsers, workflows = [], loggedInUserId }: RequestFormProps) {
  const [content, setContent] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Flat list approval path state
  const [approvalPath, setApprovalPath] = useState<ApprovalPathItem[]>([
    { userId: '', role: 'GENERAL' }
  ]);

  const [isPathLocked, setIsPathLocked] = useState(false);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCatId = e.target.value;
    if (!selectedCatId) {
      setApprovalPath([{ userId: '', role: 'GENERAL' }]);
      setIsPathLocked(false);
      return;
    }

    const linkedWorkflow = workflows.find(wf => wf.category_id === selectedCatId);
    if (linkedWorkflow) {
      if (linkedWorkflow.steps && linkedWorkflow.steps.length > 0) {
        const mappedSteps = linkedWorkflow.steps.map((s: any) => ({
          userId: s.userId || '',
          role: s.role || 'GENERAL'
        }));
        setApprovalPath(mappedSteps);
      } else {
        setApprovalPath([{ userId: '', role: 'GENERAL' }]);
      }
      setIsPathLocked(!!linkedWorkflow.is_locked);
    } else {
      setApprovalPath([{ userId: '', role: 'GENERAL' }]);
      setIsPathLocked(false);
    }
  };

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
      // Filter out unfilled rows before submission
      const cleanPath = approvalPath.filter(x => x.userId);

      // Append manually managed selected files
      formData.delete('attachments');
      selectedFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      await submitNewRequest(formData, content, tenant, cleanPath);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to submit request.");
      setIsSubmitting(false);
    }
  };

  const selectedUserIds = approvalPath.map(x => x.userId).filter(Boolean);

  return (
    <div className="space-y-6 font-body max-w-4xl mx-auto py-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-ink">
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

      <form onSubmit={handleSubmit} className="space-y-8 bg-white shadow-sm border border-gray-100 rounded-2xl p-6 sm:p-8">
        
        {/* Subject and Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
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

          <div>
            <label htmlFor="category" className="block text-sm font-bold text-ink">
              Category
            </label>
            <div className="mt-2 relative">
              <select
                id="category"
                name="category"
                required
                onChange={handleCategoryChange}
                className="block w-full rounded-xl border border-gray-200 py-3 px-4 text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-sm appearance-none bg-white font-medium"
              >
                <option value="">Select a category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Flat Approval Path Builder */}
        <div className="space-y-6">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-ink font-display flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-dashed border-accent/40 rounded-xl text-xs font-bold text-accent hover:bg-accent/5 hover:border-accent transition"
              >
                <Plus className="w-4 h-4" />
                Add Approver
              </button>
            )}
          </div>

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
                        className="text-gray-400 hover:text-accent disabled:opacity-30 disabled:hover:text-gray-400 p-1.5 rounded-lg transition hover:bg-gray-100"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRowDown(idx)}
                        disabled={idx === approvalPath.length - 1}
                        className="text-gray-400 hover:text-accent disabled:opacity-30 disabled:hover:text-gray-400 p-1.5 rounded-lg transition hover:bg-gray-100"
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
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Attachments (Optional)
            </label>
            <p className="text-xs text-gray-400 font-medium mt-1">
              Upload any files supporting your request (e.g. PDFs, images, spreadsheets). Max 50MB per file.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative border-2 border-dashed border-gray-200 hover:border-accent/40 rounded-xl p-6 text-center cursor-pointer transition bg-gray-50/10">
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
            className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/10 hover:bg-accent/95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transform hover:-translate-y-0.5 active:translate-y-0 transition duration-150"
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
