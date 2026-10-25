"use client";

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { signIn, resetPassword } from './actions';
import { PILOT_EMAIL } from '@/lib/site';
import { Eye, EyeOff, Lock, Mail, ChevronLeft, ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;

    setIsSubmitting(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const res = await resetPassword(resetEmail);
      if (res && !res.success) {
        setErrorMsg(res.error || "Failed to send password reset link.");
      } else {
        setStatusMsg("A password reset link has been sent. Check your email.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send password reset link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#F6F8F9] relative overflow-hidden font-sans">
      {/* Top Left Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-[#526679] hover:text-[#17324D] bg-white border border-[#DCE5EA] rounded-lg shadow-xs transition hover:bg-[#EEF2F4]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#0B7780]" />
          <span>Home</span>
        </Link>
      </div>

      {/* Subtle Decision Network Ambient Background Motif */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg className="absolute w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="decision-network" width="80" height="80" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="2.5" fill="#17324D" />
              <circle cx="60" cy="60" r="2" fill="#0B7780" />
              <line x1="20" y1="20" x2="60" y2="60" stroke="#17324D" strokeWidth="0.75" strokeDasharray="3 3" />
              <line x1="20" y1="20" x2="80" y2="20" stroke="#0B7780" strokeWidth="0.5" />
              <line x1="60" y1="60" x2="60" y2="0" stroke="#0B7780" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#decision-network)" />
        </svg>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#0B7780]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#17324D]/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <Link href="/" className="flex flex-col items-center group transition">
          {/* Official SigmaGo Brand Mark */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 relative flex items-center justify-center bg-white rounded-xl shadow-xs border border-[#DCE5EA] p-1.5 group-hover:border-[#0B7780]/40 transition">
              <img
                src="/brand/sigmago-logo.png"
                alt="SigmaGo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-[#17324D] leading-none">
                Sigma<span className="text-[#0B7780]">Go</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#637587] mt-0.5">
                Decision Intelligence
              </span>
            </div>
          </div>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-[#182B3D]">
          {isResetMode ? 'Reset password' : 'Sign in to SigmaGo'}
        </h2>
        <p className="mt-1.5 text-center text-xs font-medium text-[#526679]">
          {isResetMode
            ? 'Enter your email to receive a password reset link'
            : 'Turn decisions into organizational intelligence'}
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-[#DCE5EA] shadow-sm rounded-xl">
          
          {/* Global URL Message Banner */}
          {message && !isResetMode && (
            <div className={`mb-6 p-3.5 rounded-lg text-xs font-semibold flex items-start gap-2.5 border ${
              message.includes('success') || message.includes('confirmed')
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {message.includes('success') || message.includes('confirmed') ? (
                <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <p className="text-xs font-medium leading-relaxed">{decodeURIComponent(message)}</p>
            </div>
          )}

          {/* Reset Status/Error Messages */}
          {statusMsg && (
            <div className="mb-6 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              {statusMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
              {errorMsg}
            </div>
          )}

          {isResetMode ? (
            <form key="reset" className="space-y-5" onSubmit={handleResetPassword}>
              <div>
                <label htmlFor="reset-email" className="block text-xs font-semibold text-[#182B3D] uppercase tracking-wider mb-1.5">
                  Work Email
                </label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#637587]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#DCE5EA] rounded-lg text-sm text-[#182B3D] placeholder-[#637587] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition font-medium"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2.5 px-4 rounded-lg text-xs font-bold text-white bg-[#17324D] hover:bg-[#224564] focus:outline-none focus:ring-2 focus:ring-[#0B7780] disabled:opacity-50 transition shadow-xs"
                >
                  {isSubmitting ? 'Sending Instructions...' : 'Send Reset Link'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false);
                    setStatusMsg(null);
                    setErrorMsg(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 border border-[#DCE5EA] rounded-lg text-xs font-semibold text-[#526679] bg-white hover:bg-[#F6F8F9] focus:outline-none transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back to sign in
                </button>
              </div>
            </form>
          ) : (
            <form key="sign-in" className="space-y-5" action={signIn}>
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-[#182B3D] uppercase tracking-wider mb-1.5">
                  Work Email
                </label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#637587]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#DCE5EA] rounded-lg text-sm text-[#182B3D] placeholder-[#637587] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition font-medium"
                    placeholder="executive@company.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-semibold text-[#182B3D] uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setStatusMsg(null);
                      setErrorMsg(null);
                    }}
                    className="text-xs font-semibold text-[#0B7780] hover:text-[#096A72] transition"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#637587]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="appearance-none block w-full pl-10 pr-12 py-2.5 bg-white border border-[#DCE5EA] rounded-lg text-sm text-[#182B3D] placeholder-[#637587] focus:outline-none focus:ring-2 focus:ring-[#0B7780]/20 focus:border-[#0B7780] transition font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#637587] hover:text-[#526679] transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="submit"
                  className="w-full flex justify-center py-2.5 px-4 rounded-lg text-xs font-bold text-white bg-[#17324D] hover:bg-[#224564] focus:outline-none focus:ring-2 focus:ring-[#0B7780] transition shadow-xs"
                >
                  Sign In
                </button>
                <a
                  href={`mailto:${PILOT_EMAIL}?subject=SigmaGo%20workspace%20access`}
                  className="w-full flex justify-center py-2 px-4 border border-[#DCE5EA] rounded-lg text-xs font-semibold text-[#526679] bg-white hover:bg-[#F6F8F9] focus:outline-none transition"
                >
                  Request workspace access
                </a>
              </div>
            </form>
          )}
        </div>
        
        <p className="mt-6 text-center text-[11px] text-[#637587]">
        Protected access with traceable decision records.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-md h-10 w-10 border-t-2 border-brand"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
