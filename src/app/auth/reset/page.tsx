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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-100 shadow-xl rounded-3xl p-8 max-w-md w-full text-center space-y-6 font-body">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-16 h-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-display font-black text-ink">Password Updated</h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            Your password has been successfully updated. You can now access your dashboard.
          </p>
          <div className="pt-2">
            <Link href="/login" className="inline-flex items-center justify-center bg-accent text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-accent-light transition">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-paper relative overflow-hidden font-body">
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center shadow-md">
            <span className="text-white font-display font-extrabold text-base">SG</span>
          </div>
          <span className="font-display text-2xl font-extrabold text-ink">
            Sigma<span className="text-accent font-extrabold">Go</span>
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-display font-extrabold tracking-tight text-ink">
          Set new password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 font-medium">
          Create a secure new password for your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow-xl border border-gray-100 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-ink">
                New Password
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-sm font-medium"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-ink">
                Confirm New Password
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-sm font-medium"
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-accent hover:bg-accent/90 focus:outline-none disabled:opacity-50 transition transform hover:-translate-y-0.5"
            >
              {status === 'loading' ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
