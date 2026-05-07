import type { MetadataRoute } from 'next';

// Canonieke productie-hostnames — moet synchroon blijven met de lijst in
// src/app/(frontend)/layout.tsx. Beide vormen tellen als productie zodat
// robots.txt op www en bare host hetzelfde gedrag vertoont.
const PROD_HOSTS = ['www.calorietje.nl', 'calorietje.nl'] as const;

function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SERVER_URL;
  if (!env) return `https://${PROD_HOSTS[0]}`;
  return env.replace(/\/+$/, '');
}

function isProd(url: string): boolean {
  try {
    return (PROD_HOSTS as readonly string[]).includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  // Niet-productie hosts (bv. devcc.erikdeboer.nl) krijgen een totaal-disallow
  // zodat dev/staging nooit per ongeluk wordt geïndexeerd.
  if (!isProd(base)) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/admin/',
          '/dashboard',
          '/profile',
          '/meals',
          '/add-meal',
          '/reset-password',
          '/~offline',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
