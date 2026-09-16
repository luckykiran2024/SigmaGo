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

  const [showLogoConfirm, setShowLogoConfirm] = useState(false);

  const handleLogoRemove = async () => {
    setUploading(true);
    setMsg(null);
    try {
      await removeTenantLogoAction(tenantData.id);
      setLogoUrl(null);
      setLogoConfirmOpen(false);
      setMsg({ type: 'success', text: 'Logo removed successfully.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to remove logo' });
    } finally {
      setUploading(false);
    }
  };
  const [logoConfirmOpen, setLogoConfirmOpen] = useState(false);


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
    <form onSubmit={handleSaveSettings} className="space-y-6 font-sans">
      {msg && (
        <div className={`p-3.5 rounded-lg border text-xs font-semibold ${
          msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {msg.text}
        </div>
      )}

      {/* SECTION 1 - ORGANIZATION PROFILE */}
      <div className="bg-white border border-[#DDE5EC] shadow-xs rounded-xl p-5 sm:p-6 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-[#012F6B] font-sans flex items-center gap-2">
            <Building className="w-4 h-4 text-[#059DB0]" />
            Organization Profile
          </h3>
          <p className="text-xs text-[#526377] mt-0.5 font-medium">Configure company display names, branding, and details.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#132238]">
              Tenant Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="appearance-none block w-full px-3 py-2 border border-[#DDE5EC] rounded-lg shadow-xs text-[#132238] placeholder-[#8190A0] focus:outline-none focus:ring-2 focus:ring-[#059DB0]/20 focus:border-[#059DB0] transition text-xs font-medium bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#132238]">
              Subdomain (Read-only)
            </label>
            <input
              type="text"
              value={tenantData.subdomain}
              readOnly
              className="appearance-none block w-full px-3 py-2 border border-[#DDE5EC] rounded-lg shadow-none text-[#8190A0] text-xs font-mono bg-[#F7FAFC] cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#132238]">
              Branding Logo (PNG/JPG/SVG, max 2MB)
            </label>
            
            <div className="flex items-center gap-4">
              <div className="w-20 h-12 bg-[#F7FAFC] border border-[#DDE5EC] rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo preview" className="max-h-full max-w-full object-contain p-1" />
                ) : (
                  <span className="text-[10px] font-bold text-[#8190A0] uppercase tracking-wider">No logo</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#DDE5EC] hover:bg-[#F7FAFC] text-[#526377] hover:text-[#012F6B] rounded-lg text-xs font-semibold cursor-pointer transition shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-[#059DB0]" />
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
                    <>
                      <button
                        type="button"
                        onClick={() => setLogoConfirmOpen(true)}
                        disabled={uploading}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition border border-rose-200"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>

                      {logoConfirmOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                          <div className="bg-white rounded-xl shadow-lg border border-[#DDE5EC] max-w-xs w-full p-5 space-y-4">
                            <h4 className="text-sm font-bold text-[#132238]">Remove Tenant Logo?</h4>
                            <p className="text-xs text-[#526377] font-medium">Are you sure you want to remove the organization logo?</p>
                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#DDE5EC]">
                              <button
                                type="button"
                                onClick={() => setLogoConfirmOpen(false)}
                                className="px-3 py-1.5 border border-[#DDE5EC] text-[#526377] rounded-lg text-xs font-semibold hover:bg-[#F7FAFC]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleLogoRemove}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                              >
                                Confirm Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {uploading && (
                  <span className="text-xs font-semibold text-[#059DB0] animate-pulse">Uploading file...</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#132238]">
              Created Date (Read-only)
            </label>
            <input
              type="text"
              value={formatDate(tenantData.created_at)}
              readOnly
              className="appearance-none block w-full px-3 py-2 border border-[#DDE5EC] rounded-lg shadow-none text-[#8190A0] text-xs font-mono bg-[#F7FAFC] cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2 - NOTIFICATION & SLA POLICY */}
      <div className="bg-white border border-[#DDE5EC] shadow-xs rounded-xl p-5 sm:p-6 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-[#012F6B] font-sans flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#059DB0]" />
            Notification & SLA Policy
          </h3>
          <p className="text-xs text-[#526377] mt-0.5 font-medium">Configure overdue reminders, cadence, and default limits.</p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-[#132238] cursor-pointer">
            <input
              type="checkbox"
              checked={remindersEnabled}
              onChange={(e) => setRemindersEnabled(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-[#059DB0] border-[#DDE5EC] focus:ring-[#059DB0]"
            />
            Send automated overdue reminders to pending approvers
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#132238]">
              Send first reminder after (Hours)
            </label>
            <input
              type="number"
              value={reminderDelay}
              onChange={(e) => setReminderDelay(Number(e.target.value))}
              disabled={!remindersEnabled}
              min={1}
              required
              className="appearance-none block w-full px-3 py-2 border border-[#DDE5EC] rounded-lg shadow-xs text-[#132238] placeholder-[#8190A0] focus:outline-none focus:ring-2 focus:ring-[#059DB0]/20 focus:border-[#059DB0] transition text-xs font-medium bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#132238]">
              Repeat reminder interval (Hours)
            </label>
            <input
              type="number"
              value={reminderInterval}
              onChange={(e) => setReminderInterval(Number(e.target.value))}
              disabled={!remindersEnabled}
              min={1}
              required
              className="appearance-none block w-full px-3 py-2 border border-[#DDE5EC] rounded-lg shadow-xs text-[#132238] placeholder-[#8190A0] focus:outline-none focus:ring-2 focus:ring-[#059DB0]/20 focus:border-[#059DB0] transition text-xs font-medium bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#132238]">
              Blocked Request Alerts
            </label>
            <select
              value={blockedAlerts}
              onChange={(e) => setBlockedAlerts(e.target.value)}
              className="block w-full rounded-lg border border-[#DDE5EC] py-2 px-3 text-[#132238] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#059DB0]/20 focus:border-[#059DB0] transition font-medium"
            >
              <option value="owner_only">Notify Request Owner Only</option>
              <option value="owner_and_admins">Notify Owner + All Admins</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#132238]">
              Default Category SLA (Hours)
            </label>
            <input
              type="number"
              value={defaultSla}
              onChange={(e) => setDefaultSla(Number(e.target.value))}
              min={1}
              required
              className="appearance-none block w-full px-3 py-2 border border-[#DDE5EC] rounded-lg shadow-xs text-[#132238] placeholder-[#8190A0] focus:outline-none focus:ring-2 focus:ring-[#059DB0]/20 focus:border-[#059DB0] transition text-xs font-medium bg-white"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3 - APPROVAL POLICY */}
      <div className="bg-white border border-[#DDE5EC] shadow-xs rounded-xl p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#012F6B] font-sans flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#059DB0]" />
            Approval Policy (Read-Only)
          </h3>
          <p className="text-xs text-[#526377] mt-0.5 font-medium">Platform-enforced policies and business safety rules.</p>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-3 bg-[#F7FAFC] border border-[#DDE5EC] rounded-lg text-xs font-semibold text-[#526377]">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#8190A0]" />
              <span>Self-approvals: Requesters cannot approve their own requests</span>
            </div>
            <span className="text-[10px] bg-[#F1FBFC] text-[#012F6B] border border-[#DDE5EC] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Enforced</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#F7FAFC] border border-[#DDE5EC] rounded-lg text-xs font-semibold text-[#526377]">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#8190A0]" />
              <span>Workflow locks: Enforce locked chains per category workflow definition</span>
            </div>
            <Link
              href={`/${tenantSubdomain}/admin/workflows`}
              className="text-[11px] text-[#059DB0] hover:text-[#078899] flex items-center gap-1 font-bold"
            >
              View Workflows
              <Eye className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 4 - COMING SOON */}
      <div className="bg-white border border-[#DDE5EC] shadow-xs rounded-xl p-5 sm:p-6 space-y-4 opacity-75">
        <div>
          <h3 className="text-sm font-bold text-[#526377] font-sans flex items-center gap-2">
            <Key className="w-4 h-4 text-[#8190A0]" />
            Roadmap & Compliance
          </h3>
          <p className="text-xs text-[#8190A0] mt-0.5 font-medium">Upcoming security, single sign-on, and compliance features.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[
            { name: 'SSO Single Sign-On', desc: 'Google Workspace & Azure Active Directory SAML integrations' },
            { name: '2FA Multi-Factor Auth', desc: 'Enforce secondary TOTP authenticator requirements' },
            { name: 'Session Timeout Policies', desc: 'Enforce absolute session logout after absence intervals' },
            { name: 'Audit Log Exports', desc: 'CSV/JSON compliance exports of activity registers' }
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 border border-[#DDE5EC] rounded-lg bg-[#F7FAFC] flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-[#526377]">{item.name}</h4>
                <p className="text-[11px] text-[#8190A0] font-normal leading-relaxed">{item.desc}</p>
              </div>
              <span className="text-[9px] bg-white text-[#8190A0] border border-[#DDE5EC] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
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
          className="inline-flex items-center justify-center px-5 py-2.5 bg-[#012F6B] hover:bg-[#033E79] text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving changes...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
