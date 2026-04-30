'use client';

import {
  useCurrentUser,
  useUnlinkProvider,
  GoogleButton,
  PasskeyList,
  PasskeyRegisterButton,
} from '@/features/auth';
import { Button } from '@/shared/ui';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export function AuthMethodsSection() {
  const { data: user } = useCurrentUser();
  const unlink = useUnlinkProvider();

  if (!user) return null;

  const providers = user.providers ?? [];
  const google = providers.find((p) => p.provider === 'google');

  return (
    <section className="space-y-4" aria-label="Aanmeldmethodes">
      <div>
        <h2 className="text-base font-semibold">Aanmeldmethodes</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Manieren waarop je kunt inloggen op je account.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 px-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Google</p>
          {google ? (
            <p className="mt-0.5 text-xs text-ink-muted">
              Gekoppeld aan {google.email ?? 'onbekend adres'}
              {google.linkedAt && ` · sinds ${format(new Date(google.linkedAt), 'd MMM yyyy', { locale: nl })}`}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-ink-muted">Nog niet gekoppeld.</p>
          )}
        </div>
        {google ? (
          <Button
            variant="secondary"
            size="sm"
            loading={unlink.isPending && unlink.variables === 'google'}
            onClick={() => unlink.mutate('google')}
          >
            Ontkoppelen
          </Button>
        ) : (
          <GoogleButton
            intent="link"
            label="Koppel Google"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-ink/15 bg-surface px-4 text-sm font-medium text-ink hover:border-ink/25 hover:bg-surface-muted"
          />
        )}
      </div>

      {unlink.error && (
        <p className="text-sm text-danger" role="alert">
          {unlink.error.message}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Passkeys</p>
          <PasskeyRegisterButton />
        </div>
        <PasskeyList />
      </div>
    </section>
  );
}
