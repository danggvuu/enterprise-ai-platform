'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Beaker, Send, Loader2, Bot, User, Settings, AlertTriangle, ShieldCheck, Zap, Server } from 'lucide-react';
import { ProviderInfo } from '@/lib/types';

export default function PlaygroundPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful, professional AI assistant.');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [strategy, setStrategy] = useState<string>('balanced');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchProviders = async () => {
    try {
      const data = await api.getProviders();
      setProviders(data || []);
      
      // Auto-select a model if none selected
      if (data && data.length > 0 && data[0].supportedModels.length > 0) {
        setSelectedModel(data[0].supportedModels[0]);
      }
    } catch (err) {
      console.error('Failed to fetch providers', err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedModel) return;

    const userMessage = { role: 'user', content: input };
    const chatHistory = [...messages, userMessage];
    
    setMessages(chatHistory);
    setInput('');
    setLoading(true);

    try {
      // Prepend system prompt for the API call
      const payloadMessages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.map(m => ({ role: m.role, content: m.content }))
      ];

      const res = await api.chatCompletion(payloadMessages, selectedModel, strategy);
      
      const assistantMessage = {
        role: 'assistant',
        content: res.choices?.[0]?.message?.content || 'No response',
        executionDetails: {
          providerId: res.providerId || 'unknown',
          modelId: res.modelId || selectedModel,
          latencyMs: res.latencyMs || 0,
          costUsd: res.costUsd || 0,
          cacheHit: res.isCacheHit || false,
        }
      };
      
      setMessages([...chatHistory, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      setMessages([
        ...chatHistory, 
        { 
          role: 'assistant', 
          content: 'Error: ' + (err.message || 'Failed to get response'),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const allModels = Array.from(new Set(providers.flatMap(p => p.supportedModels)));

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <header className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Beaker className="w-6 h-6 text-purple-500" /> AI Playground
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Test models, routing strategies, and policies in real-time.</p>
        </div>
      </header>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <Beaker className="w-12 h-12 mb-4 text-zinc-700" />
                <p>Send a message to start testing.</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'assistant' ? (msg.isError ? 'bg-red-900/50 text-red-500' : 'bg-purple-900/50 text-purple-400') : 'bg-blue-900/50 text-blue-400'
                  }`}>
                    {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div className={`max-w-[80%] ${msg.role === 'assistant' ? '' : 'flex flex-col items-end'}`}>
                    <div className={`p-4 rounded-xl text-sm ${
                      msg.role === 'assistant' 
                        ? (msg.isError ? 'bg-red-950 border border-red-900 text-red-200' : 'bg-zinc-800 text-zinc-200 rounded-tl-none') 
                        : 'bg-blue-600 text-white rounded-tr-none'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    
                    {/* Execution Details (Assistant Only) */}
                    {msg.role === 'assistant' && msg.executionDetails && (
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-zinc-500">
                        {msg.executionDetails.cacheHit && (
                          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                            <Zap className="w-3 h-3" /> Cache Hit
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Server className="w-3 h-3" /> {msg.executionDetails.providerId}
                        </span>
                        <span>{(msg.executionDetails.latencyMs / 1000).toFixed(2)}s</span>
                        <span>${(msg.executionDetails.costUsd || 0).toFixed(5)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-900/50 text-purple-400 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="p-4 rounded-xl text-sm bg-zinc-800 text-zinc-400 rounded-tl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-zinc-950 border-t border-zinc-800">
            <form onSubmit={handleSend} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || !selectedModel}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold text-sm cursor-pointer"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </form>
          </div>
        </div>

        {/* Configuration Sidebar */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto min-h-0">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4" /> Playground Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Target Model</label>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 appearance-none"
                >
                  {providers.length === 0 && <option value="">No providers available</option>}
                  {providers.map(p => {
                    const isProviderFree = p.id.toLowerCase().includes('groq') || p.id.toLowerCase().includes('ollama');
                    return (
                      <optgroup key={p.id} label={p.id.toUpperCase()}>
                        {p.supportedModels.map(m => {
                          const isFree = isProviderFree || m.endsWith(':free');
                          return (
                            <option key={`${p.id}-${m}`} value={m}>
                              {m} {isFree ? '(Free)' : '($)'}
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Routing Strategy</label>
                <select
                  value={strategy}
                  onChange={e => setStrategy(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 appearance-none"
                >
                  <option value="balanced">Balanced (Default)</option>
                  <option value="cost-optimized">Cost Optimized</option>
                  <option value="latency-optimized">Latency Optimized</option>
                  <option value="high-availability">High Availability</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-5 text-sm text-blue-200">
            <h4 className="font-semibold text-blue-400 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4" /> Live Interception
            </h4>
            <p className="text-xs text-blue-300/80 mb-3">
              Requests made from this playground pass through the Gateway in real-time.
            </p>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> PII Redaction is active</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Prompt Injection blocks are active</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Semantic Caching is active</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Audit logging is active</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
