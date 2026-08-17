"use client";

import { useState } from 'react';
import { UserCheck, ShieldAlert, AlertTriangle, Plus, Trash2, Search, CheckCircle2, UserX } from 'lucide-react';
import { adminClient } from '@/lib/supabase/admin';

interface AuthorityBadge {
  categoryName: string;
  stage: number;
}

interface ApproverItem {
  id: string;
  email: string;
  fullName: string;
  jobTitle?: string;
  department?: string;
  addedAt: string;
  removedAt?: string | null;
  note?: string;
  authorities: AuthorityBadge[];
}

interface CategoryStageCheck {
  categoryName: string;
  unstaffedStages: number[];
}

interface ApproverRegisterManagerProps {
  approvers: ApproverItem[];
  unstaffedCategories: CategoryStageCheck[];
  directoryPeople: Array<{ id: string; email: string; full_name: string; job_title?: string; department?: string }>;
  tenantId: string;
  adminUserId: string;
}

export default function ApproverRegisterManager({
  approvers: initialApprovers,
  unstaffedCategories,
  directoryPeople,
  tenantId,
  adminUserId,
}: ApproverRegisterManagerProps) {
  const [approvers, setApprovers] = useState<ApproverItem[]>(initialApprovers);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDirEmail, setSelectedDirEmail] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredApprovers = approvers.filter(
    (a) =>
      a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.department && a.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Approvers with zero authorities (added & forgotten)
  const zeroAuthorityApprovers = approvers.filter((a) => !a.removedAt && a.authorities.length === 0);

  const handleAddApprover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedDirEmail) {
      setError('Please select a verified person from the directory.');
      return;
    }

    setLoading(true);

    try {
      // Create approver record
      const { data: newApprover, error: insertErr } = await adminClient
        .from('approvers')
        .upsert(
          {
            tenant_id: tenantId,
            email: selectedDirEmail.toLowerCase().trim(),
            added_by: adminUserId,
            added_at: new Date().toISOString(),
            removed_at: null,
            note: note || 'Added to Approver Register',
          },
          { onConflict: 'tenant_id,email' }
        )
        .select()
        .single();

      if (insertErr) throw insertErr;

      const dirPerson = directoryPeople.find((p) => p.email === selectedDirEmail);

      const newItem: ApproverItem = {
        id: newApprover.id,
        email: newApprover.email,
        fullName: dirPerson?.full_name || newApprover.email,
        jobTitle: dirPerson?.job_title,
        department: dirPerson?.department,
        addedAt: newApprover.added_at,
        note: newApprover.note,
        authorities: [],
      };

      setApprovers([newItem, ...approvers.filter((a) => a.email !== newItem.email)]);
      setShowAddModal(false);
      setSelectedDirEmail('');
      setNote('');
    } catch (err: any) {
      setError(err.message || 'Failed to add approver to register.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Warning Banners for System Health */}
      {unstaffedCategories.length > 0 && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>Production Outage Risk: Unstaffed Approval Stages Detected</span>
          </div>
          <p className="text-xs text-red-800">
            The following categories contain configured approval stages with zero active approvers. Approval requests in these categories will block:
          </p>
          <ul className="list-disc list-inside text-xs font-mono font-medium text-red-950 space-y-0.5">
            {unstaffedCategories.map((c) => (
              <li key={c.categoryName}>
                <strong className="font-bold">{c.categoryName}:</strong> Unstaffed Stage(s): {c.unstaffedStages.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {zeroAuthorityApprovers.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <h4 className="font-bold text-amber-950">Inert Approver Warning</h4>
            <p className="text-amber-900 font-medium">
              {zeroAuthorityApprovers.length} approvers in the register have 0 assigned authorities: {zeroAuthorityApprovers.map((a) => a.fullName).join(', ')}.
            </p>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search approvers by name, email, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add Approver
        </button>
      </div>

      {/* Approvers Register Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Approver Person</th>
              <th className="py-3.5 px-4">Department & Title</th>
              <th className="py-3.5 px-4">Configured Authorities</th>
              <th className="py-3.5 px-4">Added On</th>
              <th className="py-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredApprovers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                  No approvers match the search criteria.
                </td>
              </tr>
            ) : (
              filteredApprovers.map((approver) => (
                <tr key={approver.id} className={approver.removedAt ? 'bg-gray-50/60 opacity-60' : ''}>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-gray-900">{approver.fullName}</div>
                    <div className="text-2xs text-gray-500 font-mono">{approver.email}</div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">
                    <div className="font-medium">{approver.jobTitle || '—'}</div>
                    <div className="text-2xs text-gray-400">{approver.department || 'General'}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    {approver.authorities.length === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-extrabold bg-amber-100 text-amber-800 uppercase">
                        0 Authorities
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {approver.authorities.map((auth, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-extrabold bg-blue-100 text-blue-900 border border-blue-200"
                          >
                            {auth.categoryName} · Stage {auth.stage}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 font-medium">
                    {new Date(approver.addedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4">
                    {approver.removedAt ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-extrabold bg-gray-200 text-gray-700 uppercase">
                        Removed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Adding Approver */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-gray-900 font-sans">
              Add Approver to Register
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleAddApprover} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Search & Select Directory Person
                </label>
                <select
                  required
                  value={selectedDirEmail}
                  onChange={(e) => setSelectedDirEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">-- Select Person from Directory --</option>
                  {directoryPeople.map((person) => (
                    <option key={person.id} value={person.email}>
                      {person.full_name} ({person.email}) — {person.job_title || 'Staff'} [{person.department || 'General'}]
                    </option>
                  ))}
                </select>
                <p className="text-2xs text-gray-400 mt-1">
                  Approvers must be verified persons in the directory. Free-text email entry is disabled.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Authority Note / Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="State why this person holds approval authority..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold shadow-sm"
                >
                  {loading ? 'Adding...' : 'Add to Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
