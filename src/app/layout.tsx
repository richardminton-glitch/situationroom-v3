import type { Metadata } from 'next';
import Script from 'next/script';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { DataProvider } from '@/components/layout/DataProvider';
import { IntelFilterProvider } from '@/components/layout/IntelFilterProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Situation Room — Bitcoin & Macro Intelligence',
  description: 'A personalised Bitcoin and macro intelligence platform. Daily briefings, conviction scoring, and real-time data — your command centre for the state of Bitcoin and the world.',
  openGraph: {
    title: 'The Situation Room',
    description: 'Bitcoin & Macro Intelligence Platform',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="parchment" className="h-full" suppressHydrationWarning>
      <head>
        {/* Blocking theme script — runs before first paint to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sr-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');document.documentElement.classList.add('dark')}else{document.documentElement.setAttribute('data-theme',t||'parchment')}}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=IM+Fell+English:ital@0;1&family=IBM+Plex+Mono:wght@400;500;700&family=JetBrains+Mono:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col antialiased relative z-10">
        <AuthProvider>
          <ThemeProvider>
            <DataProvider>
              <IntelFilterProvider>
                {children}
              </IntelFilterProvider>
            </DataProvider>
          </ThemeProvider>
        </AuthProvider>
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            async
            src="/metrics.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            data-domains="v3.situationroom.space"
          />
        )}
      </body>
    </html>
  );
}
