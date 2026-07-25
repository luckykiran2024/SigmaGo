'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, X, AlertTriangle, Link2, CheckCircle2, ArrowRight } from 'lucide-react';
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
      // Filter out self-reference
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

  const handleRemove = async (referenceId: string) => {
    if (!confirm('Remove this decision reference?')) return;
    try {
      const formData = new FormData();
      formData.append('referenceId', referenceId);
      formData.append('sourceId', requestId);
      await removeReferenceAction(tenantSubdomain, formData);
    } catch (err: any) {
      alert(err.message || 'Failed to remove reference.');
    }
  };

  const renderBadge = (rel: string) => {
    switch (rel) {
      case 'based_on':
        return <span className="px-2.5 py-0.5 rounded-[5px] bg-brand/10 text-brand font-semibold text-[13px]">Based on</span>;
      case 'replaces':
        return <span className="px-2.5 py-0.5 rounded-[5px] bg-muted/10 text-muted font-semibold text-[13px]">Replaces</span>;
      case 'exception_to':
        return <span className="px-2.5 py-0.5 rounded-[5px] bg-warn/10 text-warn font-semibold text-[13px]">Exception to</span>;
      case 'renewal_of':
        return <span className="px-2.5 py-0.5 rounded-[5px] bg-brand/10 text-brand font-semibold text-[13px]">Renewal of</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-[5px] bg-bg text-muted font-semibold text-[13px]">{rel}</span>;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 rounded-[5px] bg-ok/10 text-ok font-semibold text-[12px]">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-[5px] bg-err/10 text-err font-semibold text-[12px]">Rejected</span>;
      case 'in_review':
        return <span className="px-2 py-0.5 rounded-[5px] bg-brand/10 text-brand font-semibold text-[12px]">In Review</span>;
      default:
        return <span className="px-2 py-0.5 rounded-[5px] bg-bg text-muted font-semibold text-[12px] uppercase">{status}</span>;
    }
  };

  return (
    <div className="bg-surface border border-border rounded-[8px] p-6 space-y-6">
      {/* OUTGOING REFERENCES SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-brand" />
            <h3 className="text-[18px] font-bold text-ink">Decision References</h3>
          </div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold text-brand hover:bg-section-alt rounded-[6px] border border-border transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add reference</span>
            </button>
          )}
        </div>

        {/* List of Outgoing References */}
        {outgoingRefs.length > 0 ? (
          <div className="space-y-3">
            {outgoingRefs.map((ref) => (
              <div key={ref.id} className="p-3.5 bg-section-alt border border-border rounded-[6px] space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-[14px]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {renderBadge(ref.relationship)}
                    <Link
                      href={`/${tenantSubdomain}/requests/${ref.target_id}`}
                      className="font-mono font-bold text-brand hover:underline"
                    >
                      {ref.target_request?.ref || 'REF-????'}
                    </Link>
                    <span className="font-semibold text-ink line-clamp-1">
                      {ref.target_request?.subject || 'Referenced Decision'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ref.target_request?.status && renderStatusBadge(ref.target_request.status)}
                    {(isAdmin || ref.created_by === currentUserId) && (
                      <button
                        onClick={() => handleRemove(ref.id)}
                        className="text-muted hover:text-err p-1 rounded-md transition"
                        title="Remove reference"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {ref.note && (
                  <p className="text-[13px] text-muted pl-1 italic">
                    Note: "{ref.note}"
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          !isAdding && (
            <p className="text-[14px] text-muted italic">
              No references yet. Link this decision to the ones it's based on, replaces, or deviates from.
            </p>
          )
        )}

        {/* INLINE ADD PANEL */}
        {isAdding && (
          <div className="p-4 border border-brand/30 bg-brand/5 rounded-[8px] space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <h4 className="text-[15px] font-bold text-ink">Link Existing Decision</h4>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setSelectedTarget(null);
                }}
                className="text-muted hover:text-ink p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-err/10 border border-err/20 text-err text-[13px] rounded-[6px]">
                {errorMsg}
              </div>
            )}

            {!selectedTarget ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by subject or reference number (e.g. REQ-2026)..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-[6px] text-[14px] text-ink focus:outline-none focus:border-brand"
                  />
                </div>

                {isSearching && <div className="text-[13px] text-muted italic">Searching decisions...</div>}

                {searchResults.length > 0 && (
                  <div className="border border-border bg-white rounded-[6px] divide-y divide-border max-h-48 overflow-y-auto">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedTarget(item)}
                        className="w-full text-left p-3 hover:bg-section-alt transition flex items-center justify-between text-[14px]"
                      >
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-brand mr-2">{item.ref}</span>
                          <span className="font-semibold text-ink">{item.subject}</span>
                          <div className="text-[12px] text-muted">{item.category_name}</div>
                        </div>
                        {renderStatusBadge(item.status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="p-3 bg-white border border-border rounded-[6px] flex items-center justify-between text-[14px]">
                  <div>
                    <span className="font-mono font-bold text-brand mr-2">{selectedTarget.ref}</span>
                    <span className="font-semibold text-ink">{selectedTarget.subject}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTarget(null)}
                    className="text-xs text-brand hover:underline"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-bold uppercase tracking-wider text-muted font-mono">
                    Relationship Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[14px]">
                    <label className={`p-3 border rounded-[6px] cursor-pointer transition flex items-start gap-2.5 ${relationship === 'based_on' ? 'border-brand bg-brand/10' : 'border-border bg-white'}`}>
                      <input
                        type="radio"
                        name="rel"
                        checked={relationship === 'based_on'}
                        onChange={() => setRelationship('based_on')}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div>
                        <div className="font-bold text-ink">Based on</div>
                        <div className="text-[12px] text-muted">Derives authority from that decision</div>
                      </div>
                    </label>

                    <label className={`p-3 border rounded-[6px] cursor-pointer transition flex items-start gap-2.5 ${relationship === 'replaces' ? 'border-brand bg-brand/10' : 'border-border bg-white'}`}>
                      <input
                        type="radio"
                        name="rel"
                        checked={relationship === 'replaces'}
                        onChange={() => setRelationship('replaces')}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div>
                        <div className="font-bold text-ink">Replaces</div>
                        <div className="text-[12px] text-muted">Supersedes that previous decision</div>
                      </div>
                    </label>

                    <label className={`p-3 border rounded-[6px] cursor-pointer transition flex items-start gap-2.5 ${relationship === 'exception_to' ? 'border-brand bg-brand/10' : 'border-border bg-white'}`}>
                      <input
                        type="radio"
                        name="rel"
                        checked={relationship === 'exception_to'}
                        onChange={() => setRelationship('exception_to')}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div>
                        <div className="font-bold text-ink">Exception to</div>
                        <div className="text-[12px] text-muted">Deviates from that policy decision</div>
                      </div>
                    </label>

                    <label className={`p-3 border rounded-[6px] cursor-pointer transition flex items-start gap-2.5 ${relationship === 'renewal_of' ? 'border-brand bg-brand/10' : 'border-border bg-white'}`}>
                      <input
                        type="radio"
                        name="rel"
                        checked={relationship === 'renewal_of'}
                        onChange={() => setRelationship('renewal_of')}
                        className="mt-0.5 text-brand focus:ring-brand"
                      />
                      <div>
                        <div className="font-bold text-ink">Renewal of</div>
                        <div className="text-[12px] text-muted">Renews that expired decision</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] font-bold uppercase tracking-wider text-muted font-mono">
                    Optional Note / Reason
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Explain why this decision is linked..."
                    className="w-full p-2.5 bg-white border border-border rounded-[6px] text-[14px] text-ink focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 text-[14px] font-medium text-ink hover:bg-section-alt rounded-[6px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-brand hover:bg-brand-deep text-white text-[14px] font-semibold rounded-[6px] transition disabled:opacity-50"
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
        <div className="space-y-4 border-t border-border pt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-ink">Decisions referencing this one</h3>
            {exceptionCount >= 3 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[5px] bg-warn/10 text-warn border border-warn/20 text-[13px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Cited as exception basis {exceptionCount} times</span>
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {incomingRefs.map((ref) => (
              <div key={ref.id} className="p-3 bg-white border border-border rounded-[6px] flex items-center justify-between text-[14px]">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {renderBadge(ref.relationship)}
                  <Link
                    href={`/${tenantSubdomain}/requests/${ref.source_id}`}
                    className="font-mono font-bold text-brand hover:underline"
                  >
                    {ref.source_request?.ref || 'REF-????'}
                  </Link>
                  <span className="font-semibold text-ink">{ref.source_request?.subject}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-[13px] text-muted">
                  {ref.source_request?.status && renderStatusBadge(ref.source_request.status)}
                  <span>{new Date(ref.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
