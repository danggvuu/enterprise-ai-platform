'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Coins, PiggyBank, RefreshCw, BarChart } from 'lucide-react';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area, BarChart as RechartsBarChart, Bar, Cell } from 'recharts';

export default function CostsPage() {
  const t = useTranslations('Admin');
  const { data: costs, isLoading, refetch } = useQuery({
    queryKey: ['costStats'],
    queryFn: () => api.getCosts(),
  });

  if (isLoading || !costs) {
    return (
      <div className="space-y-6 animate-pulse">
        <h1 className="text-2xl font-extrabold text-zinc-100">Financial Hub</h1>
        <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-xl" />
      </div>
    );
  }

  const providerColors = ['#3b82f6', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-100">{t('costs')}</h1>
          <p className="text-zinc-500 text-xs mt-1">{t('costsDesc')}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Optimization savings summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-850 p-5 rounded-xl space-y-2 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Semantic Cache Savings</span>
            <div className="text-2xl font-extrabold text-emerald-400">${costs.savings.cache.toFixed(4)}</div>
          </div>
          <PiggyBank className="w-8 h-8 text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20" />
        </div>
        <div className="bg-zinc-900 border border-zinc-850 p-5 rounded-xl space-y-2 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Ollama Local Savings</span>
            <div className="text-2xl font-extrabold text-emerald-400">${costs.savings.local.toFixed(4)}</div>
          </div>
          <PiggyBank className="w-8 h-8 text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20" />
        </div>
        <div className="bg-zinc-900 border border-zinc-850 p-5 rounded-xl space-y-2 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Weighted Routing Optimization</span>
            <div className="text-2xl font-extrabold text-emerald-400">${costs.savings.routing.toFixed(4)}</div>
          </div>
          <PiggyBank className="w-8 h-8 text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20" />
        </div>
      </div>

      {/* Grid: cost over days + cost per provider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cost trends */}
        <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Daily cost trend (USD)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costs.daily}>
                <defs>
                  <linearGradient id="costsDailyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                <Area type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#costsDailyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost per provider */}
        <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Cost distribution by Provider</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={costs.byProvider}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                  {costs.byProvider.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={providerColors[index % providerColors.length]} />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
