'use client';

import { useEffect, useState } from 'react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { Button } from '@/shared/ui';
import { usePasskeyRegister } from '../api/usePasskeyRegister';

export function PasskeyRegisterButton() {
  const register = usePasskeyRegister();
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(browserSupportsWebAuthn());
  }, []);

  if (supported === null) return null;
  if (!supported) {
    return (
      <p className="text-xs text-ink-muted">
        Je apparaat ondersteunt geen passkeys.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" size="sm" onClick={() => register.mutate(undefined)} loading={register.isPending}>
        Passkey toevoegen
      </Button>
      {register.error && (
        <p className="text-sm text-danger" role="alert">
          {register.error.message}
        </p>
      )}
      {register.isSuccess && (
        <p className="text-sm text-emerald-700" role="status">
          Passkey toegevoegd.
        </p>
      )}
    </div>
  );
}
