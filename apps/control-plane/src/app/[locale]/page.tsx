'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, Shield, Lock, User, Building, LogIn, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgName, setOrgName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.checkSetup();
        setNeedsSetup(res.needsSetup);
        
        // If not needing setup and already logged in, redirect
        if (!res.needsSetup && localStorage.getItem('token')) {
          router.push('/en/portal');
        }
      } catch (err) {
        console.error('Failed to check setup state', err);
      } finally {
        setChecking(false);
      }
    };
    init();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(email, password);
      if (res.token) {
        localStorage.setItem('token', res.token);
        if (res.user?.role === 'ADMIN' || res.user?.role === 'SUPER_ADMIN') {
          router.push('/en/admin/dashboard');
        } else {
          router.push('/en/portal');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.register({
        email,
        password,
        firstName,
        lastName,
        organizationName: orgName
      });
      // After setup, auto login
      const res = await api.login(email, password);
      localStorage.setItem('token', res.token);
      router.push('/en/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-500">
        <Shield className="w-8 h-8 animate-pulse text-blue-500 mb-4" />
        <span className="text-sm font-medium tracking-wide">Initializing Gateway Secure Connection...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-950 font-sans p-6 text-zinc-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <main className="w-full max-w-md flex flex-col items-center gap-8 text-center relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-400">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>Enterprise AI Gateway</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            {needsSetup ? 'Gateway Initial Setup' : 'Secure Authentication'}
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            {needsSetup 
              ? 'Welcome to the Enterprise AI Gateway. Create the first Organization Admin account.'
              : 'Sign in to access your Enterprise AI workspaces and control plane.'}
          </p>
        </div>

        {error && (
          <div className="w-full p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-left">
            {error}
          </div>
        )}

        <form 
          onSubmit={needsSetup ? handleSetup : handleLogin} 
          className="w-full flex flex-col gap-4 bg-zinc-900/50 border border-zinc-850 p-6 rounded-2xl backdrop-blur-sm"
        >
          {needsSetup && (
            <>
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Organization Name</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">First Name</label>
                  <input
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Last Name</label>
                  <input
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@enterprise.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
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
            {loading ? (
              <Shield className="w-4 h-4 animate-spin" />
            ) : needsSetup ? (
              <>
                <span>Initialize Platform</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Secure Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center gap-6 mt-6 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>Port 3000 Connected</span>
          </div>
          <span>&bull;</span>
          <span>v1.0.0 Release</span>
        </div>
      </main>
    </div>
  );
}
