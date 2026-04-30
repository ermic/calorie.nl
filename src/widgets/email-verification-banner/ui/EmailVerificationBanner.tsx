'use client';

import { useEffect } from 'react';
import { useCurrentUser, useResendVerification } from '@/features/auth';
import { Button } from '@/shared/ui';

const SUCCESS_RESET_MS = 5_000;

export function EmailVerificationBanner() {
  const { data: user } = useCurrentUser();
  const resend = useResendVerification();

  const { isSuccess, reset } = resend;
  useEffect(() => {
    if (!isSuccess) return;
    const id = setTimeout(reset, SUCCESS_RESET_MS);
    return () => clearTimeout(id);
  }, [isSuccess, reset]);

  if (!user || user.emailVerified) return null;

  return (
    <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <p className="text-amber-900">
          Bevestig je e-mailadres ({user.email}) om alle functies te kunnen gebruiken.
        </p>
        {resend.isSuccess ? (
          <p className="text-amber-900">Mail opnieuw verstuurd. Check je inbox.</p>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => resend.mutate()} loading={resend.isPending}>
            Stuur opnieuw
          </Button>
        )}
      </div>
      {resend.error && (
        <p className="mx-auto mt-1 max-w-3xl text-xs text-danger" role="alert">
          {resend.error.message}
        </p>
      )}
    </div>
  );
}
