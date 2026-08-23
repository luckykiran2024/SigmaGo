'use client';

import { useState } from 'react';
import { submitSupportTicketAction } from '@/app/platform-admin/actions';
import { LifeBuoy, CheckCircle2, AlertTriangle, Send } from 'lucide-react';

export default function SupportTicketModal({
  tenantId,
  userId,
  userEmail,
  isOpen,
  onClose,
}: {
  tenantId: string;
  userId?: string;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await submitSupportTicketAction({
        tenantId,
        userId,
        requesterEmail: userEmail,
        subject,
        description,
        priority,
      });

      if (!res.success) {
        setError(res.error || 'Failed to submit support ticket.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSubject('');
        setDescription('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error submitting ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-[#E4E7EC] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-[#101828]">
        <div className="flex items-center justify-between border-b border-[#F2F4F7] pb-3">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-[#274C77]" />
            <h3 className="font-bold text-sm text-[#101828]">Raise Support Ticket</h3>
          </div>
          <button onClick={onClose} className="text-[#667085] hover:text-[#101828] font-bold text-xs">
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-sm text-gray-900">Ticket Submitted Successfully!</h4>
            <p className="text-xs text-gray-500">SigmaGo platform super admins will review your request shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase mb-1">Issue Subject</label>
              <input
                type="text"
                required
                placeholder="Brief summary of the issue..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#274C77]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] text-xs font-bold focus:outline-none"
              >
                <option value="LOW">Low (General Query)</option>
                <option value="MEDIUM">Medium (Normal Issue)</option>
                <option value="HIGH">High (Urgent Block)</option>
                <option value="URGENT">Urgent (System Outage)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase mb-1">Detailed Description</label>
              <textarea
                rows={4}
                required
                placeholder="Describe what happened or what you need assistance with..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-[#D0D5DD] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#274C77]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#D0D5DD] text-[#344054] hover:bg-[#F9FAFB] rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#274C77] hover:bg-[#1E3C60] text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Submitting...' : 'Submit Ticket'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
