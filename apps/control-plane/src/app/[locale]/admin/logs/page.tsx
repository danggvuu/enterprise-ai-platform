'use client';
// Force Vercel rebuild for latest monorepo fixes

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Terminal, Download, Search, RefreshCw, AlertTriangle } from 'lucide-react';

export default function LogsPage() {
  const t = useTranslations('Admin');
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['adminLogs'],
    queryFn: () => api.getRequests(),
  });

  const handleExport = () => {
    if (!logs) return;
    const headers = ['Timestamp', 'User', 'Department', 'Prompt', 'Provider', 'LatencyMs', 'CostUsd', 'Status'];
    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        log.timestamp,
        log.user,
        log.department,
        `"${log.prompt.replace(/"/g, '""')}"`,
        log.providerId || 'none',
        log.latencyMs,
        log.costUsd,
        log.status
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `gateway_logs_${Date.now()}.csv`);
    a.click();
  };

  const filteredLogs = (logs || []).filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(search.toLowerCase()) ||
                          log.prompt.toLowerCase().includes(search.toLowerCase());
    const matchesProvider = providerFilter === 'all' || log.providerId === providerFilter;
    return matchesSearch && matchesProvider;
  });

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-100">{t('logs')}</h1>
          <p className="text-zinc-500 text-xs mt-1">{t('logsDesc')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExport}
            disabled={!logs || logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-2.5">
          <Search className="w-4 h-4 text-zinc-500 ml-2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user prompt, message content..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none px-3"
          />
        </div>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none cursor-pointer"
        >
          <option value="all">All Providers</option>
          <option value="openai">OpenAI</option>
          <option value="bedrock">AWS Bedrock</option>
          <option value="ollama">Ollama (Local)</option>
        </select>
      </div>

      {/* Terminal style logs console */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden font-mono text-[11px] text-zinc-400 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-500" />
            <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Gateway System Output Logs</span>
          </div>
          <span className="text-[10px] text-zinc-600">{filteredLogs.length} matches</span>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="text-zinc-500 py-12 text-center animate-pulse">Streaming logs trace data...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-zinc-500 py-12 text-center">No logs found matching parameters.</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="hover:bg-zinc-900/60 p-2 rounded transition-colors border-l-2 border-transparent hover:border-blue-500">
                <span className="text-zinc-600">[{new Date(log.timestamp).toISOString()}]</span>{' '}
                <span className="text-blue-400">INFO</span>{' '}
                <span className="text-zinc-500">user:</span><span className="text-zinc-300">{log.user}</span>{' '}
                <span className="text-zinc-500">prompt:</span><span className="text-zinc-300 truncate max-w-sm inline-block align-bottom">&quot;{log.prompt}&quot;</span>{' '}
                <span className="text-zinc-500">provider:</span><span className="text-zinc-300 font-semibold">{log.providerId || '-'}</span>{' '}
                <span className="text-zinc-500">latency:</span><span className="text-zinc-300">{log.latencyMs}ms</span>{' '}
                <span className="text-zinc-500">cost:</span><span className="text-zinc-300">${log.costUsd.toFixed(5)}</span>{' '}
                <span className={`font-bold ${log.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {log.status.toUpperCase()}
                </span>
                {log.errorMessage && (
                  <div className="text-red-400 pl-4 mt-1 font-sans">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    <span>{log.errorMessage}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
