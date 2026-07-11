'use client';

import React from 'react';
import { BookOpen, Terminal, Code, Settings } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-100">Gateway Documentation</h1>
        <p className="text-zinc-500 text-xs mt-1">Access Swagger UI logs, system-wide schemas, and release architectures.</p>
      </div>

      {/* Docs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Interactive Swagger Schema Documentation</h3>
            <Code className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The Swagger UI interactive sandbox is served natively from the gateway backend on port 3000. Use it to build test scripts and mock requests.
          </p>
          <div className="pt-2">
            <a
              href="http://localhost:3000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              <span>Open Swagger Panel API Sandbox</span>
              <Terminal className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Local architecture overview */}
        <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">System Architecture Info</h3>

          <div className="space-y-4 text-xs text-zinc-400">
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Gateway Core Ports</span>
              <div className="space-y-2 mt-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800/60 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>AI Gateway API:</span>
                  <span className="text-zinc-200">Port 3000</span>
                </div>
                <div className="flex justify-between">
                  <span>Jaeger UI:</span>
                  <span className="text-zinc-200">Port 16686</span>
                </div>
                <div className="flex justify-between">
                  <span>Prometheus UI:</span>
                  <span className="text-zinc-200">Port 9090</span>
                </div>
                <div className="flex justify-between">
                  <span>Ollama Local:</span>
                  <span className="text-zinc-200">Port 11434</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Gateway Release Note</span>
              <p className="text-[11px] leading-relaxed mt-1 text-zinc-500">
                v1.0.0 is the baseline release featuring Multi-Variable Dynamic score routing, Circuit Breakers, Semantic Cache, and PII guardrails.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
