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
const PROD_HOST = 'calorietje.nl';
const siteUrl = (process.env.NEXT_PUBLIC_SERVER_URL ?? `https://${PROD_HOST}`).replace(/\/+$/, '');
const isProd = (() => {
  try {
    return new URL(siteUrl).hostname === PROD_HOST;
  } catch {
    return false;
  }
})();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — calorieën tellen met AI foto-herkenning`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
