/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Nooit gebruiker-specifieke responses cachen in de service-worker. Als
// twee users hetzelfde device delen mag user B geen stale data van
// user A zien. Meerdere vectoren blokkeren:
//   - /api/*, /admin/*              → user-scoped REST en CMS
//   - ?_rsc=... of 'RSC: 1' header  → Next App Router RSC-prefetches
//     (bevatten server-rendered markup van private pages)
//   - navigation-requests naar niet-publieke paden → SSR-HTML met
//     user-data voor /, /meals, /add-meal, /profile, ...
// defaultCache's NetworkFirst voor documents zou anders cached HTML
// kunnen teruggeven aan een andere user. Publieke paden (/login,
// /register, /~offline) mogen wél cached blijven voor snel herladen.
const userScopedPatterns = [/^\/api\//, /^\/admin(\/|$)/];
const PUBLIC_PATHS = ['/login', '/register', '/~offline'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const runtimeCaching = [
  {
    matcher: ({ url, request }: { url: URL; request: Request }) => {
      if (url.origin !== self.location.origin) return false;
      if (userScopedPatterns.some((re) => re.test(url.pathname))) return true;
      if (url.searchParams.has('_rsc')) return true;
      if (request.headers.get('RSC') === '1') return true;
      if (request.mode === 'navigate' && !isPublicPath(url.pathname)) return true;
      return false;
    },
    handler: new NetworkOnly(),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();
