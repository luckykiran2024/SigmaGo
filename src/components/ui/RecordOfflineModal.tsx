'use client';

import { useState } from 'react';
import { AlertTriangle, Upload, X, ShieldAlert } from 'lucide-react';
import { recordOfflineAction } from '@/app/[tenant]/requests/[id]/recordOfflineAction';

interface RecordOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepId: string;
  approverName: string;
  requestId: string;
  tenant: string;
}

export default function RecordOfflineModal({
  isOpen,
  onClose,
  stepId,
  approverName,
  requestId,
  tenant
}: RecordOfflineModalProps) {
  const [source, setSource] = useState<'EMAIL' | 'CALL' | 'MEETING' | 'CHAT' | 'OTHER'>('EMAIL');
  const [occurredAt, setOccurredAt] = useState<string>(new Date().toISOString().substring(0, 16));
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim().length < 20) {
      setError('Please provide a detailed note explaining the circumstances (minimum 20 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('stepId', stepId);
      formData.append('requestId', requestId);
      formData.append('tenant', tenant);
      formData.append('source', source);
      formData.append('occurredAt', occurredAt);
      formData.append('note', note.trim());
      if (file) {
        formData.append('evidence', file);
      }

      await recordOfflineAction(formData);
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to record offline approval');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-gray-100 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-ink font-sans">Record Offline Approval</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-ink hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Permanent Warning Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 font-medium space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Permanent Integrity Notice</span>
            </div>
            <p className="text-2xs leading-relaxed text-amber-800">
              This action records an approval made outside SigmaGo. It will be permanently marked as <strong>Recorded Offline</strong> and sent to the approver for 48h ratification.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 font-semibold">
              {error}
            </div>
          )}

          {/* Readonly Approver Name */}
          <div>
            <label className="block text-2xs font-extrabold text-muted uppercase tracking-wider mb-1 font-mono">
              Assigned Approver (On behalf of)
            </label>
            <input
              type="text"
              value={approverName}
              readOnly
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-ink font-bold focus:outline-none cursor-not-allowed"
            />
          </div>

          {/* Source & Occurrence Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs font-extrabold text-muted uppercase tracking-wider mb-1 font-mono">
                Communication Source *
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                className="block w-full rounded-xl border border-gray-200 px-3 py-2 text-ink font-bold focus:outline-none focus:ring-2 focus:ring-accent bg-white"
              >
                <option value="EMAIL">Email</option>
                <option value="CALL">Phone / Video Call</option>
                <option value="MEETING">In-Person Meeting</option>
                <option value="CHAT">Chat / Slack / Teams</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs font-extrabold text-muted uppercase tracking-wider mb-1 font-mono">
                When Occurred *
              </label>
              <input
                type="datetime-local"
                value={occurredAt}
                max={new Date().toISOString().substring(0, 16)}
                onChange={(e) => setOccurredAt(e.target.value)}
                required
                className="block w-full rounded-xl border border-gray-200 px-3 py-2 text-ink font-medium focus:outline-none focus:ring-2 focus:ring-accent bg-white"
              />
            </div>
          </div>

          {/* Circumstances Note */}
          <div>
            <label className="block text-2xs font-extrabold text-muted uppercase tracking-wider mb-1 font-mono">
              Circumstances & Note * <span className="font-normal text-gray-400">(Min 20 chars)</span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain how and when the approver communicated their decision..."
              required
              className="block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-ink font-medium focus:outline-none focus:ring-2 focus:ring-accent placeholder-gray-400"
            />
          </div>

          {/* Evidence File Attachment */}
          <div>
            <label className="block text-2xs font-extrabold text-muted uppercase tracking-wider mb-1 font-mono">
              Evidence Attachment <span className="font-normal text-gray-400">(Email screenshot, call record, etc.)</span>
            </label>
            <div className="relative border border-dashed border-gray-200 rounded-xl p-3 text-center bg-gray-50/50 hover:bg-gray-50 transition">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex items-center justify-center gap-2 text-gray-500 font-semibold">
                <Upload className="w-4 h-4 text-brand" />
                <span>{file ? file.name : 'Choose file or screenshot...'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold shadow-md hover:bg-amber-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Recording...' : 'Record Offline Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
