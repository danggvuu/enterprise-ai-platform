import "../globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "react-hot-toast";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

export const metadata = {
  title: "Enterprise AI Platform",
  description: "Dynamic AI Gateway Control Plane and Employee Portal",
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              var theme = localStorage.getItem('theme');
              if (theme === 'light') {
                document.documentElement.classList.remove('dark');
              } else if (theme === 'system') {
                if (!window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.remove('dark');
                }
              }
            } catch (e) {}
          `
        }} />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50 antialiased selection:bg-zinc-800">
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
          <Toaster position="bottom-right" toastOptions={{
            style: {
              background: '#18181b',
              color: '#e4e4e7',
              border: '1px solid #27272a',
            }
          }} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
