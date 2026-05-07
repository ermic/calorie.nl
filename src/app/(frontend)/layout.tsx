import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ServiceWorkerRegister } from '@/widgets/pwa';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const SITE_NAME = 'Calorietje';
const SITE_DESCRIPTION =
  'Calorieën tellen via een foto van je maaltijd of handmatig met de Nederlandse NEVO-database. Gratis te gebruiken met je eigen Gemini API-key.';
// Canonieke productie-hostnames. Nginx redirect bare naar www, maar de
// Next.js-app kan via NEXT_PUBLIC_SERVER_URL beide vormen zien afhankelijk
// van hoe de env is ingericht. Beide tellen als productie.
const PROD_HOSTS = ['www.calorietje.nl', 'calorietje.nl'] as const;
const FALLBACK_SITE_URL = `https://${PROD_HOSTS[0]}`;
// Een productie-host wordt alleen aangenomen als NEXT_PUBLIC_SERVER_URL
// expliciet is ingesteld en naar een PROD_HOSTS-entry wijst. Anders
// (lokaal, staging, of ontbrekende env) is isProd false → noindex blijft
// aan en JSON-LD blijft uit. De fallback voor siteUrl wordt alleen gebruikt
// voor metadataBase en canonical-URLs en mag niet leiden tot productie-flag.
const configuredSiteUrl = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/+$/, '');
const siteUrl = configuredSiteUrl ?? FALLBACK_SITE_URL;
const isProd = (() => {
  if (!configuredSiteUrl) return false;
  try {
    return (PROD_HOSTS as readonly string[]).includes(new URL(configuredSiteUrl).hostname);
  } catch {
    return false;
  }
})();
// Een malformed NEXT_PUBLIC_SERVER_URL mag de build niet laten crashen op
// `new URL(...)`. Valt-terug op de prod-fallback (die per definitie geldig is)
// zodat metadataBase altijd een geldig URL-object oplevert.
const metadataBaseUrl = (() => {
  try {
    return new URL(siteUrl);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
})();

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
  title: {
    default: `${SITE_NAME} — calorieën tellen met AI foto-herkenning`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Erik de Boer', url: 'https://jump.nl' }],
  creator: 'Erik de Boer',
  publisher: 'Erik de Boer',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  // Op niet-productie hosts (dev, staging) hard noindex om te voorkomen dat
  // crawlers per ongeluk een staging-URL indexeren — robots.ts doet hetzelfde
  // op directory-niveau, dit is defense-in-depth via meta-tag.
  robots: isProd
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    url: '/',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — calorieën tellen met AI foto-herkenning`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: `${SITE_NAME} — calorieën tellen met AI foto-herkenning`,
    description: SITE_DESCRIPTION,
    images: ['/icons/icon-512.png'],
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#ec8a2e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: 'nl-NL',
      publisher: { '@id': `${siteUrl}/#person` },
    },
    {
      '@type': 'Person',
      '@id': `${siteUrl}/#person`,
      name: 'Erik de Boer',
      url: `${siteUrl}/about`,
      email: 'calorietje@erikie.nl',
      worksFor: { '@type': 'Organization', name: 'jump.nl', url: 'https://jump.nl' },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {isProd ? (
          <script
            type="application/ld+json"
            // JSON.stringify is veilig: alle waardes zijn statische strings, geen user input.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ) : null}
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
