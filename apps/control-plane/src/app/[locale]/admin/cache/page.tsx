'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Database, AlertCircle, RefreshCw, Star, Info } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function CachePage() {
  const t = useTranslations('Admin');
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['cacheStats'],
    queryFn: () => api.getCacheStats(),
  });

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <h1 className="text-2xl font-extrabold text-zinc-100">Cache Overview</h1>
        <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-xl" />
      </div>
    );
  }

  const pieData = [
    { name: 'Cache Hits', value: Math.round(stats.hitRatio * 100) },
    { name: 'Cache Misses', value: Math.round(stats.missRatio * 100) },
  ];

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-100">{t('cache')}</h1>
          <p className="text-zinc-500 text-xs mt-1">{t('cacheDesc')}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Grid of metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-850 p-5 rounded-xl space-y-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Semantic Keys Stored</span>
          <div className="text-2xl font-extrabold text-zinc-100">{stats.cacheSize}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-850 p-5 rounded-xl space-y-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cache Hit Ratio</span>
          <div className="text-2xl font-extrabold text-emerald-400">{(stats.hitRatio * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-850 p-5 rounded-xl space-y-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Default TTL (Sec)</span>
          <div className="text-2xl font-extrabold text-zinc-100">{stats.ttl}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-850 p-5 rounded-xl space-y-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cache Evictions</span>
          <div className="text-2xl font-extrabold text-zinc-100">{stats.evictions}</div>
        </div>
      </div>

      {/* Pie Chart hit/miss + top prompts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Hit vs Miss Ratio</h3>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 text-xs font-semibold text-zinc-400">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded" /> Hits</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-red-500 rounded" /> Misses</div>
          </div>
        </div>

        {/* Top Prompts */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Top Cached Queries</h3>
          <div className="space-y-3">
            {stats.topPrompts.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 bg-zinc-950/80 border border-zinc-850 rounded-xl text-xs">
                <div className="flex items-start gap-2.5 truncate">
                  <Database className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-zinc-300 font-semibold truncate">{item.prompt}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                  <Star className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{item.hits} hits</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
