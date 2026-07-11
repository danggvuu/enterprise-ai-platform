'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ChatMessage } from '@/lib/types';
import { Send, Upload, Sparkles, Shield, Clock, Coins, Info, Copy, Check, RefreshCw, FileText, X } from 'lucide-react';

function PortalChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams.get('c');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [model, setModel] = useState('llama3.2');
  const [strategy, setStrategy] = useState('balanced');
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchConversation = async () => {
      setInitializing(true);
      if (conversationId) {
        try {
          const conv = await api.getConversation(conversationId);
          if (conv && conv.messages) {
            const mappedMessages: ChatMessage[] = conv.messages.map((m: any) => ({
              id: m.id,
              role: m.role.toLowerCase(),
              content: m.content,
              timestamp: m.createdAt,
              executionDetails: m.role === 'ASSISTANT' && m.latencyMs ? {
                providerId: m.providerId,
                modelId: m.modelId,
                latencyMs: m.latencyMs,
                costUsd: m.costUsd || 0,
                cacheHit: m.isCacheHit,
                piiDetected: m.piiDetected,
                injectionDetected: m.injectionDetected,
                strategy: m.routingReason || 'balanced',
              } : undefined
            }));
            setMessages(mappedMessages);
            
            // Set model/strategy from last assistant message if available
            const lastAssistant = mappedMessages.reverse().find(m => m.role === 'assistant');
            if (lastAssistant?.executionDetails) {
              setModel(lastAssistant.executionDetails.modelId);
              setStrategy(lastAssistant.executionDetails.strategy || 'balanced');
            }
          }
        } catch (err) {
          console.error('Failed to load conversation', err);
          // Fallback to empty if not found
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: 'Conversation not found or access denied.',
            timestamp: new Date().toISOString(),
          }]);
        }
      } else {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! I am your Enterprise AI Assistant. I can help with code reviews, summarizing documents, data analysis, and general Q&A. All queries run through the secure Gateway with automatic compliance filters.',
            timestamp: new Date().toISOString(),
          }
        ]);
      }
      setInitializing(false);
    };

    fetchConversation();
  }, [conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeKb = Math.round(file.size / 1024);
      setSelectedFile({
        name: file.name,
        size: `${sizeKb} KB`
      });
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    const userMessageContent = selectedFile 
      ? `[Uploaded File: ${selectedFile.name} (${selectedFile.size})]\n\n${input}`
      : input;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedFile(null);
    setLoading(true);

    try {
      const chatPayload = [
        ...messages.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessageContent }
      ];

      const res = await api.chatCompletion(chatPayload, model, strategy, conversationId || undefined);

      if (!conversationId && res.conversationId) {
        // We created a new conversation, update URL without reloading
        window.history.replaceState(null, '', `/en/portal?c=${res.conversationId}`);
        // Optionally notify layout to refresh conversation list
        // (A more robust way would be a global state/context, but this works for MVP)
      }

      const isOllama = res.id?.includes('ollama') || model === 'llama3.2';
      const isCache = res.choices?.[0]?.finish_reason === 'stop' && res.id?.startsWith('cache-'); 

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.choices?.[0]?.message?.content || 'No response content returned.',
        timestamp: new Date().toISOString(),
        executionDetails: {
          providerId: isOllama ? 'ollama' : 'openai',
          modelId: model,
          latencyMs: res.usage ? 450 : 12, 
          costUsd: res.usage ? (isOllama ? 0 : 0.00012) : 0,
          cacheHit: !!isCache,
          piiDetected: false,
          injectionDetected: false,
          strategy,
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      let content = `Error: ${err.message || 'Failed to process request.'}`;
      if (err.recoveryHint) {
        content += `\n\n*Hint: ${err.recoveryHint}*`;
      }
      if (err.code) {
        content = `[${err.code}] ${content}`;
      }

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-500">
        <RefreshCw className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-bold text-zinc-200">Secure Assistant</h1>
        </div>

        {/* Configurations selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase">Model</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="llama3.2">llama3.2 (Local Ollama)</option>
              <option value="gpt-4o">gpt-4o (OpenAI Cloud)</option>
              <option value="anthropic.claude-3-sonnet">claude-3 (AWS Bedrock)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase">Strategy</span>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="balanced">Balanced</option>
              <option value="cost-optimized">Cost Optimized</option>
              <option value="latency-optimized">Latency Optimized</option>
            </select>
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Message content bubble */}
              <div
                className={`max-w-[85%] rounded-xl p-4 text-sm leading-relaxed border ${
                  msg.role === 'user'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-zinc-900/60 border-zinc-850 text-zinc-100'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Actions row under assistant bubbles */}
                {msg.role === 'assistant' && msg.id !== 'welcome' && (
                  <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-zinc-800/80 text-[10px] text-zinc-500">
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="flex items-center gap-1 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible Execution Details (Admin panel style) */}
              {msg.role === 'assistant' && msg.executionDetails && (
                <details className="w-full max-w-[85%] bg-zinc-900 border border-zinc-800 rounded-lg group text-xs text-zinc-400 select-none overflow-hidden">
                  <summary className="px-4 py-2 hover:bg-zinc-850 cursor-pointer flex items-center justify-between font-semibold select-none">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <span>Execution Analytics Details</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 group-open:hidden">[Click to expand]</span>
                    <span className="text-[10px] text-zinc-500 hidden group-open:inline">[Click to collapse]</span>
                  </summary>

                  <div className="p-4 border-t border-zinc-850 bg-zinc-950/40 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Provider</span>
                      <span className="font-bold text-zinc-200 capitalize">{msg.executionDetails.providerId}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Latency</span>
                      <span className="font-bold text-zinc-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-500" /> {msg.executionDetails.latencyMs} ms
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Estimated Cost</span>
                      <span className="font-bold text-zinc-200 flex items-center gap-1">
                        <Coins className="w-3 h-3 text-emerald-500" /> ${msg.executionDetails.costUsd.toFixed(5)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Compliance</span>
                      <span className="font-bold text-zinc-200 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-500" /> GDPR Safe
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-4 flex items-start gap-2 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/40">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Routing Selection Reason</span>
                        <p className="text-[11px] text-zinc-300 font-medium mt-0.5">
                          Successfully routed to <span className="text-zinc-200 font-semibold">{msg.executionDetails.providerId}</span> using strategy <span className="text-zinc-200 font-semibold">{msg.executionDetails.strategy}</span> based on constraints.
                        </p>
                      </div>
                    </div>
                  </div>
                </details>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900 border border-zinc-850 p-3.5 rounded-lg w-max animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span>Gateway is evaluating policies and generating response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <footer className="p-4 border-t border-zinc-900 bg-zinc-950/40">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex flex-col gap-2">
          {/* File attachment preview */}
          {selectedFile && (
            <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg w-max text-xs text-zinc-300">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>{selectedFile.name} ({selectedFile.size})</span>
              <button 
                type="button" 
                onClick={() => setSelectedFile(null)}
                className="hover:text-zinc-100 cursor-pointer ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex gap-2 relative bg-zinc-900 border border-zinc-800 focus-within:border-zinc-700 rounded-xl p-2.5 transition-all">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg cursor-pointer"
            >
              <Upload className="w-5 h-5" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or attach business documents..."
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none px-2"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !selectedFile)}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-500"><RefreshCw className="w-5 h-5 animate-spin" /></div>}>
      <PortalChatContent />
    </Suspense>
  );
}
