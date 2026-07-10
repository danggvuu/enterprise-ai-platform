'use client';

import React, { useState, useEffect } from 'react';
import { Save, Settings2, Moon, Sun, Monitor, Globe, Server } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');
  const [defaultModel, setDefaultModel] = useState('llama3.2');
  const [saved, setSaved] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from local storage on mount
    setTheme(localStorage.getItem('theme') || 'dark');
    setLanguage(localStorage.getItem('language') || 'en');
    setDefaultModel(localStorage.getItem('defaultModel') || 'llama3.2');
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  }, [theme, isLoaded]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('theme', theme);
    localStorage.setItem('language', language);
    localStorage.setItem('defaultModel', defaultModel);
    
    // Change route if language changed
    const currentPath = window.location.pathname;
    const pathWithoutLocale = currentPath.split('/').slice(2).join('/');
    window.location.href = `/${language}/${pathWithoutLocale}`;
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-blue-500" /> {t('title')}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">{t('description')}</p>
        </div>
      </header>

      <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden max-w-3xl">
        <div className="p-6 space-y-8">
          
          {/* Theme */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-200 border-b border-zinc-800 pb-2">{t('appearance')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-colors ${theme === 'dark' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}>
                <input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={() => setTheme('dark')} className="hidden" />
                <Moon className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">{t('darkMode')}</span>
              </label>
              <label className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-colors ${theme === 'light' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}>
                <input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={() => setTheme('light')} className="hidden" />
                <Sun className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">{t('lightMode')}</span>
              </label>
              <label className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-colors ${theme === 'system' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}>
                <input type="radio" name="theme" value="system" checked={theme === 'system'} onChange={() => setTheme('system')} className="hidden" />
                <Monitor className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">{t('systemDefault')}</span>
              </label>
            </div>
          </section>

          {/* Language */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-200 border-b border-zinc-800 pb-2">{t('language')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-colors ${language === 'en' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}>
                <input type="radio" name="language" value="en" checked={language === 'en'} onChange={() => setLanguage('en')} className="hidden" />
                <Globe className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">{t('english')}</span>
              </label>
              <label className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-colors ${language === 'vi' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}>
                <input type="radio" name="language" value="vi" checked={language === 'vi'} onChange={() => setLanguage('vi')} className="hidden" />
                <Globe className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">{t('vietnamese')}</span>
              </label>
              <label className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-colors ${language === 'ja' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}>
                <input type="radio" name="language" value="ja" checked={language === 'ja'} onChange={() => setLanguage('ja')} className="hidden" />
                <Globe className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">{t('japanese')}</span>
              </label>
            </div>
          </section>

          {/* AI Provider Defaults */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-200 border-b border-zinc-800 pb-2">{t('aiProvider')}</h2>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('defaultModel')}</label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <select 
                  value={defaultModel}
                  onChange={e => setDefaultModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="llama3.2">llama3.2 (Local Ollama - FREE)</option>
                  <option value="qwen2.5:3b">qwen2.5:3b (Local Ollama - FREE)</option>
                  <option value="gpt-4o">gpt-4o (OpenAI)</option>
                  <option value="anthropic.claude-3-sonnet">claude-3-sonnet (AWS)</option>
                </select>
              </div>
              <p className="text-xs text-zinc-500 mt-2">{t('modelDesc')}</p>
            </div>
          </section>
        </div>

        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end items-center gap-4">
          {saved && <span className="text-sm text-emerald-500 font-medium animate-pulse">{t('saved')}</span>}
          <button 
            type="submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" /> {t('saveChanges')}
          </button>
        </div>
      </form>
    </div>
  );
}
