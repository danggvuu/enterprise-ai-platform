'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Plus, Folder, Star, Clock, User, LogOut, Code, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [workspace, setWorkspace] = useState('General');
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const [me, convos] = await Promise.all([
          api.getMe(),
          api.getConversations()
        ]);
        setUser(me);
        setConversations(convos);
      } catch (err) {
        console.error('Failed to load portal data', err);
        // If unauthenticated, api.ts automatically redirects to login
      }
    };
    init();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const handleNewChat = () => {
    window.location.href = '/en/portal'; // Reloads cleanly for a new chat
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } border-r border-zinc-900 bg-zinc-900/40 flex flex-col justify-between transition-all duration-300 relative z-20`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-10 w-6 h-6 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-200 cursor-pointer z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Top Section */}
        <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-6">
          {/* Logo / Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-lg shrink-0">
              <Code className="w-5 h-5" />
            </div>
            {!collapsed && (
              <span className="font-bold text-sm bg-gradient-to-r from-zinc-50 to-zinc-300 bg-clip-text text-transparent truncate">
                Enterprise AI Chat
              </span>
            )}
          </div>

          {/* New Chat Button */}
          <button 
            onClick={handleNewChat}
            className="flex items-center justify-center gap-2 w-full p-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-sm transition-all duration-150 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-zinc-400" />
            {!collapsed && <span>New Chat</span>}
          </button>

          {/* Workspaces List */}
          <div className="flex flex-col gap-2">
            {!collapsed && <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Workspace</span>}
            <select
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              className={`w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 ${collapsed ? 'hidden' : ''}`}
            >
              <option value="General">Personal Workspace</option>
              {user?.organizationId && <option value="Org">Organization Wide</option>}
            </select>
          </div>

          {/* History */}
          <div className="flex flex-col gap-2">
            {!collapsed && (
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400" /> Recent Conversations
              </span>
            )}
            {conversations.length === 0 && !collapsed && (
              <div className="text-xs text-zinc-600 p-2 italic">No recent chats</div>
            )}
            {conversations.map(item => (
              <div
                key={item.id}
                onClick={() => router.push(`/en/portal?c=${item.id}`)}
                className="flex items-center gap-2 p-2 hover:bg-zinc-900/60 rounded-lg text-xs text-zinc-400 cursor-pointer truncate"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                {!collapsed && <span className="truncate">{item.title}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Footer User Panel */}
        <div className="p-4 border-t border-zinc-900 flex flex-col gap-2 bg-zinc-900/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 shrink-0">
              <User className="w-4 h-4 text-zinc-300" />
            </div>
            {!collapsed && user && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-zinc-200 truncate">{user.firstName} {user.lastName}</span>
                <span className="text-[10px] text-zinc-500 truncate">{user.email}</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 mt-2 hover:bg-zinc-900 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950 relative z-10">
        {children}
      </main>
    </div>
  );
}
