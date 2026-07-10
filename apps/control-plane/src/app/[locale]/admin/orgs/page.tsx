'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Building, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrgsPage() {
  const t = useTranslations('Admin');
  const { data: orgs, isLoading, refetch } = useQuery({
    queryKey: ['adminOrgs'],
    queryFn: () => api.getOrganizations(),
  });

  const [editName, setEditName] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ id, name, plan }: { id: string, name: string, plan: string }) => 
      api.updateOrganization(id, { name, plan }),
    onSuccess: () => {
      toast.success('Organization updated successfully');
      setEditingOrgId(null);
      refetch();
    },
  });

  const handleEdit = (org: any) => {
    setEditingOrgId(org.id);
    setEditName(org.name);
    setEditPlan(org.plan);
  };

  const handleSave = (id: string) => {
    mutation.mutate({ id, name: editName, plan: editPlan });
  };

  if (isLoading || !orgs) {
    return (
      <div className="space-y-6 animate-pulse">
        <h1 className="text-2xl font-extrabold text-zinc-100">{t('orgs')}</h1>
        <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-100">Organizations</h1>
          <p className="text-zinc-500 text-xs mt-1">{t('orgsDesc')}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Orgs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {orgs.map((org: any) => (
          <div key={org.id} className="bg-zinc-900 border border-zinc-850 p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Building className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex flex-col flex-1">
                {editingOrgId === org.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <span className="font-extrabold text-lg text-zinc-100">{org.name}</span>
                )}
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">ID: {org.id}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-zinc-800/40">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Current Plan</span>
                {editingOrgId === org.id ? (
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 w-full"
                  >
                    <option value="FREE">Free</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                ) : (
                  <span className="inline-block px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full">
                    {org.plan}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Created At</span>
                <span className="text-zinc-300 text-xs font-medium">
                  {new Date(org.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              {editingOrgId === org.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingOrgId(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(org.id)}
                    disabled={mutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{mutation.isPending ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleEdit(org)}
                  className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition-colors"
                >
                  Edit Settings
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
