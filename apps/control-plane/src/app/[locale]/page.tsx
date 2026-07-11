'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, Shield, Lock, User, Building, LogIn, ArrowRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  
  // Wizard steps: 0 = health check, 1 = wizard error fix, 2 = register / login, 3 = forgot password
  const [step, setStep] = useState(0);

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
        const [setupRes, healthRes] = await Promise.all([
          api.checkSetup(),
          api.getHealth()
        ]);
        
        setNeedsSetup(setupRes.needsSetup);
        setHealthStatus(healthRes);
        
        const allHealthy = healthRes.database === 'connected' && healthRes.redis === 'connected';
        
        if (!allHealthy) {
          setStep(1); // Wizard error fix mode
        } else if (setupRes.needsSetup) {
          if (healthRes.ollama === 'disconnected') {
            setStep(1); // Ask about Ollama first
          } else {
            setStep(2); // Registration
          }
        } else {
          // System healthy, setup complete
          if (localStorage.getItem('token')) {
            router.push('/en/portal');
          } else {
            setStep(2); // Login
          }
        }
      } catch (err) {
        console.error('Failed to check setup state', err);
        setError('Cannot connect to Gateway Server. Ensure it is running on Port 8080.');
        setStep(1); // Show errors
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
      const res = await api.login(email, password);
      localStorage.setItem('token', res.token);
      router.push('/en/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const [forgotSuccess, setForgotSuccess] = useState(false);
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.forgotPassword(email);
      setForgotSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Request failed');
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <main className="w-full max-w-md flex flex-col items-center gap-8 text-center relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-400">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>Enterprise AI Gateway</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            {step === 1 ? 'System Requirements' : needsSetup && step !== 4 ? 'Gateway Initial Setup' : step === 4 ? 'Create an Account' : 'Secure Authentication'}
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            {step === 1 
              ? 'Verifying infrastructure dependencies before proceeding.'
              : needsSetup && step !== 4
              ? 'Welcome to the Enterprise AI Gateway. Create the first Organization Admin account.'
              : step === 3
              ? 'Enter your email address to receive a password reset link.'
              : step === 4
              ? 'Sign up to create a new workspace and start using the platform.'
              : 'Sign in to access your Enterprise AI workspaces and control plane.'}
          </p>
        </div>

        {error && step !== 1 && (
          <div className="w-full p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-left">
            {error}
          </div>
        )}

        {step === 1 ? (
          <div className="w-full flex flex-col gap-4 bg-zinc-900/50 border border-zinc-850 p-6 rounded-2xl backdrop-blur-sm text-left">
             <div className="flex items-center justify-between">
               <span className="text-sm font-medium">1. Docker Gateway Connection</span>
               {healthStatus ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
             </div>
             
             <div className="flex items-center justify-between">
               <span className="text-sm font-medium">2. PostgreSQL Database</span>
               {healthStatus?.database === 'connected' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
             </div>

             <div className="flex items-center justify-between">
               <span className="text-sm font-medium">3. Redis Semantic Cache</span>
               {healthStatus?.redis === 'connected' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
             </div>

             <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-zinc-800">
               <div className="flex items-center justify-between">
                 <span className="text-sm font-medium">4. Local Ollama Embedded</span>
                 {healthStatus?.ollama === 'connected' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <span className="text-xs text-yellow-500 font-semibold px-2 py-0.5 bg-yellow-500/10 rounded-full border border-yellow-500/20">NOT FOUND</span>}
               </div>
               
               {healthStatus?.ollama === 'disconnected' && (
                 <div className="mt-2 text-xs text-zinc-400 space-y-3">
                   <p>The embedded Ollama instance was not detected. The Gateway supports Dual Modes:</p>
                   
                   <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                     <p className="font-semibold text-zinc-200">Mode A: Start Bundled Docker</p>
                     <p className="mt-1">Run this command to automatically pull and start Ollama:</p>
                     <code className="block mt-2 text-[11px] text-blue-400 bg-blue-950/30 p-2 rounded border border-blue-500/20 break-all">docker compose -f docker-compose.dev.yml up -d ollama</code>
                   </div>
                   
                   <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                     <p className="font-semibold text-zinc-200">Mode B: Connect External Server</p>
                     <p className="mt-1">Provide an external GPU URL by restarting the Gateway with:</p>
                     <code className="block mt-2 text-[11px] text-blue-400 bg-blue-950/30 p-2 rounded border border-blue-500/20 break-all">OLLAMA_BASE_URL=http://your-server:11434</code>
                   </div>
                 </div>
               )}
             </div>

             {(healthStatus?.database !== 'connected' || healthStatus?.redis !== 'connected') && healthStatus && (
               <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                 Please ensure PostgreSQL and Redis are running. Try running: 
                 <code className="block mt-1 font-mono">docker compose -f docker-compose.dev.yml up -d postgres redis</code>
               </div>
             )}

             <button
               onClick={() => {
                 // Check if core DB/Redis is up. If so, they can proceed without Ollama if they want Mode B later.
                 if (healthStatus?.database === 'connected' && healthStatus?.redis === 'connected') {
                   setStep(2);
                 } else {
                   window.location.reload();
                 }
               }}
               className="w-full flex items-center justify-center gap-2 mt-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
             >
               {healthStatus?.database === 'connected' && healthStatus?.redis === 'connected' ? 'Continue Anyway (Mode B)' : 'Retry Connection'}
             </button>
          </div>
        ) : step === 3 ? (
          <form 
            onSubmit={handleForgotPassword} 
            className="w-full flex flex-col gap-4 bg-zinc-900/50 border border-zinc-850 p-6 rounded-2xl backdrop-blur-sm"
          >
            {forgotSuccess ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <div>
                  <h3 className="text-lg font-medium text-zinc-100">Check your email</h3>
                  <p className="text-sm text-zinc-400 mt-2">If an account exists with {email}, we have sent a password reset link.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setForgotSuccess(false);
                  }}
                  className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Return to login
                </button>
              </div>
            ) : (
              <>
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Reset Link</span>}
                </button>
                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
          <form 
            onSubmit={(needsSetup || step === 4) ? handleSetup : handleLogin} 
            className="w-full flex flex-col gap-4 bg-zinc-900/50 border border-zinc-850 p-6 rounded-2xl backdrop-blur-sm"
          >
            {(needsSetup || step === 4) && (
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
                {(!needsSetup && step !== 4) && (
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
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
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (needsSetup || step === 4) ? (
                <>
                  <span>{step === 4 ? 'Sign Up' : 'Initialize Platform'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Secure Sign In</span>
                </>
              )}
            </button>
            
            {step === 2 && !needsSetup && (
              <div className="text-center mt-2 border-t border-zinc-800/50 pt-4">
                <span className="text-xs text-zinc-500">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
            {step === 4 && (
              <div className="text-center mt-2 border-t border-zinc-800/50 pt-4">
                <span className="text-xs text-zinc-500">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Sign In
                </button>
              </div>
            )}
          </form>
        )}

        <div className="flex items-center gap-6 mt-6 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>Port 8080 Connected</span>
          </div>
          <span>&bull;</span>
          <span>v1.0.0 Release</span>
        </div>
      </main>
    </div>
  );
}
