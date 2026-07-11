'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Database, Search, Loader2, Server, CheckCircle2, Zap } from 'lucide-react';
import { ProviderInfo } from '@/lib/types';

export default function ModelCatalogPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const data = await api.getProviders();
      setProviders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const allModels = providers.flatMap(p => 
    p.supportedModels.map(m => ({ 
      modelId: m, 
      provider: p.id,
      status: p.status,
      latency: p.latency
    }))
  );

  const filteredModels = allModels.filter(m => 
    m.modelId.toLowerCase().includes(search.toLowerCase()) || 
    m.provider.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-zinc-500"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-500" /> Model Catalog
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Browse and search all AI models available across your connected providers.</p>
        </div>
      </header>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-4 bg-zinc-950/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search models or providers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="text-sm text-zinc-400">
            {filteredModels.length} Models Available
          </div>
        </div>

        {filteredModels.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <p>No models match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredModels.map((model, idx) => (
              <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/50 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-zinc-100 text-lg truncate pr-4" title={model.modelId}>
                    {model.modelId}
                  </h3>
                  <div className={`shrink-0 w-2 h-2 rounded-full mt-2 ${model.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                </div>
                
                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 flex items-center gap-1.5"><Server className="w-4 h-4" /> Provider</span>
                    <span className="text-zinc-300 font-medium">{model.provider}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 flex items-center gap-1.5"><Zap className="w-4 h-4" /> Avg Latency</span>
                    <span className="text-zinc-300">{model.latency > 0 ? `${model.latency.toFixed(0)}ms` : 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/50 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
