'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ShieldAlert, AlertTriangle, ShieldCheck, Eye, Terminal } from 'lucide-react';

export default function SecurityPage() {
  const t = useTranslations('Admin');
  const { data: events, isLoading } = useQuery({
    queryKey: ['securityEvents'],
    queryFn: () => api.getSecurityEvents(),
  });

  if (isLoading || !events) {
    return (
      <div className="space-y-6 animate-pulse">
        <h1 className="text-2xl font-extrabold text-zinc-100">Security Command</h1>
        <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-100">{t('security')}</h1>
        <p className="text-zinc-500 text-xs mt-1">{t('securityDesc')}</p>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-850 p-5 rounded-xl space-y-2 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">PII Shield Triggers</span>
            <div className="text-2xl font-extrabold text-blue-400">{events.filter(e => e.type === 'PII_LEAK').length}</div>
          </div>
          <ShieldCheck className="w-8 h-8 text-blue-500 bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/20" />
        </div>
        <div className="bg-zinc-900 border border-zinc-850 p-5 rounded-xl space-y-2 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Prompt Injection Blocks</span>
            <div className="text-2xl font-extrabold text-red-500">{events.filter(e => e.type === 'PROMPT_INJECTION').length}</div>
          </div>
          <ShieldAlert className="w-8 h-8 text-red-500 bg-red-500/10 p-1.5 rounded-lg border border-red-500/20" />
        </div>
        <div className="bg-zinc-900 border border-zinc-850 p-5 rounded-xl space-y-2 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Guardrail Compliance</span>
            <div className="text-2xl font-extrabold text-emerald-400">100%</div>
          </div>
          <ShieldCheck className="w-8 h-8 text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20" />
        </div>
      </div>

      {/* Events table */}
      <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Security Violations Ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                <th className="py-2.5 px-4 font-semibold">User</th>
                <th className="py-2.5 px-4 font-semibold">Violation Type</th>
                <th className="py-2.5 px-4 font-semibold">Details / Action Taken</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">No security violations detected.</td>
                </tr>
              ) : (
                events.map((ev, idx) => (
                  <tr key={idx} className="border-b border-zinc-800/40 hover:bg-zinc-850/20 text-zinc-300">
                    <td className="py-2.5 px-4 text-zinc-500">{new Date(ev.timestamp).toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-medium">{ev.userId}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ev.type === 'PROMPT_INJECTION' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {ev.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">{ev.details}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ev.status === 'BLOCKED' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
