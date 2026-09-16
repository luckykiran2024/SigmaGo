'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadUserAvatarAction, removeUserAvatarAction, updateProfileAndSettingsAction, changeUserPasswordAction } from './actions';
import { useTheme, ThemeMode } from '@/components/providers/ThemeProvider';
import { User, Upload, Trash2, Key, Bell, Shield, AlertTriangle, Palette, Check, Sun, Moon } from 'lucide-react';
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
  const router = useRouter();
  const { theme, setTheme } = useTheme();
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

  const themeOptions: { id: ThemeMode; label: string; description: string; bg: string; brand: string }[] = [
    {
      id: 'light',
      label: 'Light Mode',
      description: 'Clean default interface with high legibility.',
      bg: 'bg-white border-gray-200 text-gray-900',
      brand: 'bg-[#274C77]'
    },
    {
      id: 'dark',
      label: 'Dark Slate',
      description: 'Sleek dark theme reducing eye strain in low light.',
      bg: 'bg-[#0F172A] border-gray-700 text-white',
      brand: 'bg-[#38BDF8]'
    },
    {
      id: 'midnight',
      label: 'Midnight Blue',
      description: 'Deep navy background with indigo accents.',
      bg: 'bg-[#0B0F19] border-indigo-900 text-indigo-100',
      brand: 'bg-[#6366F1]'
    },
    {
      id: 'forest',
      label: 'Emerald Forest',
      description: 'Modern cyber teal and dark emerald theme.',
      bg: 'bg-[#061814] border-emerald-900 text-emerald-100',
      brand: 'bg-[#10B981]'
    }
  ];

  const handleThemeSelect = (selectedTheme: ThemeMode) => {
    setTheme(selectedTheme);
    // Also save into user_settings in database
    const updatedSettings = {
      ...settings,
      theme: selectedTheme,
      action_needed_emails: actionNeededEmails,
      fyi_emails: fyiEmails,
      overdue_reminders: overdueReminders
    };
    updateProfileAndSettingsAction(userData.id, name, updatedSettings).catch(console.error);
  };

function compressImageToAvatar(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400; // 400x400 max avatar dimension
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ base64: event.target?.result as string, mimeType: file.type });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = 'image/png';
        const compressedBase64 = canvas.toDataURL(mimeType, 0.9);
        resolve({ base64: compressedBase64, mimeType });
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (file.size > 10 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Avatar file size must be under 10MB' });
      return;
    }

    setUploading(true);
    setMsg(null);

    try {
      const { base64, mimeType } = await compressImageToAvatar(file);
      const res = await uploadUserAvatarAction(userData.id, base64, mimeType, file.name);
      setUploading(false);

      if (res.success && res.avatarUrl) {
        setAvatarUrl(res.avatarUrl);
        setMsg({ type: 'success', text: 'Display picture updated successfully!' });
        router.refresh();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to upload display picture' });
      }
    } catch (err: any) {
      setUploading(false);
      setMsg({ type: 'error', text: err.message || 'Error processing photo file' });
    }
  };

  const [avatarConfirmOpen, setAvatarConfirmOpen] = useState(false);

  const handleAvatarRemove = async () => {
    setUploading(true);
    setMsg(null);
    try {
      await removeUserAvatarAction(userData.id);
      setAvatarUrl(null);
      setAvatarConfirmOpen(false);
      setMsg({ type: 'success', text: 'Display picture removed successfully.' });
      router.refresh();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to remove display picture' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setMsg(null);

    const updatedSettings = {
      ...settings,
      theme,
      action_needed_emails: actionNeededEmails,
      fyi_emails: fyiEmails,
      overdue_reminders: overdueReminders
    };

    try {
      await updateProfileAndSettingsAction(userData.id, name, updatedSettings);
      setMsg({ type: 'success', text: 'Profile and preferences updated successfully!' });
      router.refresh();
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
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      {/* SECTION 1 - PROFILE SETTINGS */}
      <form onSubmit={handleSaveProfile} className="bg-white border border-[#DDE5EC] shadow-xs rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-[#132238] font-sans flex items-center gap-2">
            <User className="w-4 h-4 text-[#012F6B]" />
            My Profile
          </h3>
          <p className="text-xs text-[#8190A0] mt-0.5">Manage your identity, job info, and notification preferences.</p>
        </div>

        {msg && (
          <div className={`p-3.5 rounded-lg border text-xs font-medium ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {msg.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-6 pb-5 border-b border-[#F3F6F8]">
          <div className="w-16 h-16 rounded-lg bg-[#F3F6F8] border border-[#DDE5EC] flex items-center justify-center font-bold text-[#012F6B] text-xl overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
            ) : (
              name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#DDE5EC] hover:bg-[#F7FAFC] text-[#132238] rounded-lg text-xs font-medium cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-[#526377]" />
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
                <>
                  <button
                    type="button"
                    onClick={() => setAvatarConfirmOpen(true)}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-medium transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>

                  {avatarConfirmOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07182F]/40 backdrop-blur-xs p-4">
                      <div className="bg-white rounded-xl shadow-lg border border-[#DDE5EC] max-w-xs w-full p-5 space-y-4">
                        <h4 className="text-sm font-bold text-[#132238]">Remove Display Picture?</h4>
                        <p className="text-xs text-[#526377] font-normal leading-relaxed">Are you sure you want to remove your profile picture?</p>
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setAvatarConfirmOpen(false)}
                            className="px-3 py-1.5 border border-[#DDE5EC] text-[#526377] hover:bg-[#F7FAFC] rounded-lg text-xs font-medium transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAvatarRemove}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition"
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
              <span className="text-xs font-medium text-[#059DB0] animate-pulse">Uploading photo...</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#526377]">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="appearance-none block w-full px-3 py-2 border border-[#DDE5EC] rounded-lg shadow-2xs text-[#132238] placeholder-[#8190A0] focus:outline-none focus:ring-2 focus:ring-[#059DB0]/20 focus:border-[#059DB0] transition sm:text-xs font-medium bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#8190A0]">
              Email Address (Read-only)
            </label>
            <input
              type="text"
              value={userData.email}
              readOnly
              className="appearance-none block w-full px-3 py-2 border border-[#EAF0F4] rounded-lg shadow-none text-[#8190A0] sm:text-xs font-medium bg-[#F7FAFC] cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#8190A0]">
              Designation (Read-only)
            </label>
            <input
              type="text"
              value={userData.designation || 'Staff'}
              readOnly
              className="appearance-none block w-full px-3 py-2 border border-[#EAF0F4] rounded-lg shadow-none text-[#8190A0] sm:text-xs font-medium bg-[#F7FAFC] cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#8190A0]">
              Employee ID (Read-only)
            </label>
            <input
              type="text"
              value={userData.employee_id || 'N/A'}
              readOnly
              className="appearance-none block w-full px-3 py-2 border border-[#EAF0F4] rounded-lg shadow-none text-[#8190A0] sm:text-xs font-medium bg-[#F7FAFC] cursor-not-allowed"
            />
          </div>
        </div>

        {/* SECTION 3 - NOTIFICATION PREFERENCES */}
        <div className="border-t border-[#F3F6F8] pt-5 space-y-3.5">
          <div>
            <h4 className="text-xs font-bold text-[#132238] font-sans flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-[#012F6B]" />
              Email Notification Preferences
            </h4>
            <p className="text-[11px] text-[#8190A0] mt-0.5">Control when you receive transactional system notifications.</p>
          </div>

          <div className="space-y-2.5">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2.5 text-xs font-medium text-[#132238] cursor-pointer">
                <input
                  type="checkbox"
                  checked={actionNeededEmails}
                  onChange={(e) => setActionNeededEmails(e.target.checked)}
                  className="w-4 h-4 rounded text-[#012F6B] border-[#DDE5EC] focus:ring-[#059DB0]"
                />
                Receive "Action Needed" approval requests
              </label>
              {!actionNeededEmails && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg max-w-fit">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  Warning: You will not receive email-based quick approval links if this is disabled.
                </div>
              )}
            </div>

            <label className="flex items-center gap-2.5 text-xs font-medium text-[#132238] cursor-pointer">
              <input
                type="checkbox"
                checked={fyiEmails}
                onChange={(e) => setFyiEmails(e.target.checked)}
                className="w-4 h-4 rounded text-[#012F6B] border-[#DDE5EC] focus:ring-[#059DB0]"
              />
              Receive FYI / Reference notifications
            </label>

            <label className="flex items-center gap-2.5 text-xs font-medium text-[#132238] cursor-pointer">
              <input
                type="checkbox"
                checked={overdueReminders}
                onChange={(e) => setOverdueReminders(e.target.checked)}
                className="w-4 h-4 rounded text-[#012F6B] border-[#DDE5EC] focus:ring-[#059DB0]"
              />
              Receive overdue pending SLA reminders
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#F3F6F8]">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center justify-center px-4 py-2 bg-[#012F6B] hover:bg-[#033E79] text-white text-xs font-bold rounded-lg shadow-2xs transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingProfile ? 'Saving profile...' : 'Save Profile & Preferences'}
          </button>
        </div>
      </form>

      {/* SECTION - THEME & APPEARANCE */}
      <div className="bg-white border border-[#DDE5EC] shadow-xs rounded-xl p-6 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-[#132238] font-sans flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#012F6B]" />
            Theme & Appearance
          </h3>
          <p className="text-xs text-[#8190A0] mt-0.5">Customize the visual mode and contrast profile.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleThemeSelect(opt.id)}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${opt.bg} ${
                  isSelected
                    ? 'ring-2 ring-[#059DB0] border-transparent shadow-xs'
                    : 'hover:border-[#DDE5EC] hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full ${opt.brand}`} />
                    <span className="text-xs font-bold font-sans">{opt.label}</span>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-[#059DB0] text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] opacity-75 font-normal leading-relaxed">
                  {opt.description}
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="h-1 w-10 rounded-full opacity-40 bg-current" />
                  <div className="h-1 w-5 rounded-full opacity-20 bg-current" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2 - CHANGE PASSWORD */}
      <form onSubmit={handleChangePassword} className="bg-white border border-[#DDE5EC] shadow-xs rounded-xl p-6 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-[#132238] font-sans flex items-center gap-2">
            <Key className="w-4 h-4 text-[#012F6B]" />
            Security & Password
          </h3>
          <p className="text-xs text-[#8190A0] mt-0.5">Keep your account credentials updated.</p>
        </div>

        {pwdMsg && (
          <div className={`p-3.5 rounded-lg border text-xs font-medium ${
            pwdMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {pwdMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#526377]">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="appearance-none block w-full px-3 py-2 border border-[#DDE5EC] rounded-lg shadow-2xs text-[#132238] placeholder-[#8190A0] focus:outline-none focus:ring-2 focus:ring-[#059DB0]/20 focus:border-[#059DB0] transition sm:text-xs font-medium bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#526377]">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="appearance-none block w-full px-3 py-2 border border-[#DDE5EC] rounded-lg shadow-2xs text-[#132238] placeholder-[#8190A0] focus:outline-none focus:ring-2 focus:ring-[#059DB0]/20 focus:border-[#059DB0] transition sm:text-xs font-medium bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#526377]">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="appearance-none block w-full px-3 py-2 border border-[#DDE5EC] rounded-lg shadow-2xs text-[#132238] placeholder-[#8190A0] focus:outline-none focus:ring-2 focus:ring-[#059DB0]/20 focus:border-[#059DB0] transition sm:text-xs font-medium bg-white"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#F3F6F8]">
          <button
            type="submit"
            disabled={changingPassword}
            className="inline-flex items-center justify-center px-4 py-2 bg-[#012F6B] hover:bg-[#033E79] text-white text-xs font-bold rounded-lg shadow-2xs transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {changingPassword ? 'Updating password...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* SECTION 4 - MY DELEGATIONS LINK */}
      <div className="bg-white border border-[#DDE5EC] shadow-xs rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#132238] font-sans flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#012F6B]" />
            Approval Authority & Delegations
          </h3>
          <p className="text-xs text-[#8190A0] mt-0.5">Delegate your signing authority to another peer during absences.</p>
        </div>

        <div className="flex items-center justify-between p-3.5 bg-[#F7FAFC] border border-[#DDE5EC] rounded-lg">
          <span className="text-xs font-medium text-[#526377]">Configure delegation schedules and acting approver assignments.</span>
          <Link
            href={`/${tenantSubdomain}/delegations`}
            className="inline-flex items-center justify-center px-3.5 py-1.5 border border-[#DDE5EC] text-[#132238] bg-white hover:bg-[#F3F6F8] rounded-lg text-xs font-semibold shadow-2xs transition"
          >
            Configure Delegations
          </Link>
        </div>
      </div>
    </div>
  );
}
