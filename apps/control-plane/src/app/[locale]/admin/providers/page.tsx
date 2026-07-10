'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProviderInfo } from '@/lib/types';
import { Shield, Sparkles, CheckCircle, XCircle, Database, AlertOctagon, HelpCircle, ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import ProviderForm from './ProviderForm';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ProvidersPage() {
  const t = useTranslations('Admin');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('openai');
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: providers, isLoading, refetch } = useQuery({
    queryKey: ['adminProviders'],
    queryFn: () => api.getProviders(),
  });

  const { data: hardware } = useQuery({
    queryKey: ['adminHardware'],
    queryFn: () => api.getHardwareInfo(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'enabled' | 'disabled' }) =>
      api.updateProvider(id, status),
    onSuccess: () => {
      refetch();
    },
  });

  const handleToggle = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'enabled';
    toggleMutation.mutate({ id, status: nextStatus });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProvider(id),
    onSuccess: () => {
      refetch();
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this provider?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading || !providers) {
    return (
      <div className="space-y-6 animate-pulse">
        <h1 className="text-2xl font-extrabold text-zinc-100">Provider Hub</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-zinc-900 border border-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const selectedProvider = providers.find(p => p.id === selectedProviderId) || providers[0];

  if (!selectedProvider) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-100">{t('providers')}</h1>
            <p className="text-zinc-500 text-xs mt-1">{t('providersDesc')}</p>
          </div>
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Custom Provider
          </button>
        </div>
        {showAddForm && (
          <ErrorBoundary fallback={<div className="p-4 bg-red-950 text-red-500">Failed to load Provider Form</div>}>
            <ProviderForm 
              onSuccess={() => { setShowAddForm(false); refetch(); }} 
              onCancel={() => setShowAddForm(false)} 
            />
          </ErrorBoundary>
        )}
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 border border-zinc-850 rounded-xl text-center space-y-4">
          <Database className="w-12 h-12 text-zinc-700" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-400">No Providers Found</h3>
            <p className="text-xs text-zinc-500 max-w-md">You have not configured any AI providers yet. Click 'Add Custom Provider' to start connecting to OpenAI, Anthropic, or local endpoints.</p>
          </div>
        </div>
      </div>
    );
  }

  // Scoring weights representation in Radar (Mock scores based on real specs)
  const scoreData = selectedProviderId === 'openai'
    ? [
        { subject: 'Capability', score: 95 },
        { subject: 'Latency', score: 85 },
        { subject: 'Cost Control', score: 50 },
        { subject: 'Compliance', score: 90 },
        { subject: 'Availability', score: 99 },
        { subject: 'Context Window', score: 80 },
      ]
    : selectedProviderId === 'bedrock'
    ? [
        { subject: 'Capability', score: 90 },
        { subject: 'Latency', score: 75 },
        { subject: 'Cost Control', score: 65 },
        { subject: 'Compliance', score: 95 },
        { subject: 'Availability', score: 99 },
        { subject: 'Context Window', score: 85 },
      ]
    : [ // ollama
        { subject: 'Capability', score: 60 },
        { subject: 'Latency', score: 95 },
        { subject: 'Cost Control', score: 100 },
        { subject: 'Compliance', score: 100 }, // local GDPR safe
        { subject: 'Availability', score: 100 },
        { subject: 'Context Window', score: 40 },
      ];

  const totalScore = Math.round(scoreData.reduce((acc, curr) => acc + curr.score, 0) / scoreData.length);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-100">{t('providers')}</h1>
          <p className="text-zinc-500 text-xs mt-1">{t('providersDesc')}</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Custom Provider
        </button>
      </div>

      {showAddForm && (
        <ErrorBoundary fallback={<div className="p-4 bg-red-950 text-red-500">Failed to load Provider Form</div>}>
          <ProviderForm 
            onSuccess={() => { setShowAddForm(false); refetch(); }} 
            onCancel={() => setShowAddForm(false)} 
          />
        </ErrorBoundary>
      )}

      {/* Grid of providers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {providers.map((provider) => {
          const isSelected = selectedProviderId === provider.id;
          return (
            <div
              key={provider.id}
              onClick={() => setSelectedProviderId(provider.id)}
              className={`bg-zinc-900 border rounded-xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                isSelected ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-zinc-850 hover:border-zinc-800'
              }`}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-zinc-400" />
                    <span className="font-extrabold text-sm capitalize text-zinc-200">{provider.id}</span>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    provider.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {provider.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {provider.status.toUpperCase()}
                  </span>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Avg Latency</span>
                    <span className="text-zinc-300 font-semibold">{provider.latency} ms</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Availability</span>
                    <span className="text-zinc-300 font-semibold">{(provider.availability * 100).toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Success Rate</span>
                    <span className="text-zinc-300 font-semibold">{(provider.successRate * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Region</span>
                    <span className="text-zinc-300 font-semibold capitalize">{provider.region}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 pt-4 border-t border-zinc-800/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(provider.id);
                  }}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(provider.id, provider.status);
                  }}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-colors border ${
                    provider.status === 'active'
                      ? 'border-red-920 bg-red-950/20 text-red-400 hover:bg-red-950/40'
                      : 'border-emerald-920 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40'
                  }`}
                >
                  {provider.status === 'active' ? 'DISABLE' : 'ENABLE'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Score Explainer & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Radar chart explainer */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Score Engine Explainer</h3>
              <p className="text-[11px] text-zinc-500">Multivariable vector scoring metrics for provider evaluation.</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-zinc-500 font-bold uppercase">Weighted Rank Score</span>
              <span className="text-2xl font-black text-blue-500">{totalScore} <span className="text-xs text-zinc-500">/ 100</span></span>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={scoreData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" stroke="#a1a1aa" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#27272a" />
                <Radar
                  name={selectedProvider.id}
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capabilities card */}
        <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 capitalize">
            {selectedProvider.id} Capabilities
          </h3>

          <div className="space-y-4 text-xs text-zinc-300">
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Supported Models</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selectedProvider.supportedModels.map(m => (
                  <span key={m} className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono text-[10px]">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Gateway Configuration Details</span>
              <div className="space-y-2 mt-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800/60 font-mono text-[11px] text-zinc-400">
                <div className="flex justify-between">
                  <span>Context Limit:</span>
                  <span className="text-zinc-200">128,000 tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>Compliance:</span>
                  <span className="text-emerald-400">HIPAA, GDPR Safe</span>
                </div>
                <div className="flex justify-between">
                  <span>Streaming API:</span>
                  <span className="text-emerald-400">Supported</span>
                </div>
                <div className="flex justify-between">
                  <span>Vision Mode:</span>
                  <span className="text-zinc-500">Unsupported</span>
                </div>
                {selectedProviderId === 'ollama' && hardware?.ollama && (
                  <>
                    <div className="flex justify-between border-t border-zinc-800/60 pt-2 mt-2">
                      <span>Gateway Mode:</span>
                      <span className={hardware.ollama.status === 'Connected' ? 'text-emerald-400' : 'text-red-400'}>
                        {hardware.ollama.status === 'Connected' ? 'Embedded / Detected' : 'External / Offline'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ollama Version:</span>
                      <span className="text-zinc-200">{hardware.ollama.version}</span>
                    </div>
                    {hardware.ollama.models?.map((m: any) => (
                      <div key={m.name} className="flex justify-between text-[10px]">
                        <span>Loaded {m.name}:</span>
                        <span className="text-zinc-200">{m.sizeGb} GB | {m.parameterSize} | {m.quantization}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
