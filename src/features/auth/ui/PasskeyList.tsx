'use client';

import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Button } from '@/shared/ui';
import { useCurrentUser } from '../api/useCurrentUser';
import { usePasskeyDelete } from '../api/usePasskeyDelete';

export function PasskeyList() {
  const { data: user } = useCurrentUser();
  const del = usePasskeyDelete();

  if (!user) return null;
  const credentials = user.passkeyCredentials ?? [];

  if (credentials.length === 0) {
    return (
      <p className="text-sm text-ink-muted">Nog geen passkeys gekoppeld.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {credentials.map((c) => (
        <li
          key={c.credentialId}
          className="flex items-center justify-between gap-3 rounded-md border border-ink/10 px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{c.label ?? 'Apparaat'}</p>
            <p className="text-xs text-ink-muted">
              {c.createdAt && `Toegevoegd ${format(new Date(c.createdAt), 'd MMM yyyy', { locale: nl })}`}
              {c.lastUsedAt && ` · laatst gebruikt ${format(new Date(c.lastUsedAt), 'd MMM yyyy', { locale: nl })}`}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={del.isPending && del.variables === c.credentialId}
            onClick={() => del.mutate(c.credentialId)}
          >
            Verwijderen
          </Button>
        </li>
      ))}
      {del.error && (
        <p className="text-sm text-danger" role="alert">
          {del.error.message}
        </p>
      )}
    </ul>
  );
}
