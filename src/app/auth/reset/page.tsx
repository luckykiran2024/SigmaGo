'use client';

import { useState } from 'react';
import { updatePasswordAction } from './actions';
import { Eye, EyeOff, Lock, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await updatePasswordAction(password);
      if (res && !res.success) {
        setErrorMsg(res.error || 'Failed to update password.');
        setStatus('error');
      } else {
        setStatus('success');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to update password.');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-[#DDE5EC] shadow-sm rounded-xl p-8 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[#132238]">Password Updated</h2>
            <p className="text-xs text-[#526377] font-medium leading-relaxed">
              Your password has been successfully updated. You can now access your organization workspace.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/login" className="inline-flex items-center justify-center bg-[#012F6B] text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#033E79] transition shadow-xs">
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#F7FAFC] relative overflow-hidden font-sans">
      {/* Top Left Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-[#526377] hover:text-[#012F6B] bg-white border border-[#DDE5EC] rounded-lg shadow-xs transition hover:bg-[#F3F6F8]"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-[#059DB0]" />
          <span>Sign In</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <Link href="/" className="flex flex-col items-center group transition">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 relative flex items-center justify-center bg-white rounded-xl shadow-xs border border-[#DDE5EC] p-1.5 group-hover:border-[#059DB0]/40 transition">
              <img
                src="/brand/sigmago-logo.png"
                alt="SigmaGo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-[#012F6B] leading-none">
                Sigma<span className="text-[#059DB0]">Go</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8190A0] mt-0.5">
                Decision Intelligence
              </span>
            </div>
          </div>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-[#132238]">
          Set new password
        </h2>
        <p className="mt-1.5 text-center text-xs font-medium text-[#526377]">
          Create a secure credential for your enterprise account
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-[#DDE5EC] rounded-xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg">
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#132238] uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8190A0]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-12 py-2.5 bg-white border border-[#DDE5EC] rounded-lg text-sm text-[#132238] placeholder-[#8190A0] focus:outline-none focus:ring-2 focus:ring-[#059DB0]/20 focus:border-[#059DB0] transition font-medium"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8190A0] hover:text-[#526377]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#132238] uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8190A0]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-12 py-2.5 bg-white border border-[#DDE5EC] rounded-lg text-sm text-[#132238] placeholder-[#8190A0] focus:outline-none focus:ring-2 focus:ring-[#059DB0]/20 focus:border-[#059DB0] transition font-medium"
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg text-xs font-bold text-white bg-[#012F6B] hover:bg-[#033E79] focus:outline-none focus:ring-2 focus:ring-[#059DB0] disabled:opacity-50 transition shadow-xs"
            >
              {status === 'loading' ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
