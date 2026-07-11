'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Key, Copy, Plus, Trash2, Shield, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  
  // State for newly created key to show it once
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<any>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const data = await api.getApiKeys();
      setKeys(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await api.createApiKey(newKeyName);
      setNewlyCreatedKey(res);
      setNewKeyName('');
      setShowCreateModal(false);
      fetchKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone and any applications using it will immediately lose access.')) return;
    try {
      await api.revokeApiKey(id);
      fetchKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-zinc-500"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Key className="w-6 h-6 text-emerald-500" /> API Keys
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Manage API keys used by your applications to access the Gateway.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Key
        </button>
      </header>

      {newlyCreatedKey && (
        <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-900/50 rounded-full text-emerald-400">
              <Shield className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-emerald-400">New API Key Created: {newlyCreatedKey.name}</h3>
              <p className="text-zinc-300 mt-1 mb-4 text-sm">
                Please copy this key now. For security reasons, you will <strong>never</strong> be able to view it again.
              </p>
              <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <code className="text-sm font-mono text-zinc-200 break-all flex-1">
                  {newlyCreatedKey.key}
                </code>
                <button 
                  onClick={() => copyToClipboard(newlyCreatedKey.key)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer shrink-0"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <button 
                onClick={() => setNewlyCreatedKey(null)}
                className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                I have saved it securely
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center mb-4">
              <Key className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">No API Keys</h3>
            <p className="text-zinc-500 max-w-md mt-2">You haven't created any API keys yet. Create one to allow your applications to connect to the Gateway.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/50 text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Key (Masked)</th>
                <th className="px-6 py-3 font-semibold">Created</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {keys.map(k => (
                <tr key={k.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-200">
                    {k.name}
                  </td>
                  <td className="px-6 py-4">
                    <code className="font-mono text-zinc-400 text-xs bg-zinc-950 px-2 py-1 rounded">
                      {k.maskedKey}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRevoke(k.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-md transition-colors cursor-pointer"
                      title="Revoke Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-500" /> Create API Key
            </h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Key Name / Description</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Production Web App"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newKeyName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
