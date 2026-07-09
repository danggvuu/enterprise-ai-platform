'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RequestLog } from '@/lib/types';
import { AlertCircle, Clock, Shield, Coins, Search, Terminal, ArrowDownCircle, RefreshCw } from 'lucide-react';

export default function MonitorPage() {
  const [liveLogs, setLiveLogs] = useState<RequestLog[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedReq, setSelectedReq] = useState<RequestLog | null>(null);

  // Initial load
  const { data: initialLogs, isLoading } = useQuery({
    queryKey: ['requestsLog'],
    queryFn: () => api.getRequests(),
  });

  useEffect(() => {
    if (initialLogs) {
      setLiveLogs(initialLogs);
    }
  }, [initialLogs]);

  // Connect SSE for real-time log stream
  useEffect(() => {
    const sseUrl = `${api.getBaseUrl()}/v1/admin/sse`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('request', (e: MessageEvent) => {
      try {
        const newLog = JSON.parse(e.data) as RequestLog;
        setLiveLogs(prev => [newLog, ...prev.slice(0, 199)]); // Keep last 200 logs
      } catch (err) {
        console.error('Failed to parse SSE event data', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, []);

  const filteredLogs = liveLogs.filter(log =>
    log.user.toLowerCase().includes(filter.toLowerCase()) ||
    log.prompt.toLowerCase().includes(filter.toLowerCase()) ||
    (log.providerId && log.providerId.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-100">Live Request Monitor</h1>
        <p className="text-zinc-500 text-xs mt-1">Real-time HTTP/SSE stream of gateway chat and API traffic.</p>
      </div>

      {/* Control panel & Filter */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-2.5">
          <Search className="w-4 h-4 text-zinc-500 ml-2" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by user, prompt, or provider..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none px-3"
          />
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-2 rounded-xl">
          <ArrowDownCircle className="w-4 h-4 text-emerald-400 animate-bounce" />
          <span>Real-time Stream Connected</span>
        </div>
      </div>

      {/* Main Grid: logs list + details panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Logs Table Card */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Live Stream Logs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="py-2.5 px-4 font-semibold">Time</th>
                  <th className="py-2.5 px-4 font-semibold">User</th>
                  <th className="py-2.5 px-4 font-semibold">Provider</th>
                  <th className="py-2.5 px-4 font-semibold">Latency</th>
                  <th className="py-2.5 px-4 font-semibold">Cost</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">Loading initial logs...</td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">No logs found matching filters.</td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedReq(log)}
                      className={`border-b border-zinc-800/40 hover:bg-zinc-850/20 cursor-pointer transition-colors text-zinc-300 ${
                        selectedReq?.id === log.id ? 'bg-zinc-850/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-zinc-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-4 font-medium">{log.user}</td>
                      <td className="py-2.5 px-4 capitalize font-semibold">{log.providerId || '-'}</td>
                      <td className="py-2.5 px-4">{log.latencyMs} ms</td>
                      <td className="py-2.5 px-4 font-mono">${log.costUsd.toFixed(5)}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Request Inspection Panel Card */}
        <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Request Inspector</h3>
            <Terminal className="w-4 h-4 text-zinc-500" />
          </div>

          {selectedReq ? (
            <div className="space-y-6 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Request ID</span>
                  <div className="font-mono text-zinc-300 truncate">{selectedReq.id}</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Timestamp</span>
                  <div className="text-zinc-300">{new Date(selectedReq.timestamp).toLocaleString()}</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">User</span>
                  <div className="text-zinc-300 font-semibold">{selectedReq.user}</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Department</span>
                  <div className="text-zinc-300">{selectedReq.department}</div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Prompt Input Payload</span>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 whitespace-pre-wrap font-mono">
                  {selectedReq.prompt}
                </div>
              </div>

              {selectedReq.responseText && (
                <div className="space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Completion Response</span>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                    {selectedReq.responseText}
                  </div>
                </div>
              )}

              {selectedReq.errorMessage && (
                <div className="space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block text-red-400">Error Payload</span>
                  <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-red-400 whitespace-pre-wrap font-mono">
                    {selectedReq.errorMessage}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                <div className="border-r border-zinc-800 space-y-1">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Cache Hit</span>
                  <div className={`font-extrabold ${selectedReq.cacheHit ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {selectedReq.cacheHit ? 'YES' : 'NO'}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Compliance</span>
                  <div className="font-extrabold text-emerald-400 flex items-center justify-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> GDPR
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
              <Terminal className="w-8 h-8 text-zinc-650 mb-3" />
              <span>Select a request log row to inspect complete execution trace.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
