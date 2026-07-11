'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AlertCircle, Clock, Shield, Coins, Database, Activity, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area } from 'recharts';

export default function DashboardPage() {
  const t = useTranslations('Admin');
  const tDashboard = useTranslations('Dashboard');
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => api.getDashboardStats(),
    refetchInterval: 5000, // auto-refresh every 5 seconds
  });

  const costData = [
    { name: '10:00', cost: 0.02 },
    { name: '11:00', cost: 0.05 },
    { name: '12:00', cost: 0.08 },
    { name: '13:00', cost: 0.12 },
    { name: '14:00', cost: 0.18 },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <h1 className="text-2xl font-extrabold text-zinc-100">{t('dashboard')}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-zinc-900 border border-zinc-800 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-800 rounded-xl">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <h2 className="text-lg font-bold">{tDashboard('failedToLoad')}</h2>
        <p className="text-zinc-500 text-sm mt-1">{tDashboard('pleaseEnsure')}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const statCards = [
    { title: tDashboard('totalRequests'), value: data.totalRequests, change: '+12%', icon: Activity, color: 'text-blue-500' },
    { title: tDashboard('averageLatency'), value: `${Math.round(data.averageLatency)} ms`, change: '-4%', icon: Clock, color: 'text-amber-500' },
    { title: tDashboard('cacheHitRatio'), value: `${(data.cacheHitRatio * 100).toFixed(1)}%`, change: '+1.5%', icon: Database, color: 'text-emerald-500' },
    { title: tDashboard('todayCostUsd'), value: `$${data.todayCostUsd.toFixed(4)}`, change: '-8%', icon: Coins, color: 'text-emerald-400' },
    { title: tDashboard('piiShieldBlocks'), value: data.detectedPii, change: '0', icon: Shield, color: 'text-blue-400' },
    { title: tDashboard('securityViolations'), value: data.blockedPrompts, change: '0', icon: AlertCircle, color: 'text-red-500' },
    { title: tDashboard('circuitBreakerEvents'), value: data.circuitBreakerEvents, change: '0', icon: RefreshCw, color: 'text-purple-400' },
    { title: tDashboard('activeUsers'), value: data.activeUsers, change: '+2', icon: Shield, color: 'text-zinc-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-100">Operational Dashboard</h1>
          <p className="text-zinc-500 text-xs mt-1">{t('dashboardDesc')}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          <span>{tDashboard('refresh')}</span>
        </button>
      </div>

      {/* Grid stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-zinc-900 border border-zinc-850 p-5 rounded-xl flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{card.title}</span>
                <div className="text-2xl font-extrabold text-zinc-100">{card.value}</div>
              </div>
              <div className={`p-3 bg-zinc-950 border border-zinc-800 rounded-lg ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{tDashboard('gatewayCostPipeline')}</span>
            <span className="text-[10px] text-zinc-500">{tDashboard('liveAreaChart')}</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costData}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                <Area type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#costGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent requests table */}
      <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">{tDashboard('recentGatewayOperations')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-2.5 px-4 font-semibold">{tDashboard('user')}</th>
                <th className="py-2.5 px-4 font-semibold">{tDashboard('promptPreview')}</th>
                <th className="py-2.5 px-4 font-semibold">{tDashboard('provider')}</th>
                <th className="py-2.5 px-4 font-semibold">{tDashboard('latency')}</th>
                <th className="py-2.5 px-4 font-semibold">{tDashboard('cost')}</th>
                <th className="py-2.5 px-4 font-semibold">{tDashboard('status')}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">{tDashboard('noRecentLogs')}</td>
                </tr>
              ) : (
                data.recentRequests.map((req) => (
                  <tr key={req.id} className="border-b border-zinc-800/40 hover:bg-zinc-850/20 text-zinc-300">
                    <td className="py-2.5 px-4 font-medium">{req.user}</td>
                    <td className="py-2.5 px-4 truncate max-w-xs">{req.prompt}</td>
                    <td className="py-2.5 px-4 capitalize font-semibold">{req.providerId || '-'}</td>
                    <td className="py-2.5 px-4">{req.latencyMs} ms</td>
                    <td className="py-2.5 px-4 font-mono">${req.costUsd.toFixed(5)}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {req.status}
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
