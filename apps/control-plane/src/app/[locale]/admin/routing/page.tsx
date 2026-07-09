'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Shield, Sparkles, AlertCircle, GitFork, Check, ArrowRight, CornerDownRight } from 'lucide-react';

export default function RoutingPage() {
  const [selectedNode, setSelectedNode] = useState<string | null>('router');

  const { data: config, refetch } = useQuery({
    queryKey: ['routingConfig'],
    queryFn: () => api.getRoutingConfig(),
  });

  const mutation = useMutation({
    mutationFn: (newStrategy: string) => api.updateRoutingConfig(newStrategy),
    onSuccess: () => {
      refetch();
    },
  });

  const handleStrategyChange = (strategy: string) => {
    mutation.mutate(strategy);
  };

  const currentStrategy = config?.strategy || 'balanced';

  const nodes = [
    { id: 'scan', label: 'Prompt Scanner', status: 'Success', details: 'Scanning input for script tags and injection patterns.' },
    { id: 'pii', label: 'PII Detector', status: 'Success', details: 'Vietnamese regex CCCD/phone checker executed. 0 leaks blocked.' },
    { id: 'policy', label: 'Routing Policy Engine', status: 'Success', details: `Active rules matched. Evaluating strategies against: ${currentStrategy}.` },
    { id: 'score', label: 'Provider Score Engine', status: 'Success', details: 'Scores calculated: Ollama (92), OpenAI (85), Bedrock (72).' },
    { id: 'router', label: 'Dynamic Router Decision', status: 'Success', details: 'Selected Ollama local model based on Cost Optimized strategy.' },
    { id: 'circuit', label: 'Circuit Breaker Check', status: 'Closed', details: 'All circuits verified CLOSED. Proceeding to adapter dispatch.' },
  ];

  const strategiesList = [
    { name: 'balanced', label: 'Balanced Strategy', desc: 'Weights health, latency, and cost variables evenly.' },
    { name: 'cost-optimized', label: 'Cost Optimized Strategy', desc: 'Prioritizes free/low-cost adapters (Ollama local).' },
    { name: 'latency-optimized', label: 'Latency Optimized Strategy', desc: 'Routes to fastest response times (OpenAI Cloud).' },
    { name: 'high-availability', label: 'High Availability Strategy', desc: 'Aggressively avoids failing endpoints using circuit breakers.' },
  ];

  const activeNode = nodes.find(n => n.id === selectedNode);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-100">Routing Center</h1>
        <p className="text-zinc-500 text-xs mt-1">Visualize global router pathfinding and set global optimization weight strategies.</p>
      </div>

      {/* Global strategy selector panel */}
      <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Global Routing Strategy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {strategiesList.map((strat) => {
            const isSelected = currentStrategy === strat.name;
            return (
              <div
                key={strat.name}
                onClick={() => handleStrategyChange(strat.name)}
                className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-600/5 text-blue-400'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>{strat.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </div>
                <p className="text-[10px] text-zinc-500 mt-2">{strat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Pipeline flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Animated Flow Layout */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-6 flex flex-col justify-center min-h-[350px]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Request Routing Pipeline Flow</h3>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-8">
            {nodes.map((node, i) => {
              const isSelected = selectedNode === node.id;
              return (
                <React.Fragment key={node.id}>
                  <div
                    onClick={() => setSelectedNode(node.id)}
                    className={`flex flex-col items-center justify-center p-3 text-center border rounded-xl cursor-pointer transition-all duration-150 w-full md:w-32 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600/5 ring-1 ring-blue-500/20'
                        : 'border-zinc-800 hover:border-zinc-750 bg-zinc-950/40'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-zinc-200 truncate max-w-full">{node.label}</span>
                    <span className="text-[9px] text-emerald-400 font-semibold mt-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {node.status}
                    </span>
                  </div>
                  {i < nodes.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-zinc-700 hidden md:block shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Node detail side card */}
        <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Node Inspector</h3>
            <GitFork className="w-4 h-4 text-zinc-500" />
          </div>

          {activeNode ? (
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Stage Name</span>
                <div className="font-extrabold text-zinc-200 text-sm">{activeNode.label}</div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Execution Details</span>
                <p className="text-zinc-400 leading-relaxed bg-zinc-950 p-3.5 rounded-lg border border-zinc-800">
                  {activeNode.details}
                </p>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Telemetry Context</span>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/60 font-mono text-[10px] text-zinc-500 space-y-1">
                  <div>status: &quot;success&quot;</div>
                  <div>skipped: false</div>
                  <div>exec_time_ms: 1.2</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
              <GitFork className="w-8 h-8 text-zinc-650 mb-3" />
              <span>Click on any pipeline node to inspect execution logic details.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
