"use client";

import { useState } from 'react';
import { UserCheck, ShieldAlert, AlertTriangle, Plus, Trash2, Search, CheckCircle2, UserX } from 'lucide-react';
import { addApproverToRegisterAction } from './actions';

interface AuthorityBadge {
  categoryName: string;
  stage: number;
}

interface ApproverItem {
  id: string;
  email: string;
  fullName: string;
  jobTitle?: string | null;
  department?: string | null;
  addedAt: string;
  removedAt?: string | null;
  note?: string | null;
  authorities: AuthorityBadge[];
}

interface DirectoryPerson {
  id: string;
  email: string;
  full_name: string;
  job_title?: string | null;
  department?: string | null;
}

interface ApproverRegisterManagerProps {
  approvers: ApproverItem[];
  tenantId: string;
  adminUserId: string;
  directoryPeople: DirectoryPerson[];
  unstaffedCategories: { categoryName: string; unstaffedStages: number[] }[];
}

export default function ApproverRegisterManager({
  approvers: initialApprovers,
  tenantId,
  adminUserId,
  directoryPeople,
  unstaffedCategories,
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
      // Create approver record via server action
      const newApprover = await addApproverToRegisterAction({
        tenantId,
        email: selectedDirEmail,
        addedBy: adminUserId,
        note,
      });

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
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Governance Risk: Unstaffed Approval Stages Detected</span>
          </div>
          <p className="text-xs text-rose-800">
            The following categories contain configured approval stages with zero active approvers. Approval requests in these categories will block:
          </p>
          <ul className="list-disc list-inside text-xs font-mono font-medium text-rose-950 space-y-0.5">
            {unstaffedCategories.map((c) => (
              <li key={c.categoryName}>
                <strong className="font-bold">{c.categoryName}:</strong> Unstaffed Stage(s): {c.unstaffedStages.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {zeroAuthorityApprovers.length > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
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
          <Search className="w-3.5 h-3.5 text-[#637587] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search approvers by name, email, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-[#DCE5EA] text-xs text-[#182B3D] placeholder-[#637587] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780]"
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#17324D] hover:bg-[#224564] text-white text-xs font-bold shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Approver
        </button>
      </div>

      {/* Approvers Register Table */}
      <div className="bg-white border border-[#DCE5EA] rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-[#F6F8F9] border-b border-[#DCE5EA] text-[#526679] font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Approver Person</th>
              <th className="py-3 px-4">Department & Title</th>
              <th className="py-3 px-4">Configured Authorities</th>
              <th className="py-3 px-4">Added On</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE5EA]">
            {filteredApprovers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#637587] font-medium">
                  No approvers match the search criteria.
                </td>
              </tr>
            ) : (
              filteredApprovers.map((approver) => (
                <tr key={approver.id} className={`hover:bg-[#F6F8F9] transition ${approver.removedAt ? 'bg-gray-50/60 opacity-60' : ''}`}>
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#182B3D]">{approver.fullName}</div>
                    <div className="text-[11px] text-[#637587] font-mono">{approver.email}</div>
                  </td>
                  <td className="py-3 px-4 text-[#526679]">
                    <div className="font-medium text-[#182B3D]">{approver.jobTitle || '—'}</div>
                    <div className="text-[11px] text-[#637587]">{approver.department || 'General'}</div>
                  </td>
                  <td className="py-3 px-4">
                    {approver.authorities.length === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                        0 Authorities
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {approver.authorities.map((auth, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#ECF6F5] text-[#17324D] border border-[#DCE5EA]"
                          >
                            {auth.categoryName} · Stage {auth.stage}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[#526679] font-mono text-[11px]">
                    {new Date(approver.addedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    {approver.removedAt ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">
                        Removed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-lg border border-[#DCE5EA] max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#17324D]">
              Add Approver to Register
            </h3>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleAddApprover} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#182B3D] uppercase tracking-wider mb-1">
                  Search & Select Directory Person
                </label>
                <select
                  required
                  value={selectedDirEmail}
                  onChange={(e) => setSelectedDirEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5EA] text-xs text-[#182B3D] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780]"
                >
                  <option value="">-- Select Person from Directory --</option>
                  {directoryPeople.map((person) => (
                    <option key={person.id} value={person.email}>
                      {person.full_name} ({person.email}) — {person.job_title || 'Staff'} [{person.department || 'General'}]
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#637587] mt-1">
                  Approvers must be verified persons in the directory. Free-text email entry is disabled.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#182B3D] uppercase tracking-wider mb-1">
                  Authority Note / Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="State why this person holds approval authority..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE5EA] text-xs text-[#182B3D] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#DCE5EA]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#DCE5EA] text-[#526679] hover:bg-[#F6F8F9] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-[#17324D] hover:bg-[#224564] text-white text-xs font-bold shadow-xs"
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
