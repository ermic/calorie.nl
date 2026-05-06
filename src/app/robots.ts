import type { MetadataRoute } from 'next';

const PROD_HOST = 'calorietje.nl';

function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SERVER_URL;
  if (!env) return `https://${PROD_HOST}`;
  return env.replace(/\/+$/, '');
}

function isProd(url: string): boolean {
  try {
    return new URL(url).hostname === PROD_HOST;
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
