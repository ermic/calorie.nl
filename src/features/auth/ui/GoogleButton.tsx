'use client';

import { useSearchParams } from 'next/navigation';

type GoogleButtonProps = {
  intent?: 'login' | 'link';
  label?: string;
  className?: string;
};

// Pure link-as-button naar de start-route. Geen JS-state nodig — server-
// redirect doet het werk. Pakt redirectTo van de huidige URL op zodat
// de user na succesvolle login terugkomt waar 'ie was.
export function GoogleButton({ intent = 'login', label, className }: GoogleButtonProps) {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams?.get('redirectTo');
  const redirectTo =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';

  const href = `/api/auth/google/start?intent=${intent}&redirectTo=${encodeURIComponent(redirectTo)}`;

  return (
    <a
      href={href}
      className={
        className ??
        'inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-ink/15 bg-surface text-sm font-medium text-ink transition-colors hover:border-ink/25 hover:bg-surface-muted'
      }
    >
      <GoogleIcon />
      <span>{label ?? (intent === 'link' ? 'Koppel met Google' : 'Inloggen met Google')}</span>
    </a>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91A8.78 8.78 0 0 0 17.64 9.2z"
      />
      <path
        fill="#34A853"
        d="M9 18a8.6 8.6 0 0 0 5.95-2.18l-2.9-2.26a5.4 5.4 0 0 1-8.04-2.84H1.01v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.95H1.01a9 9 0 0 0 0 8.1l2.95-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.6 8.6 0 0 0 9 0a9 9 0 0 0-7.99 4.95l2.95 2.33A5.39 5.39 0 0 1 9 3.58z"
      />
    </svg>
  );
}
