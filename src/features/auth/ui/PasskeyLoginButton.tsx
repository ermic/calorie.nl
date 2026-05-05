'use client';

import { useEffect, useState } from 'react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { usePasskeyLogin } from '../api/usePasskeyLogin';

type PasskeyLoginButtonProps = {
  email?: string;
  className?: string;
};

export function PasskeyLoginButton({ email, className }: PasskeyLoginButtonProps) {
  const login = usePasskeyLogin();
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(browserSupportsWebAuthn());
  }, []);

  if (supported === null) return null;
  if (!supported) {
    return (
      <p className="text-xs text-ink-muted text-center">
        Je browser ondersteunt geen passkeys.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => login.mutate(email)}
        disabled={login.isPending}
        className={
          className ??
          'inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-surface text-sm font-medium text-ink transition-colors hover:border-ink/25 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60'
        }
      >
        <KeyIcon />
        {login.isPending ? 'Bezig…' : 'Inloggen met passkey'}
      </button>
      {login.error && (
        <p className="text-sm text-danger" role="alert">
          {login.error.message}
        </p>
      )}
    </div>
  );
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="8" cy="14" r="4" />
      <path d="M11 14h10v4" />
      <path d="M16 18v4" />
    </svg>
  );
}
