import type { MetadataRoute } from 'next';

const PROD_HOST = 'calorietje.nl';

function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SERVER_URL;
  if (!env) return `https://${PROD_HOST}`;
  return env.replace(/\/+$/, '');
}

// Stabiele datum voor statische legal-/info-pagina's. Bij een echte
// inhoudelijke update bumpen we deze datum in dezelfde commit, zodat
// crawlers een eerlijk last-modified-signaal krijgen in plaats van
// "freshly updated" op elke deploy.
const LEGAL_LAST_UPDATED = new Date('2026-05-07');

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${base}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/forgot-password`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${base}/about`,
      lastModified: LEGAL_LAST_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${base}/privacy`,
      lastModified: LEGAL_LAST_UPDATED,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${base}/terms`,
      lastModified: LEGAL_LAST_UPDATED,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${base}/disclaimer`,
      lastModified: LEGAL_LAST_UPDATED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
