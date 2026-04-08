import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { DataProvider } from '@/components/layout/DataProvider';
import { IntelFilterProvider } from '@/components/layout/IntelFilterProvider';
import './globals.css';

// metadataBase makes every relative URL below resolve to absolute https
// links — required so Twitter / Telegram / WhatsApp can fetch the social
// card image when our URL is shared.
//
// Set NEXT_PUBLIC_SITE_URL in .env.production to override the default. The
// fallback is the post-migration apex (situationroom.space); historically
// this was hardcoded to v3.situationroom.space.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://situationroom.space';

const SITE_TITLE = 'The Situation Room';
const SITE_TAGLINE = 'Bitcoin & Global Macro Intelligence';
const SITE_DESCRIPTION =
  'A personalised Bitcoin and macro intelligence platform. Daily briefings, conviction scoring, and real-time data — your command centre for the state of Bitcoin and the world.';

// Social card title — longer form for richer link previews. Validators
// (Twitter Cards, opengraph.xyz) flag titles below ~50 chars as too short
// to drive engagement; 56 hits the recommended 50-60 sweet spot.
const SOCIAL_TITLE = 'The Situation Room — Bitcoin & Global Macro Intelligence';

// Social card description — same validators want 110-160 chars. The page
// <meta name="description"> stays at the longer SEO-focused copy above;
// this shorter version is optimised for link-preview engagement.
const SOCIAL_DESCRIPTION =
  'Daily Bitcoin briefings, macro context, conviction scoring, and live threat assessment — the situation room for serious bitcoiners and macro hawks.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_TITLE} — ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,

  // Browser tab + PWA install icons. Next.js automatically emits the right
  // <link rel="icon"> and <link rel="apple-touch-icon"> tags for these.
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },

  // PWA install manifest (background colour, name, install icons).
  manifest: '/manifest.json',

  // Open Graph — used by Facebook, LinkedIn, Telegram, WhatsApp, Discord
  // and most other link-preview consumers when the URL is shared.
  openGraph: {
    type:        'website',
    url:         SITE_URL,
    siteName:    SITE_TITLE,
    title:       SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    images: [
      {
        // 1200×630 banner — the canonical Open Graph aspect ratio. Twitter,
        // Facebook, LinkedIn, and Discord all crop or letterbox cleanly to
        // it. Width/height are advisory hints — link previewers verify the
        // real dimensions when they fetch the image.
        url:    '/icons/icon-1200.png',
        width:  1200,
        height: 630,
        alt:    SOCIAL_TITLE,
      },
    ],
  },

  // Twitter / X Card — large image variant so the preview takes up the
  // full width of the post instead of a tiny square thumbnail.
  twitter: {
    card:        'summary_large_image',
    title:       SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    images:      ['/icons/icon-1200.png'],
    site:        '@rich_rdctd',
    creator:     '@rich_rdctd',
  },
};

// themeColor moved out of metadata in Next 14+; lives on viewport now.
// This is the colour browsers use for the address bar / mobile chrome.
export const viewport: Viewport = {
  themeColor: '#3e2c1a',
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
            data-domains={process.env.NEXT_PUBLIC_UMAMI_DOMAINS ?? 'situationroom.space,v3.situationroom.space'}
          />
        )}
      </body>
    </html>
  );
}
