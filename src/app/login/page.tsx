"use client";

import { useState, Suspense } from 'react';
import { signIn, signUp, resetPassword } from './actions';
import { Eye, EyeOff, Lock, Mail, ChevronLeft } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-paper relative overflow-hidden font-body">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-2">
          {/* SigmaGo Brand Mark */}
          <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center shadow-md shadow-ink/10">
            <span className="text-white font-display font-extrabold text-base tracking-tight">SG</span>
          </div>
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink">
            Sigma<span className="text-accent font-extrabold">Go</span>
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-display font-extrabold tracking-tight text-ink">
          {isResetMode ? 'Reset password' : 'Welcome back'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 font-medium">
          {isResetMode ? 'Enter your email to request a reset link' : 'Enter your credentials to access your tenant workspace'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow-xl border border-gray-100 sm:rounded-2xl sm:px-10">
          
          {/* Query Param Message */}
          {message && !isResetMode && (
            <div className={`mb-6 p-4 rounded-xl flex gap-3 items-start border ${
              message.toLowerCase().includes('success') || message.toLowerCase().includes('created')
                ? 'bg-green-50 border-green-100 text-green-700'
                : 'bg-red-50 border-red-100 text-red-700'
            }`}>
              {message.toLowerCase().includes('success') || message.toLowerCase().includes('created') ? (
                <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <p className="text-sm font-medium">{decodeURIComponent(message)}</p>
            </div>
          )}

          {/* Reset Status/Error Messages */}
          {statusMsg && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 text-sm font-semibold text-green-700">
              {statusMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm font-semibold text-red-700">
              {errorMsg}
            </div>
          )}

          {isResetMode ? (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <div>
                <label htmlFor="reset-email" className="block text-sm font-semibold text-ink">
                  Email address
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-sm font-medium"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition duration-150 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isSubmitting ? 'Sending...' : 'Send reset link'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false);
                    setStatusMsg(null);
                    setErrorMsg(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition duration-150"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to login
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" action={signIn}>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-ink">
                  Email address
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-sm font-medium"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-ink">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setStatusMsg(null);
                      setErrorMsg(null);
                    }}
                    className="text-xs font-semibold text-accent hover:text-accent/90 transition"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="appearance-none block w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-xl shadow-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition sm:text-sm font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-150 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Sign in
                </button>
                <button
                  formAction={signUp}
                  className="w-full flex justify-center py-2.5 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-150"
                >
                  Create new account
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-accent"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
