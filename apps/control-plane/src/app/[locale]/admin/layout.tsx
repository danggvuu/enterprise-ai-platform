'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Activity, Database, GitMerge, FileCheck, Shield, BarChart3, Settings, BookOpen, Key, Users, History, AlertOctagon, Terminal } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Live Requests', href: '/admin/monitor', icon: Activity },
    { name: 'Providers', href: '/admin/providers', icon: Database },
    { name: 'Routing Engine', href: '/admin/routing', icon: GitMerge },
    { name: 'Policies', href: '/admin/policies', icon: FileCheck },
    { name: 'Cache', href: '/admin/cache', icon: History },
    { name: 'Costs', href: '/admin/costs', icon: BarChart3 },
    { name: 'Security', href: '/admin/security', icon: Shield },
    { name: 'Logs Explorer', href: '/admin/logs', icon: Terminal },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
    { name: 'Documentation', href: '/admin/docs', icon: BookOpen },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col justify-between">
        <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-6">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center font-bold text-xs">A</div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-200 uppercase">Gateway Control</span>
          </div>

          <nav className="flex flex-col gap-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900 text-blue-400 border border-zinc-800'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 bg-zinc-900/10">
          <span>Control Plane v1.0.0</span>
          <Link href="/" className="hover:text-zinc-300 font-semibold">&larr; Portal</Link>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
