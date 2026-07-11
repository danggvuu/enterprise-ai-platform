'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, FileCheck, HelpCircle, Save, Plus, Trash, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface Rule {
  id: string;
  field: string;
  op: string;
  value: string;
  actionField: string;
  actionValue: string;
  isNew?: boolean;
}

export default function PoliciesPage() {
  const t = useTranslations('Admin');
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const data = await api.getPolicies();
      // Map DB policy structure to simple rules array
      const mapped = data.map((p: any) => ({
        id: p.id,
        field: p.conditionLogic?.field || 'Contains PII',
        op: p.conditionLogic?.op || 'equals',
        value: p.conditionLogic?.value || '',
        actionField: p.actionLogic?.actionField || 'Reject Request',
        actionValue: p.actionLogic?.actionValue || '',
        isNew: false
      }));
      setRules(mapped.length ? mapped : [
        { id: '1', field: 'Contains PII', op: 'equals', value: 'true', actionField: 'Force Compliance Tag', actionValue: 'gdpr', isNew: true }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addRule = () => {
    setRules(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        field: 'Department',
        op: 'equals',
        value: 'Finance',
        actionField: 'Force Provider Limit',
        actionValue: 'ollama',
        isNew: true
      }
    ]);
  };

  const removeRule = async (id: string) => {
    const rule = rules.find(r => r.id === id);
    if (rule && !rule.isNew) {
      try {
        await api.deletePolicy(id);
      } catch (err) {
        console.error(err);
        return;
      }
    }
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const updateRule = (id: string, updates: Partial<Rule>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const savePolicies = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < rules.length; i++) {
        const r = rules[i];
        const payload = {
          name: `Policy ${i + 1}`,
          priority: i + 1,
          conditionLogic: { field: r.field, op: r.op, value: r.value },
          actionLogic: { actionField: r.actionField, actionValue: r.actionValue }
        };
        
        if (r.isNew) {
          const res = await api.createPolicy(payload);
          r.id = res.id;
          r.isNew = false;
        } else {
          await api.updatePolicy(r.id, payload);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
      fetchPolicies();
    }
  };

  if (loading) {
    return <div className="p-8 text-zinc-500 flex items-center gap-2"><RefreshCw className="w-5 h-5 animate-spin" /> Loading policies...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-100">{t('policies')}</h1>
        <p className="text-zinc-500 text-xs mt-1">{t('policiesDesc')}</p>
      </div>

      {/* Rules list builder card */}
      <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Visual Policy Engine Builder</h3>
          <button
            onClick={addRule}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Condition Rule</span>
          </button>
        </div>

        <div className="space-y-4">
          {rules.map((rule, idx) => (
            <div key={rule.id} className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-950/80 p-4 border border-zinc-850 rounded-xl relative group">
              {/* Trigger */}
              <div className="flex flex-col gap-1 w-full sm:w-1/3">
                <span className="text-[9px] text-zinc-500 font-bold uppercase">IF (Trigger Condition)</span>
                <div className="flex gap-2">
                  <select
                    value={rule.field}
                    onChange={(e) => updateRule(rule.id, { field: e.target.value })}
                    className="flex-1 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="Contains PII">Contains PII</option>
                    <option value="Current Month Cost (USD)">Current Month Cost (USD)</option>
                    <option value="Department">Department</option>
                    <option value="Client IP Region">Client IP Region</option>
                  </select>
                  <select
                    value={rule.op}
                    onChange={(e) => updateRule(rule.id, { op: e.target.value })}
                    className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="equals">equals</option>
                    <option value="greater than">greater than</option>
                    <option value="is in list">is in list</option>
                  </select>
                </div>
              </div>

              {/* Value */}
              <div className="flex flex-col gap-1 w-full sm:w-1/4">
                <span className="text-[9px] text-zinc-500 font-bold uppercase">VALUE</span>
                <input
                  type="text"
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                  className="p-2 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-200 focus:outline-none w-full"
                />
              </div>

              <div className="text-zinc-500 font-bold text-xs pt-4">&rarr;</div>

              {/* Action */}
              <div className="flex flex-col gap-1 w-full sm:w-1/3">
                <span className="text-[9px] text-zinc-500 font-bold uppercase">THEN (Rule Enforcement Action)</span>
                <div className="flex gap-2">
                  <select
                    value={rule.actionField}
                    onChange={(e) => updateRule(rule.id, { actionField: e.target.value })}
                    className="flex-1 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="Force Compliance Tag">Force Compliance Tag</option>
                    <option value="Downgrade Model">Downgrade Model</option>
                    <option value="Force Provider Limit">Force Provider Limit</option>
                    <option value="Reject Request">Reject Request</option>
                  </select>
                  <input
                    type="text"
                    value={rule.actionValue}
                    onChange={(e) => updateRule(rule.id, { actionValue: e.target.value })}
                    className="p-2 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-200 focus:outline-none w-24"
                  />
                </div>
              </div>

              {/* Trash */}
              <button
                onClick={() => removeRule(rule.id)}
                className="absolute right-2 top-2 sm:static p-2 hover:bg-zinc-800/40 rounded-lg text-zinc-500 hover:text-red-400 cursor-pointer"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Save bar */}
        <div className="pt-4 border-t border-zinc-800/40 flex items-center justify-end">
          <button onClick={savePolicies} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Policies Rules</span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl flex items-start gap-4">
        <Shield className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Policy Rules Evaluation Sequence</h4>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Policy rules are evaluated top-to-bottom sequentially within the API gateway route pre-flight request interceptor. Any matching rules immediately modify the downstream scoring weights or abort execution for reject codes.
          </p>
        </div>
      </div>
    </div>
  );
}
