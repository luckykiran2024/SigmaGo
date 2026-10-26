'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, X, AlertTriangle, Link2 } from 'lucide-react';
import { addReferenceAction, removeReferenceAction, searchDecisionsAction } from '@/app/[tenant]/requests/[id]/reference-actions';

interface ReferenceItem {
  id: string;
  tenant_id: string;
  source_id: string;
  target_id: string;
  relationship: 'based_on' | 'replaces' | 'exception_to' | 'renewal_of';
  note?: string | null;
  created_by: string;
  created_at: string;
  target_request?: {
    id: string;
    ref: string;
    subject: string;
    status: string;
    category_name?: string;
  };
  source_request?: {
    id: string;
    ref: string;
    subject: string;
    status: string;
    created_at: string;
    category_name?: string;
  };
}

interface DecisionReferencesCardProps {
  tenantSubdomain: string;
  requestId: string;
  outgoingRefs: ReferenceItem[];
  incomingRefs: ReferenceItem[];
  exceptionCount: number;
  currentUserId: string;
  isAdmin: boolean;
}

export function DecisionReferencesCard({
  tenantSubdomain,
  requestId,
  outgoingRefs,
  incomingRefs,
  exceptionCount,
  currentUserId,
  isAdmin,
}: DecisionReferencesCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [relationship, setRelationship] = useState<'based_on' | 'replaces' | 'exception_to' | 'renewal_of'>('based_on');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchDecisionsAction(tenantSubdomain, q);
      setSearchResults(results.filter((r: any) => r.id !== requestId));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('sourceId', requestId);
      formData.append('targetId', selectedTarget.id);
      formData.append('relationship', relationship);
      formData.append('note', note);

      await addReferenceAction(tenantSubdomain, formData);
      setIsAdding(false);
      setSelectedTarget(null);
      setSearchQuery('');
      setSearchResults([]);
      setNote('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add reference.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deleteRefId, setDeleteRefId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmRemove = async () => {
    if (!deleteRefId) return;
    try {
      const formData = new FormData();
      formData.append('referenceId', deleteRefId);
      formData.append('sourceId', requestId);
      await removeReferenceAction(tenantSubdomain, formData);
      setDeleteRefId(null);
      setDeleteError(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to remove reference.');
    }
  };

  const renderBadge = (rel: string) => {
    switch (rel) {
      case 'based_on':
        return <span className="px-2 py-0.5 rounded-[4px] bg-[#E7EDF0] text-[#17324D] font-medium text-[11.5px] border border-[#DCE5EA]">Based on</span>;
      case 'replaces':
        return <span className="px-2 py-0.5 rounded-[4px] bg-[#EEF2F4] text-[#526679] font-medium text-[11.5px] border border-[#DCE5EA]">Replaces</span>;
      case 'exception_to':
        return <span className="px-2 py-0.5 rounded-[4px] bg-[#FFFAEB] text-[#B54708] font-medium text-[11.5px] border border-[#FEDF89]">Exception to</span>;
      case 'renewal_of':
        return <span className="px-2 py-0.5 rounded-[4px] bg-[#ECF6F5] text-[#096A72] font-medium text-[11.5px] border border-[#D7ECEA]">Renewal of</span>;
      default:
        return <span className="px-2 py-0.5 rounded-[4px] bg-[#EEF2F4] text-[#526679] font-medium text-[11.5px] border border-[#DCE5EA]">{rel}</span>;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 rounded-[4px] bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5] font-medium text-[11px]">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-[4px] bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] font-medium text-[11px]">Rejected</span>;
      case 'in_review':
        return <span className="px-2 py-0.5 rounded-[4px] bg-[#E7EDF0] text-[#17324D] border border-[#DCE5EA] font-medium text-[11px]">In Review</span>;
      default:
        return <span className="px-2 py-0.5 rounded-[4px] bg-[#EEF2F4] text-[#526679] border border-[#DCE5EA] font-medium text-[11px] uppercase">{status}</span>;
    }
  };

  return (
    <div className="bg-white border border-[#DCE5EA] rounded-[10px] p-6 space-y-6 shadow-xs font-sans">
      {/* OUTGOING REFERENCES SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAF0F2] pb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[#17324D]" />
            <h3 className="text-[16px] font-semibold text-[#182B3D]">Decision References</h3>
            {outgoingRefs.length === 0 && incomingRefs.length === 0 ? (
              <span className="px-2 py-0.5 rounded-[4px] bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] text-[11px] font-medium uppercase font-mono">
                Orphan Decision
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-[4px] bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5] text-[11px] font-medium uppercase font-mono">
                Connected ({outgoingRefs.length + incomingRefs.length} Ref{outgoingRefs.length + incomingRefs.length > 1 ? 's' : ''})
              </span>
            )}
          </div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#17324D] hover:bg-[#F6F8F9] rounded-[6px] border border-[#DCE5EA] transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add reference</span>
            </button>
          )}
        </div>

        {/* ORPHAN ALERT BANNER */}
        {outgoingRefs.length === 0 && incomingRefs.length === 0 && !isAdding && (
          <div className="p-4 bg-[#FFFAEB] border border-[#FEDF89] rounded-[8px] flex items-start gap-3 text-[13px] text-[#B54708]">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#B54708]" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#182B3D]">Orphan Approval Detected</span>
                <span className="px-2 py-0.5 rounded-[4px] bg-[#FEF0C7] text-[#B54708] border border-[#FEDF89] font-mono font-medium text-[11px] uppercase tracking-wider">
                  Orphan
                </span>
              </div>
              <p className="text-[#526679] text-[12.5px] leading-relaxed">
                Approvals without references are called <strong>orphans</strong>. In sound organizational governance, almost all approvals should have a reference (e.g. parent SOP, policy, or precedent). Orphan approvals elevate the organization&apos;s <strong>Orphan Score</strong>.
              </p>
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="mt-1 text-[12.5px] font-medium text-[#0B7780] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Link a reference now to anchor this approval</span>
              </button>
            </div>
          </div>
        )}

        {/* List of Outgoing References */}
        {outgoingRefs.length > 0 ? (
          <div className="space-y-2.5">
            {outgoingRefs.map((ref) => (
              <div key={ref.id} className="p-3.5 bg-[#F6F8F9] border border-[#EAF0F2] rounded-[8px] space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-[13.5px]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {renderBadge(ref.relationship)}
                    <Link
                      href={`/${tenantSubdomain}/requests/${ref.target_id}`}
                      className="font-mono font-medium text-[#17324D] hover:underline"
                    >
                      {ref.target_request?.ref || 'REF-????'}
                    </Link>
                    <span className="font-medium text-[#182B3D] line-clamp-1">
                      {ref.target_request?.subject || 'Referenced Decision'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ref.target_request?.status && renderStatusBadge(ref.target_request.status)}
                    {(isAdmin || ref.created_by === currentUserId) && (
                      <button
                        onClick={() => {
                          setDeleteRefId(ref.id);
                          setDeleteError(null);
                        }}
                        className="text-[#637587] hover:text-[#B42318] p-1 rounded transition"
                        title="Remove reference"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {deleteRefId === ref.id && (
                  <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-[6px] flex items-center justify-between text-[12.5px]">
                    <span className="text-[#B42318] font-medium">Remove this decision reference link?</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteRefId(null)}
                        className="px-2.5 py-1 text-[#526679] hover:text-[#182B3D] font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmRemove}
                        className="px-2.5 py-1 bg-[#B42318] text-white rounded-[4px] font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
                {ref.note && (
                  <p className="text-[12.5px] text-[#526679] pl-1 italic">
                    Note: &quot;{ref.note}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          !isAdding && outgoingRefs.length > 0 && (
            <p className="text-[13px] text-[#637587] italic">
              No references yet. Link this decision to the ones it&apos;s based on, replaces, or deviates from.
            </p>
          )
        )}

        {/* INLINE ADD PANEL */}
        {isAdding && (
          <div className="p-4 border border-[#0B7780]/30 bg-[#ECF6F5]/50 rounded-[8px] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[14.5px] font-semibold text-[#182B3D]">Link Existing Decision</h4>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setSelectedTarget(null);
                }}
                className="text-[#637587] hover:text-[#182B3D] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-[12.5px] rounded-[6px]">
                {errorMsg}
              </div>
            )}

            {!selectedTarget ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#637587] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by subject or reference number (e.g. REQ-2026)..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-[#DCE5EA] rounded-[6px] text-[13.5px] text-[#182B3D] focus:outline-none focus:ring-2 focus:ring-[#0B7780]"
                  />
                </div>

                {isSearching && <div className="text-[12.5px] text-[#637587] italic">Searching decisions...</div>}

                {searchResults.length > 0 && (
                  <div className="border border-[#DCE5EA] bg-white rounded-[6px] divide-y divide-[#EAF0F2] max-h-48 overflow-y-auto">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedTarget(item)}
                        className="w-full text-left p-3 hover:bg-[#F6F8F9] transition flex items-center justify-between text-[13px]"
                      >
                        <div className="space-y-0.5">
                          <span className="font-mono font-medium text-[#17324D] mr-2">{item.ref}</span>
                          <span className="font-medium text-[#182B3D]">{item.subject}</span>
                          <div className="text-[11.5px] text-[#637587]">{item.category_name}</div>
                        </div>
                        {renderStatusBadge(item.status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="p-3 bg-white border border-[#DCE5EA] rounded-[6px] flex items-center justify-between text-[13.5px]">
                  <div>
                    <span className="font-mono font-medium text-[#17324D] mr-2">{selectedTarget.ref}</span>
                    <span className="font-medium text-[#182B3D]">{selectedTarget.subject}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTarget(null)}
                    className="text-xs text-[#0B7780] hover:underline font-medium"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#637587]">
                    Relationship Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                    <label className={`p-3 border rounded-[6px] cursor-pointer transition flex items-start gap-2.5 ${relationship === 'based_on' ? 'border-[#0B7780] bg-white ring-1 ring-[#0B7780]' : 'border-[#DCE5EA] bg-white'}`}>
                      <input
                        type="radio"
                        name="rel"
                        checked={relationship === 'based_on'}
                        onChange={() => setRelationship('based_on')}
                        className="mt-0.5 text-[#0B7780] focus:ring-[#0B7780]"
                      />
                      <div>
                        <div className="font-semibold text-[#182B3D]">Based on</div>
                        <div className="text-[12px] text-[#526679]">Derives authority from that decision</div>
                      </div>
                    </label>

                    <label className={`p-3 border rounded-[6px] cursor-pointer transition flex items-start gap-2.5 ${relationship === 'replaces' ? 'border-[#0B7780] bg-white ring-1 ring-[#0B7780]' : 'border-[#DCE5EA] bg-white'}`}>
                      <input
                        type="radio"
                        name="rel"
                        checked={relationship === 'replaces'}
                        onChange={() => setRelationship('replaces')}
                        className="mt-0.5 text-[#0B7780] focus:ring-[#0B7780]"
                      />
                      <div>
                        <div className="font-semibold text-[#182B3D]">Replaces</div>
                        <div className="text-[12px] text-[#526679]">Supersedes that previous decision</div>
                      </div>
                    </label>

                    <label className={`p-3 border rounded-[6px] cursor-pointer transition flex items-start gap-2.5 ${relationship === 'exception_to' ? 'border-[#0B7780] bg-white ring-1 ring-[#0B7780]' : 'border-[#DCE5EA] bg-white'}`}>
                      <input
                        type="radio"
                        name="rel"
                        checked={relationship === 'exception_to'}
                        onChange={() => setRelationship('exception_to')}
                        className="mt-0.5 text-[#0B7780] focus:ring-[#0B7780]"
                      />
                      <div>
                        <div className="font-semibold text-[#182B3D]">Exception to</div>
                        <div className="text-[12px] text-[#526679]">Deviates from that policy decision</div>
                      </div>
                    </label>

                    <label className={`p-3 border rounded-[6px] cursor-pointer transition flex items-start gap-2.5 ${relationship === 'renewal_of' ? 'border-[#0B7780] bg-white ring-1 ring-[#0B7780]' : 'border-[#DCE5EA] bg-white'}`}>
                      <input
                        type="radio"
                        name="rel"
                        checked={relationship === 'renewal_of'}
                        onChange={() => setRelationship('renewal_of')}
                        className="mt-0.5 text-[#0B7780] focus:ring-[#0B7780]"
                      />
                      <div>
                        <div className="font-semibold text-[#182B3D]">Renewal of</div>
                        <div className="text-[12px] text-[#526679]">Renews that expired decision</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#637587]">
                    Optional Note / Reason
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Explain why this decision is linked..."
                    className="w-full p-2.5 bg-white border border-[#DCE5EA] rounded-[6px] text-[13px] text-[#182B3D] focus:outline-none focus:ring-2 focus:ring-[#0B7780]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-3.5 py-1.5 text-[13px] font-medium text-[#526679] hover:bg-[#F6F8F9] rounded-[6px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-[#17324D] hover:bg-[#224564] text-white text-[13px] font-medium rounded-[6px] transition disabled:opacity-50 shadow-xs"
                  >
                    {isSubmitting ? 'Linking...' : 'Confirm Reference'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* INCOMING REFERENCES (DECISIONS REFERENCING THIS ONE) */}
      {incomingRefs.length > 0 && (
        <div className="space-y-4 border-t border-[#EAF0F2] pt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#182B3D]">Decisions referencing this one</h3>
            {exceptionCount >= 3 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] text-[12px] font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Cited as exception basis {exceptionCount} times</span>
              </span>
            )}
          </div>

          <div className="space-y-2">
            {incomingRefs.map((ref) => (
              <div key={ref.id} className="p-3 bg-[#F6F8F9] border border-[#EAF0F2] rounded-[8px] flex items-center justify-between text-[13.5px]">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {renderBadge(ref.relationship)}
                  <Link
                    href={`/${tenantSubdomain}/requests/${ref.source_id}`}
                    className="font-mono font-medium text-[#17324D] hover:underline"
                  >
                    {ref.source_request?.ref || 'REF-????'}
                  </Link>
                  <span className="font-medium text-[#182B3D]">{ref.source_request?.subject}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[12px] text-[#637587]">
                  {ref.source_request?.status && renderStatusBadge(ref.source_request.status)}
                  <span className="font-mono">{new Date(ref.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
