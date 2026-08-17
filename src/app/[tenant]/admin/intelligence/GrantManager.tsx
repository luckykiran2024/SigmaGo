"use client";

import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Key, UserCheck, AlertCircle, Plus, Trash2, Clock, Eye } from 'lucide-react';
import { issueIntelligenceGrant, revokeIntelligenceGrant, IntelligenceScope } from '@/lib/intelligence/access';

interface GrantRecord {
  id: string;
  email: string;
  scope: string;
  granted_by: string;
  granted_at: string;
  reason: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  revoke_reason?: string | null;
  access_count: number;
  last_accessed_at?: string | null;
}

interface GrantManagerProps {
  grants: GrantRecord[];
  tenantId: string;
  adminUserId: string;
}

export default function GrantManager({ grants: initialGrants, tenantId, adminUserId }: GrantManagerProps) {
  const [grants, setGrants] = useState<GrantRecord[]>(initialGrants);
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState('');
  const [scope, setScope] = useState<IntelligenceScope>('AGGREGATE_ONLY');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleIssueGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (reason.trim().length < 20) {
      setError('Business reason must be at least 20 characters long.');
      return;
    }

    setLoading(true);

    try {
      const newGrant = await issueIntelligenceGrant({
        tenantId,
        email,
        scope,
        grantedBy: adminUserId,
        reason,
        expiresAt: expiresAt || null,
      });

      setGrants([newGrant, ...grants.filter(g => g.email !== newGrant.email)]);
      setSuccess(`Intelligence grant successfully issued to ${email}`);
      setShowAddModal(false);
      setEmail('');
      setReason('');
      setExpiresAt('');
    } catch (err: any) {
      setError(err.message || 'Failed to issue grant');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (grantId: string, email: string) => {
    const revokeReason = prompt(`Enter mandatory revocation reason for ${email}:`);
    if (!revokeReason || revokeReason.trim().length < 10) {
      alert('Revocation requires a reason of at least 10 characters.');
      return;
    }

    try {
      const revoked = await revokeIntelligenceGrant({
        grantId,
        tenantId,
        revokedBy: adminUserId,
        revokeReason,
      });

      setGrants(grants.map(g => (g.id === grantId ? revoked : g)));
    } catch (err: any) {
      alert(err.message || 'Failed to revoke grant');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Active Grants
          </div>
          <p className="text-3xl font-extrabold text-gray-900 font-sans">
            {grants.filter(g => !g.revoked_at).length}
          </p>
          <p className="text-xs text-gray-500 font-medium">Decoupled from role templates</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider">
            <Key className="w-4 h-4 text-blue-600" /> Full Scope Grants
          </div>
          <p className="text-3xl font-extrabold text-gray-900 font-sans">
            {grants.filter(g => !g.revoked_at && g.scope === 'FULL').length}
          </p>
          <p className="text-xs text-gray-500 font-medium">Includes decision drill-through</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-amber-600" /> Aggregate Only
          </div>
          <p className="text-3xl font-extrabold text-gray-900 font-sans">
            {grants.filter(g => !g.revoked_at && g.scope === 'AGGREGATE_ONLY').length}
          </p>
          <p className="text-xs text-gray-500 font-medium">Small-number threshold suppressed</p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 font-sans tracking-tight">
            Intelligence Access Register
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Access to decision metrics is an explicit grant issued to normalized emails. Roles carry no inherent intelligence access.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Issue Intelligence Grant
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
          {success}
        </div>
      )}

      {/* Grant Register Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Recipient Email</th>
              <th className="py-3.5 px-4">Scope</th>
              <th className="py-3.5 px-4">Business Reason</th>
              <th className="py-3.5 px-4">Granted On</th>
              <th className="py-3.5 px-4">Access Count</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grants.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400 font-medium">
                  No intelligence grants issued yet.
                </td>
              </tr>
            ) : (
              grants.map((grant) => {
                const isRevoked = !!grant.revoked_at;
                const isExpired = grant.expires_at && new Date(grant.expires_at) <= new Date();

                return (
                  <tr key={grant.id} className={isRevoked || isExpired ? 'bg-gray-50/60 opacity-75' : ''}>
                    <td className="py-3.5 px-4 font-bold text-gray-900 font-mono">
                      {grant.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-extrabold text-3xs uppercase tracking-wider ${
                        grant.scope === 'FULL'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {grant.scope}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate" title={grant.reason}>
                      {grant.reason}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-medium">
                      {new Date(grant.granted_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-800">
                      {grant.access_count || 0} views
                    </td>
                    <td className="py-3.5 px-4">
                      {isRevoked ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-extrabold bg-red-100 text-red-800 uppercase">
                          Revoked
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-extrabold bg-gray-200 text-gray-700 uppercase">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!isRevoked && (
                        <button
                          onClick={() => handleRevoke(grant.id, grant.email)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-bold hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Issuing Grant */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-gray-900 font-sans">
              Issue Intelligence Access Grant
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleIssueGrant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. cfo@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <p className="text-2xs text-gray-400 mt-1">
                  Email will be normalized (lowercased and trimmed). Account creation not required beforehand.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Access Scope
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as IntelligenceScope)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="AGGREGATE_ONLY">AGGREGATE_ONLY — Counts & factors only (Small-number suppressed)</option>
                  <option value="FULL">FULL — Everything plus decision drill-through & notes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Business Justification (Min 20 Characters)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the audit or governance rationale for granting access..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
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
                  {loading ? 'Issuing...' : 'Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
