'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { onboardTenantAction } from '../actions';
import { PlusCircle, CheckCircle2, AlertTriangle, Building2, User, Mail, Globe, Shield } from 'lucide-react';

export default function OnboardTenantForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [plan, setPlan] = useState('pro');
  const [region, setRegion] = useState('ap-south-2');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await onboardTenantAction({
        name,
        subdomain,
        adminName,
        adminEmail,
        plan,
        region,
      });

      if (!res.success) {
        setError(res.error || 'Failed to onboard tenant.');
        return;
      }

      setSuccess(`Organization "${name}" successfully onboarded! Workspace URL: /${subdomain}`);
      setName('');
      setSubdomain('');
      setAdminName('');
      setAdminEmail('');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleOnboard} className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Organization Info */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Tenant Organization Metadata
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#94A3B8] uppercase">Company / Organization Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corporation"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!subdomain) {
                  setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F172A] border border-[#334155] text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#94A3B8] uppercase">Subdomain / Workspace Path</label>
            <div className="flex items-center rounded-xl bg-[#0F172A] border border-[#334155] overflow-hidden px-3">
              <span className="text-xs text-[#94A3B8] font-mono">sigma-go.vercel.app/</span>
              <input
                type="text"
                required
                placeholder="acme"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full py-2.5 bg-transparent text-[#38BDF8] font-mono text-xs font-bold focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Initial Admin Credentials */}
      <div className="space-y-4 pt-4 border-t border-[#334155]">
        <h3 className="text-xs font-bold text-[#10B981] uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4" />
          Primary Tenant Admin Contact
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#94A3B8] uppercase">Admin Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F172A] border border-[#334155] text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#94A3B8] uppercase">Admin Email Address</label>
            <input
              type="email"
              required
              placeholder="admin@acme.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F172A] border border-[#334155] text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
          </div>
        </div>
      </div>

      {/* Plan & Deployment Region */}
      <div className="space-y-4 pt-4 border-t border-[#334155]">
        <h3 className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Subscription Plan & Hosting Region
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#94A3B8] uppercase">Subscription Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F172A] border border-[#334155] text-white text-xs font-bold focus:outline-none"
            >
              <option value="free">Free Starter Plan</option>
              <option value="pro">Pro Business (Unlimited Workflows)</option>
              <option value="enterprise">Enterprise Sealed Governance</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#94A3B8] uppercase">AWS / Cloud Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F172A] border border-[#334155] text-white text-xs font-bold focus:outline-none"
            >
              <option value="ap-south-2">Asia Pacific (Hyderabad - ap-south-2)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore - ap-southeast-1)</option>
              <option value="us-east-1">US East (N. Virginia - us-east-1)</option>
              <option value="eu-central-1">Europe (Frankfurt - eu-central-1)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-[#334155]">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#0F172A] font-extrabold text-xs shadow-md transition disabled:opacity-50"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>{loading ? 'Provisioning Tenant...' : 'Onboard Organization'}</span>
        </button>
      </div>
    </form>
  );
}
