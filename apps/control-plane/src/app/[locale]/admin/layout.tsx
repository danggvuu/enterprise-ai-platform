'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { LayoutDashboard, Activity, Database, GitMerge, FileCheck, Shield, BarChart3, Settings, BookOpen, Key, Users, History, AlertOctagon, Terminal, Building, Beaker, User, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { PageTransition } from '@/components/ui/page-transition';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Sidebar');
  const [collapsed, setCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const me = await api.getMe();
        setUser(me);
      } catch (err) {
        console.error('Failed to load admin user data', err);
      }
    };
    init();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const navigation = [
    { name: t('dashboard'), href: `/${locale}/admin/dashboard`, icon: LayoutDashboard },
    { name: t('users'), href: `/${locale}/admin/users`, icon: Users },
    { name: t('orgs'), href: `/${locale}/admin/orgs`, icon: Building },
    { name: t('monitor'), href: `/${locale}/admin/monitor`, icon: Activity },
    { name: t('providers'), href: `/${locale}/admin/providers`, icon: Database },
    { name: t('routing'), href: `/${locale}/admin/routing`, icon: GitMerge },
    { name: t('policies'), href: `/${locale}/admin/policies`, icon: FileCheck },
    { name: t('cache'), href: `/${locale}/admin/cache`, icon: History },
    { name: t('costs'), href: `/${locale}/admin/costs`, icon: BarChart3 },
    { name: t('security'), href: `/${locale}/admin/security`, icon: Shield },
    { name: t('logs'), href: `/${locale}/admin/logs`, icon: Terminal },
    { name: 'AI Playground', href: `/${locale}/admin/playground`, icon: Beaker },
    { name: 'API Keys', href: `/${locale}/admin/api-keys`, icon: Key },
    { name: 'Model Catalog', href: `/${locale}/admin/models`, icon: Database },
    { name: 'Benchmark Lab', href: `/${locale}/admin/benchmark`, icon: Activity },
    { name: t('settings'), href: `/${locale}/admin/settings`, icon: Settings },
    { name: t('docs'), href: `/${locale}/admin/docs`, icon: BookOpen },
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

        <div className="p-4 border-t border-zinc-900 flex flex-col gap-3 bg-zinc-900/10">
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setIsProfileOpen(true)}
              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 shrink-0 cursor-pointer hover:bg-zinc-700 transition-colors"
            >
              <User className="w-4 h-4 text-zinc-300" />
            </div>
            {user && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-zinc-200 truncate">{user.firstName} {user.lastName}</span>
                <span className="text-[10px] text-zinc-500 truncate">{user.email}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Link
              href={`/${locale}/portal`}
              className="flex items-center gap-2 p-2 hover:bg-zinc-900 text-xs text-blue-400 hover:text-blue-300 rounded-lg cursor-pointer"
            >
              <span>&larr; {t('portal')}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 hover:bg-zinc-900 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 relative z-10">
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>
      
      <ProfileModal 
        user={user} 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        onUpdate={setUser} 
      />
    </div>
  );
}
