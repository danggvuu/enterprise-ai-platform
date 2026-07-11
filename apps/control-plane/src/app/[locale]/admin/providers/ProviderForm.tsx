import React, { useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader2, Plus, Server, Key, Globe, Search, Play, Trash2 } from 'lucide-react';

export default function ProviderForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    providerType: 'OPENAI',
    baseUrl: '',
    apiKey: '',
  });
  
  const [testing, setTesting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      await api.testProvider({
        providerType: formData.providerType,
        baseUrl: formData.baseUrl,
        apiKey: formData.apiKey
      });
      toast.success('Connection successful!');
      setStep(2); // Move to discovery
    } catch (e: any) {
      toast.error(e.message || 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await api.discoverModels({
        providerType: formData.providerType,
        baseUrl: formData.baseUrl,
        apiKey: formData.apiKey
      });
      if (res.models && res.models.length > 0) {
        setModels(res.models.map((m: string) => ({ modelId: m, contextWindow: 8192, promptCostPer1k: 0, completionCostPer1k: 0 })));
        toast.success(`Found ${res.models.length} models`);
        setStep(3); // Move to review
      } else {
        toast.error('No models found');
      }
    } catch (e: any) {
      toast.error(e.message || 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.addProvider({
        ...formData,
        models
      });
      toast.success('Provider added successfully');
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add provider');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-500" />
            Add Custom Provider
          </h2>
          <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-300">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Step 1: Connection Details */}
          <div className={`space-y-4 ${step !== 1 && 'opacity-50 pointer-events-none'}`}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">1. Connection Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-bold uppercase">Provider Name (Unique ID)</label>
                <input 
                  type="text" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
                  placeholder="e.g. My Azure OpenAI"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-bold uppercase">Provider Type</label>
                <select 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
                  value={formData.providerType}
                  onChange={(e) => setFormData({...formData, providerType: e.target.value})}
                >
                  <option value="OPENAI">OpenAI Compatible (OpenRouter, Groq, Together)</option>
                  <option value="OLLAMA">Ollama (Local / Remote)</option>
                </select>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs text-zinc-500 font-bold uppercase">Base URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
                    placeholder="https://api.openai.com or http://localhost:11434"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({...formData, baseUrl: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs text-zinc-500 font-bold uppercase">API Key (Optional for Ollama)</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input 
                    type="password" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
                    placeholder="sk-..."
                    value={formData.apiKey}
                    onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            {step === 1 && (
              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleTest}
                  disabled={!formData.name || testing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Test Connection
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Model Discovery */}
          {step >= 2 && (
            <div className={`space-y-4 ${step !== 2 && 'opacity-50 pointer-events-none'}`}>
              <div className="h-px w-full bg-zinc-800 my-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">2. Auto-Discover Models</h3>
              <p className="text-xs text-zinc-500">
                We will query `{formData.baseUrl}/v1/models` (or `/api/tags` for Ollama) to automatically import supported models.
              </p>
              {step === 2 && (
                <div className="flex justify-start">
                  <button 
                    onClick={handleDiscover}
                    disabled={discovering}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Discover Models
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review Models */}
          {step >= 3 && (
            <div className={`space-y-4`}>
              <div className="h-px w-full bg-zinc-800 my-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">3. Review Models ({models.length})</h3>
              
              <div className="max-h-48 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg p-2 space-y-1">
                {models.map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-zinc-900 p-2 rounded">
                    <span className="text-sm text-zinc-200 font-mono">{m.modelId}</span>
                    <button 
                      onClick={() => setModels(models.filter((_, i) => i !== idx))}
                      className="text-zinc-600 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleSave}
                  disabled={saving || models.length === 0}
                  className="bg-white hover:bg-zinc-200 text-black px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Save Provider
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
