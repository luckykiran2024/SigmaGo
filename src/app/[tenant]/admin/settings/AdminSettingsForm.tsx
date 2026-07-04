'use client';

import { useState } from 'react';
import { uploadTenantLogoAction, removeTenantLogoAction, updateTenantSettingsAction } from './actions';
import { Building, Upload, ShieldCheck, AlertCircle, Trash2, Clock, Lock, Key, Eye } from 'lucide-react';
import Link from 'next/link';

interface TenantData {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  created_at: string;
  tenant_settings: any;
}

export default function AdminSettingsForm({
  tenantData,
  tenantSubdomain
}: {
  tenantData: TenantData;
  tenantSubdomain: string;
}) {
  const [name, setName] = useState(tenantData.name);
  const [logoUrl, setLogoUrl] = useState(tenantData.logo_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings states from JSONB or fallback defaults
  const settings = tenantData.tenant_settings || {};
  const [remindersEnabled, setRemindersEnabled] = useState(settings.reminders_enabled !== false);
  const [reminderDelay, setReminderDelay] = useState(settings.reminder_delay_hours || 48);
  const [reminderInterval, setReminderInterval] = useState(settings.reminder_interval_hours || 24);
  const [blockedAlerts, setBlockedAlerts] = useState(settings.blocked_alerts || 'owner_and_admins');
  const [defaultSla, setDefaultSla] = useState(settings.default_sla_hours || 48);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // File validation
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Logo size must be under 2MB' });
      return;
    }

    setUploading(true);
    setMsg(null);

    // Convert file to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result as string;
      const res = await uploadTenantLogoAction(tenantData.id, base64, file.type, file.name);
      setUploading(false);

      if (res.success && res.logoUrl) {
        setLogoUrl(res.logoUrl);
        setMsg({ type: 'success', text: 'Logo uploaded successfully. Refresh to see header update!' });
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to upload logo' });
      }
    };
    reader.onerror = (err) => {
      console.error(err);
      setUploading(false);
      setMsg({ type: 'error', text: 'Error reading file' });
    };
  };

  const handleLogoRemove = async () => {
    if (!confirm('Are you sure you want to remove the tenant logo?')) return;
    setUploading(true);
    setMsg(null);
    try {
      await removeTenantLogoAction(tenantData.id);
      setLogoUrl(null);
      setMsg({ type: 'success', text: 'Logo removed successfully.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to remove logo' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const updatedSettings = {
      reminders_enabled: remindersEnabled,
      reminder_delay_hours: Number(reminderDelay),
      reminder_interval_hours: Number(reminderInterval),
      blocked_alerts: blockedAlerts,
      default_sla_hours: Number(defaultSla)
    };

    try {
      await updateTenantSettingsAction(tenantData.id, name, updatedSettings);
      setMsg({ type: 'success', text: 'Settings updated successfully!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }).format(new Date(dateStr));
  };

  return (
    <form onSubmit={handleSaveSettings} className="space-y-8 font-body">
      {msg && (
        <div className={`p-4 rounded-xl border text-xs font-bold ${
          msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          {msg.text}
        </div>
      )}

      {/* SECTION 1 - ORGANIZATION PROFILE */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-ink font-display flex items-center gap-2">
            <Building className="w-5 h-5 text-accent" />
            Organization Profile
          </h3>
          <p className="text-xs text-gray-400 mt-1">Configure company display names, branding, and details.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Tenant Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-xs font-bold bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Subdomain (Read-only)
            </label>
            <input
              type="text"
              value={tenantData.subdomain}
              readOnly
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-100 rounded-xl shadow-none text-gray-400 sm:text-xs font-bold bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Branding Logo (PNG/JPG/SVG, max 2MB)
            </label>
            
            <div className="flex items-center gap-4">
              <div className="w-24 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo preview" className="max-h-full max-w-full object-contain p-1" />
                ) : (
                  <span className="text-3xs font-extrabold text-gray-300 uppercase tracking-wider">No logo</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-2xs font-bold cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-2xs font-bold transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
                {uploading && (
                  <span className="text-4xs font-bold text-accent animate-pulse">Uploading file...</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Created Date (Read-only)
            </label>
            <input
              type="text"
              value={formatDate(tenantData.created_at)}
              readOnly
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-100 rounded-xl shadow-none text-gray-400 sm:text-xs font-bold bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2 - NOTIFICATION & SLA POLICY */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-ink font-display flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Notification & SLA Policy
          </h3>
          <p className="text-xs text-gray-400 mt-1">Configure overdue reminders, cadence, and default limits.</p>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={remindersEnabled}
              onChange={(e) => setRemindersEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-accent border-gray-200 focus:ring-accent"
            />
            Send automated overdue reminders to pending approvers
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Send first reminder after (Hours)
            </label>
            <input
              type="number"
              value={reminderDelay}
              onChange={(e) => setReminderDelay(Number(e.target.value))}
              disabled={!remindersEnabled}
              min={1}
              required
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-xs font-bold bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Repeat reminder interval (Hours)
            </label>
            <input
              type="number"
              value={reminderInterval}
              onChange={(e) => setReminderInterval(Number(e.target.value))}
              disabled={!remindersEnabled}
              min={1}
              required
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-xs font-bold bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Blocked Request Alerts
            </label>
            <select
              value={blockedAlerts}
              onChange={(e) => setBlockedAlerts(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 py-2.5 px-3.5 text-ink text-xs bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition font-bold"
            >
              <option value="owner_only">Notify Request Owner Only</option>
              <option value="owner_and_admins">Notify Owner + All Admins</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Default Category SLA (Hours)
            </label>
            <input
              type="number"
              value={defaultSla}
              onChange={(e) => setDefaultSla(Number(e.target.value))}
              min={1}
              required
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-xs font-bold bg-white"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3 - APPROVAL POLICY */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-ink font-display flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            Approval Policy (Read-Only)
          </h3>
          <p className="text-xs text-gray-400 mt-1">Platform-enforced policies and business safety rules.</p>
        </div>

        <div className="space-y-3.5">
          <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              <span>Self-approvals: Requesters cannot approve their own requests</span>
            </div>
            <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-md uppercase tracking-wider">Enforced</span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              <span>Workflow locks: Enforce locked chains per category workflow definition</span>
            </div>
            <Link
              href={`/${tenantSubdomain}/admin/workflows`}
              className="text-[10px] text-accent hover:underline flex items-center gap-1 font-extrabold"
            >
              View Workflows
              <Eye className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 4 - COMING SOON */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-6 opacity-80">
        <div>
          <h3 className="text-base font-bold text-ink font-display flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-400" />
            Roadmap & Compliance
          </h3>
          <p className="text-xs text-gray-400 mt-1">Upcoming security, single sign-on, and compliance features.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'SSO Single Sign-On', desc: 'Google Workspace & Azure Active Directory SAML integrations' },
            { name: '2FA Multi-Factor Auth', desc: 'Enforce secondary TOTP authenticator requirements' },
            { name: 'Session Timeout Policies', desc: 'Enforce absolute session logout after absence intervals' },
            { name: 'Audit Log Exports', desc: 'CSV/JSON compliance exports of activity registers' }
          ].map((item, idx) => (
            <div key={idx} className="p-4 border border-gray-100 rounded-xl bg-gray-50/30 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-gray-500">{item.name}</h4>
                <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">{item.desc}</p>
              </div>
              <span className="text-[9px] bg-gray-100 text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button Footer */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center px-6 py-3 bg-accent hover:bg-accent-light text-white text-xs font-bold rounded-xl shadow-md shadow-accent/15 transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving changes...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
