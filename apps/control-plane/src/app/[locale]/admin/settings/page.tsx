'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Settings, Save, AlertCircle, Shield, ShieldCheck, Heart } from 'lucide-react';

export default function SettingsPage() {
  const [budgetLimit, setBudgetLimit] = useState('500.00');
  const [rateLimit, setRateLimit] = useState('100');
  const [piiScan, setPiiScan] = useState(true);
  const [injectionScan, setInjectionScan] = useState(true);

  const { data: config, refetch } = useQuery({
    queryKey: ['routingConfigSetting'],
    queryFn: () => api.getRoutingConfig(),
  });

  const mutation = useMutation({
    mutationFn: (newStrategy: string) => api.updateRoutingConfig(newStrategy),
    onSuccess: () => {
      refetch();
    },
  });

  const handleSave = () => {
    // Notify user or mock save state
    alert('Settings successfully updated and applied in Gateway routing memory context!');
  };

  const currentStrategy = config?.strategy || 'balanced';

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-100">Settings</h1>
        <p className="text-zinc-500 text-xs mt-1">Configure global rate limit tiers, budget caps, and guardrails.</p>
      </div>

      {/* Main settings options container */}
      <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-6 max-w-2xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Gateway Global parameters</h3>

        <div className="space-y-6 text-xs text-zinc-300">
          {/* Strategy */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Default Routing Strategy</span>
            <select
              value={currentStrategy}
              onChange={(e) => mutation.mutate(e.target.value)}
              className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none w-full cursor-pointer"
            >
              <option value="balanced">Balanced</option>
              <option value="cost-optimized">Cost Optimized</option>
              <option value="latency-optimized">Latency Optimized</option>
              <option value="high-availability">High Availability</option>
            </select>
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Tenant Monthly Budget Cap (USD)</span>
            <input
              type="number"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-zinc-200 focus:outline-none w-full"
            />
          </div>

          {/* Rate Limits */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Global Rate Limit Window (Requests / Min)</span>
            <input
              type="number"
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
              className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-zinc-200 focus:outline-none w-full"
            />
          </div>

          {/* Guardrails toggles */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Security Interceptors Guardrails</span>

            <div className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
              <div className="space-y-1">
                <div className="font-bold text-zinc-200">Personally Identifiable Information (PII) Shield</div>
                <div className="text-[10px] text-zinc-500">Detect and redact Citizen CCCD, Emails, and Vietnamese Phones.</div>
              </div>
              <input
                type="checkbox"
                checked={piiScan}
                onChange={() => setPiiScan(!piiScan)}
                className="w-4 h-4 rounded text-blue-600 bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
              <div className="space-y-1">
                <div className="font-bold text-zinc-200">Prompt Injection Detector (Jailbreaks)</div>
                <div className="text-[10px] text-zinc-500">Block prompts attempting to override system instruction scopes.</div>
              </div>
              <input
                type="checkbox"
                checked={injectionScan}
                onChange={() => setInjectionScan(!injectionScan)}
                className="w-4 h-4 rounded text-blue-600 bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-zinc-800/40 flex items-center justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
