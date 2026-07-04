'use client';

import { useState } from 'react';
import { uploadUserAvatarAction, removeUserAvatarAction, updateProfileAndSettingsAction, changeUserPasswordAction } from './actions';
import { User, Upload, Trash2, Key, Bell, Shield, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface UserData {
  id: string;
  name: string;
  email: string;
  designation: string | null;
  employee_id: string | null;
  avatar_url: string | null;
  user_settings: any;
}

export default function PersonalSettingsForm({
  userData,
  tenantSubdomain
}: {
  userData: UserData;
  tenantSubdomain: string;
}) {
  const [name, setName] = useState(userData.name);
  const [avatarUrl, setAvatarUrl] = useState(userData.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Notification states
  const settings = userData.user_settings || {};
  const [actionNeededEmails, setActionNeededEmails] = useState(settings.action_needed_emails !== false);
  const [fyiEmails, setFyiEmails] = useState(settings.fyi_emails !== false);
  const [overdueReminders, setOverdueReminders] = useState(settings.overdue_reminders !== false);

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Avatar size must be under 2MB' });
      return;
    }

    setUploading(true);
    setMsg(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result as string;
      const res = await uploadUserAvatarAction(userData.id, base64, file.type, file.name);
      setUploading(false);

      if (res.success && res.avatarUrl) {
        setAvatarUrl(res.avatarUrl);
        setMsg({ type: 'success', text: 'Avatar updated successfully!' });
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to upload avatar' });
      }
    };
    reader.onerror = () => {
      setUploading(false);
      setMsg({ type: 'error', text: 'Error reading file' });
    };
  };

  const handleAvatarRemove = async () => {
    if (!confirm('Are you sure you want to remove your avatar?')) return;
    setUploading(true);
    setMsg(null);
    try {
      await removeUserAvatarAction(userData.id);
      setAvatarUrl(null);
      setMsg({ type: 'success', text: 'Avatar removed successfully.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to remove avatar' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setMsg(null);

    const updatedSettings = {
      action_needed_emails: actionNeededEmails,
      fyi_emails: fyiEmails,
      overdue_reminders: overdueReminders
    };

    try {
      await updateProfileAndSettingsAction(userData.id, name, updatedSettings);
      setMsg({ type: 'success', text: 'Profile and preferences updated successfully!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    setChangingPassword(true);
    const res = await changeUserPasswordAction(currentPassword, newPassword);
    setChangingPassword(false);

    if (res.success) {
      setPwdMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPwdMsg({ type: 'error', text: res.error || 'Failed to change password' });
    }
  };

  return (
    <div className="space-y-8 font-body max-w-4xl mx-auto">
      {/* SECTION 1 - PROFILE SETTINGS */}
      <form onSubmit={handleSaveProfile} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-ink font-display flex items-center gap-2">
            <User className="w-5 h-5 text-accent" />
            My Profile
          </h3>
          <p className="text-xs text-gray-400 mt-1">Manage your identity, job info, and notification preferences.</p>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl border text-xs font-bold ${
            msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {msg.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-gray-50">
          <div className="w-20 h-20 rounded-full bg-accent/5 border border-accent/15 flex items-center justify-center font-bold text-accent text-2xl overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
            ) : (
              name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-2xs font-bold cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                Upload Photo
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-2xs font-bold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
            {uploading && (
              <span className="text-4xs font-bold text-accent animate-pulse">Uploading photo...</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Display Name
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
              Email Address (Read-only)
            </label>
            <input
              type="text"
              value={userData.email}
              readOnly
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-100 rounded-xl shadow-none text-gray-400 sm:text-xs font-bold bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Designation (Read-only)
            </label>
            <input
              type="text"
              value={userData.designation || 'Staff'}
              readOnly
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-100 rounded-xl shadow-none text-gray-400 sm:text-xs font-bold bg-gray-50 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Employee ID (Read-only)
            </label>
            <input
              type="text"
              value={userData.employee_id || 'N/A'}
              readOnly
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-100 rounded-xl shadow-none text-gray-400 sm:text-xs font-bold bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>

        {/* SECTION 3 - NOTIFICATION PREFERENCES */}
        <div className="border-t border-gray-100 pt-6 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-ink font-display flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" />
              Email Notification Preferences
            </h4>
            <p className="text-xxs text-gray-400 mt-0.5">Control when you receive transactional system notifications.</p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={actionNeededEmails}
                  onChange={(e) => setActionNeededEmails(e.target.checked)}
                  className="w-4 h-4 rounded text-accent border-gray-200 focus:ring-accent"
                />
                Receive "Action Needed" approval requests
              </label>
              {!actionNeededEmails && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg max-w-fit">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Warning: You will not receive email-based quick approval links if this is disabled.
                </div>
              )}
            </div>

            <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={fyiEmails}
                onChange={(e) => setFyiEmails(e.target.checked)}
                className="w-4 h-4 rounded text-accent border-gray-200 focus:ring-accent"
              />
              Receive FYI / Reference notifications
            </label>

            <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={overdueReminders}
                onChange={(e) => setOverdueReminders(e.target.checked)}
                className="w-4 h-4 rounded text-accent border-gray-200 focus:ring-accent"
              />
              Receive overdue pending SLA reminders
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-50">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-accent hover:bg-accent-light text-white text-xs font-bold rounded-xl shadow-md shadow-accent/15 transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150 disabled:opacity-50"
          >
            {savingProfile ? 'Saving profile...' : 'Save Profile & Preferences'}
          </button>
        </div>
      </form>

      {/* SECTION 2 - CHANGE PASSWORD */}
      <form onSubmit={handleChangePassword} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-ink font-display flex items-center gap-2">
            <Key className="w-5 h-5 text-accent" />
            Security & Password
          </h3>
          <p className="text-xs text-gray-400 mt-1">Keep your account credentials updated.</p>
        </div>

        {pwdMsg && (
          <div className={`p-4 rounded-xl border text-xs font-bold ${
            pwdMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {pwdMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-xs font-bold bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-xs font-bold bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xxs font-bold text-gray-400 uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="appearance-none block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-xs font-bold bg-white"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-50">
          <button
            type="submit"
            disabled={changingPassword}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-accent hover:bg-accent-light text-white text-xs font-bold rounded-xl shadow-md shadow-accent/15 transition transform hover:-translate-y-0.5 active:translate-y-0 duration-150 disabled:opacity-50"
          >
            {changingPassword ? 'Updating password...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* SECTION 4 - MY DELEGATIONS LINK */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-ink font-display flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Approval Authority & Delegations
          </h3>
          <p className="text-xs text-gray-400 mt-1">Delegate your signing authority to another coworker.</p>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
          <span className="text-xs font-bold text-gray-600">You currently have delegations rules configured.</span>
          <Link
            href={`/${tenantSubdomain}/delegations`}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 hover:text-ink rounded-xl text-xs font-bold shadow-2xs transition"
          >
            Configure Delegations
          </Link>
        </div>
      </div>
    </div>
  );
}
