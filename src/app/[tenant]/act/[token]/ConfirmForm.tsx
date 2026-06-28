'use client';

import { useState } from 'react';
import { confirmEmailAction } from './actions';
import { CheckCircle, AlertTriangle, MessageSquare, Clock } from 'lucide-react';

export default function ConfirmForm({
  tenantSubdomain,
  token,
  initialIntent,
  approverName,
  approverEmail,
  requestSubject,
  justification,
  categoryName,
  ownerName
}: {
  tenantSubdomain: string;
  token: string;
  initialIntent: 'approve' | 'reject' | 'discuss';
  approverName: string;
  approverEmail: string;
  requestSubject: string;
  justification: string;
  categoryName: string;
  ownerName: string;
}) {
  const [intent, setIntent] = useState<'approve' | 'reject' | 'discuss'>(initialIntent);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (intent === 'discuss' && !comment.trim()) {
      setErrorMsg('Comment is required when requesting a discussion.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      await confirmEmailAction(tenantSubdomain, token, intent, comment);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'An unexpected error occurred.');
    }
  };

  if (status === 'success') {
    const successTitle = intent === 'approve' ? 'Request Approved' : intent === 'reject' ? 'Request Rejected' : 'Discussion Requested';
    const successMessage = intent === 'discuss' 
      ? 'The requester has been notified, and the request status is updated to in discussion.' 
      : 'Your decision has been recorded, and the approval chain has been updated.';
    const successColor = intent === 'approve' ? 'text-green-600' : intent === 'reject' ? 'text-red-600' : 'text-amber-600';
    const Icon = intent === 'approve' ? CheckCircle : intent === 'reject' ? AlertTriangle : MessageSquare;

    return (
      <div className="bg-white border border-gray-100 shadow-xl rounded-3xl p-8 max-w-lg mx-auto text-center space-y-6 animate-fade-in font-body">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-gray-50 flex items-center justify-center">
            <Icon className={`w-16 h-16 ${successColor}`} />
          </div>
        </div>
        <h2 className="text-2xl font-display font-black text-ink">{successTitle}</h2>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">{successMessage}</p>
        <div className="pt-4">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">You can safely close this window now.</p>
        </div>
      </div>
    );
  }

  const btnColor = intent === 'approve' 
    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
    : intent === 'reject' 
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
    : 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500';

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 shadow-xl rounded-3xl p-6 md:p-8 max-w-2xl mx-auto space-y-8 font-body">
      <div className="border-b pb-5">
        <h2 className="text-xl font-display font-black text-ink">Confirm Decision</h2>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-accent" />
          Acting as: <span className="text-ink font-bold">{approverName} ({approverEmail})</span>
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* Request Details Read Only */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
          <div className="bg-gray-50/50 p-3 rounded-xl">
            <span className="block text-xxs text-gray-400 uppercase tracking-wider">Subject</span>
            <span className="text-ink mt-0.5 block">{requestSubject}</span>
          </div>
          <div className="bg-gray-50/50 p-3 rounded-xl">
            <span className="block text-xxs text-gray-400 uppercase tracking-wider">Category</span>
            <span className="text-ink mt-0.5 block">{categoryName}</span>
          </div>
          <div className="bg-gray-50/50 p-3 rounded-xl">
            <span className="block text-xxs text-gray-400 uppercase tracking-wider">Raised By</span>
            <span className="text-ink mt-0.5 block">{ownerName}</span>
          </div>
        </div>

        <div className="bg-gray-50/50 p-3.5 rounded-xl text-xs">
          <span className="block text-xxs text-gray-400 font-bold uppercase tracking-wider mb-1.5">Justification Summary</span>
          <div className="text-gray-600 leading-relaxed max-h-48 overflow-y-auto">{justification}</div>
        </div>
      </div>

      {/* Action Selector */}
      <div className="space-y-2">
        <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
          Select Your Action
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => { setIntent('approve'); setErrorMsg(''); }}
            className={`py-3 px-4 rounded-xl text-xs font-bold text-center border transition flex flex-col items-center gap-1.5 ${
              intent === 'approve' 
                ? 'bg-green-50/50 border-green-200 text-green-700 ring-2 ring-green-600/20' 
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <CheckCircle className="w-5 h-5 text-green-600" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => { setIntent('reject'); setErrorMsg(''); }}
            className={`py-3 px-4 rounded-xl text-xs font-bold text-center border transition flex flex-col items-center gap-1.5 ${
              intent === 'reject' 
                ? 'bg-red-50/50 border-red-200 text-red-700 ring-2 ring-red-600/20' 
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Reject
          </button>
          <button
            type="button"
            onClick={() => { setIntent('discuss'); setErrorMsg(''); }}
            className={`py-3 px-4 rounded-xl text-xs font-bold text-center border transition flex flex-col items-center gap-1.5 ${
              intent === 'discuss' 
                ? 'bg-amber-50/50 border-amber-200 text-amber-700 ring-2 ring-amber-500/20' 
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-5 h-5 text-amber-500" />
            Discuss
          </button>
        </div>
      </div>

      {/* Comment Section */}
      <div className="space-y-1.5">
        <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
          Decision Comment {intent === 'discuss' ? <span className="text-red-500 font-bold">*</span> : <span className="text-gray-400 font-medium">(Optional)</span>}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={intent === 'discuss' ? 'Provide context for discussion...' : 'Add details about your decision...'}
          maxLength={750}
          required={intent === 'discuss'}
          rows={3}
          className="block w-full rounded-xl border border-gray-200 py-2.5 px-3 text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition font-medium"
        />
        <div className="flex justify-between items-center text-3xs text-gray-400 font-bold uppercase tracking-wider">
          <span>{comment.length} / 750 characters</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className={`w-full inline-flex items-center justify-center text-white py-3 px-4 rounded-xl text-xs font-bold transition transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${btnColor} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md`}
      >
        {status === 'loading' ? 'Recording Decision...' : intent === 'discuss' ? 'Request Discussion' : 'Confirm Action'}
      </button>
    </form>
  );
}
