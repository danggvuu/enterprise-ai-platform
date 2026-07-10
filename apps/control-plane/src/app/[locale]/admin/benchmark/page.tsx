'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Activity, Play, Plus, Trash2, Loader2, Server, CheckCircle2, AlertTriangle, Zap, History } from 'lucide-react';
import { ProviderInfo } from '@/lib/types';

export default function BenchmarkLabPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [prompt, setPrompt] = useState('Explain quantum computing in one simple paragraph.');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  
  const [results, setResults] = useState<Record<string, {
    status: 'pending' | 'running' | 'success' | 'error';
    content?: string;
    latencyMs?: number;
    costUsd?: number;
    error?: string;
  }>>({});
  
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const data = await api.getProviders();
      setProviders(data || []);
      
      const allMods = (data || []).flatMap((p: any) => p.supportedModels);
      if (allMods.length > 0) {
        setSelectedModels([allMods[0]]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addModel = () => {
    const allMods = providers.flatMap(p => p.supportedModels);
    if (allMods.length > 0) {
      setSelectedModels([...selectedModels, allMods[0]]);
    }
  };

  const removeModel = (index: number) => {
    const newModels = [...selectedModels];
    newModels.splice(index, 1);
    setSelectedModels(newModels);
  };

  const updateModel = (index: number, model: string) => {
    const newModels = [...selectedModels];
    newModels[index] = model;
    setSelectedModels(newModels);
  };

  const runBenchmark = async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;
    
    setIsRunning(true);
    
    // Initialize results state
    const initialResults: any = {};
    selectedModels.forEach((m, idx) => {
      initialResults[`${m}-${idx}`] = { status: 'running' };
    });
    setResults(initialResults);

    // Run parallel tests
    const promises = selectedModels.map(async (model, idx) => {
      const key = `${model}-${idx}`;
      try {
        const payloadMessages = [{ role: 'user', content: prompt }];
        const res = await api.chatCompletion(payloadMessages, model, 'balanced');
        
        setResults(prev => ({
          ...prev,
          [key]: {
            status: 'success',
            content: res.choices?.[0]?.message?.content || 'No response',
            latencyMs: res.latencyMs,
            costUsd: res.costUsd
          }
        }));
      } catch (err: any) {
        setResults(prev => ({
          ...prev,
          [key]: {
            status: 'error',
            error: err.message || 'Failed'
          }
        }));
      }
    });

    await Promise.allSettled(promises);
    setIsRunning(false);
  };

  const allModels = Array.from(new Set(providers.flatMap(p => p.supportedModels)));

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-zinc-500"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-orange-500" /> Benchmark Lab
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Compare latency, cost, and response quality across multiple models simultaneously.</p>
        </div>
        <button 
          onClick={runBenchmark}
          disabled={isRunning || selectedModels.length === 0 || !prompt.trim()}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-orange-900/20"
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} 
          Run Benchmark
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-100 mb-4">Test Prompt</h3>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={6}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-orange-500 resize-none"
              placeholder="Enter the prompt to test across models..."
            />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-100">Models to Compare</h3>
              <button 
                onClick={addModel}
                className="text-xs flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Model
              </button>
            </div>
            
            <div className="space-y-3">
              {selectedModels.map((model, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                    {idx + 1}
                  </span>
                  <select
                    value={model}
                    onChange={(e) => updateModel(idx, e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 appearance-none"
                  >
                    {allModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => removeModel(idx)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {selectedModels.length === 0 && (
                <div className="text-sm text-zinc-500 text-center py-4 border border-dashed border-zinc-800 rounded-lg">
                  No models selected. Add models to compare.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {selectedModels.map((model, idx) => {
              const key = `${model}-${idx}`;
              const res = results[key];
              
              return (
                <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                  <div className="bg-zinc-950/50 p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                        {idx + 1}
                      </div>
                      <h3 className="font-semibold text-zinc-100">{model}</h3>
                    </div>
                    
                    {res && res.status === 'success' && (
                      <div className="flex gap-4 text-xs font-mono">
                        <span className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                          <Zap className="w-3 h-3" /> {(res.latencyMs! / 1000).toFixed(2)}s
                        </span>
                        <span className="flex items-center gap-1 text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                          <Activity className="w-3 h-3" /> ${(res.costUsd || 0).toFixed(5)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5 min-h-[120px]">
                    {!res ? (
                      <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic">
                        Ready to run
                      </div>
                    ) : res.status === 'running' ? (
                      <div className="h-full flex items-center justify-center text-zinc-400 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-orange-500" /> Generating response...
                      </div>
                    ) : res.status === 'error' ? (
                      <div className="h-full flex items-center justify-center text-red-400 gap-2">
                        <AlertTriangle className="w-5 h-5" /> {res.error}
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {res.content}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
