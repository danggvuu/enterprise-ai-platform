'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams?.get('email');
    const tokenParam = searchParams?.get('token');
    
    if (emailParam) setEmail(emailParam);
    if (tokenParam) setToken(tokenParam);
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    setLoading(true);
    setError('');
    
    try {
      await api.resetPassword({ email, token, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-950 font-sans p-6 text-zinc-100 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <main className="w-full max-w-md flex flex-col items-center gap-8 text-center relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-400">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>Enterprise AI Gateway</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Enter your new password to regain access to your account.
          </p>
        </div>

        {error && (
          <div className="w-full p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-left">
            {error}
          </div>
        )}

        {success ? (
          <div className="w-full flex flex-col gap-4 bg-zinc-900/50 border border-zinc-850 p-6 rounded-2xl backdrop-blur-sm text-center items-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
            <h3 className="text-lg font-medium text-zinc-100">Password Reset Successful</h3>
            <p className="text-sm text-zinc-400">Your password has been successfully updated.</p>
            <button
              onClick={() => router.push('/en')}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form 
            onSubmit={handleReset} 
            className="w-full flex flex-col gap-4 bg-zinc-900/50 border border-zinc-850 p-6 rounded-2xl backdrop-blur-sm"
          >
            <div className="space-y-1 text-left hidden">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1 text-left hidden">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Reset Token</label>
              <input
                required
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
            </button>
            
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => router.push('/en')}
                className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
      </div>
    }>
      <ResetPassword />
    </React.Suspense>
  );
}
