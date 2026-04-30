'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@/shared/ui';
import {
  DeleteAccountSchema,
  type DeleteAccountInput,
} from '@/shared/lib/schemas';
import { useCurrentUser, useDeleteAccount } from '@/features/auth';

// Account-verwijder-sectie in het profielscherm. Twee-staps proces:
// open de bevestigingsblok → typ "VERWIJDER" + huidig wachtwoord →
// submit. Voor users zonder wachtwoord (OAuth/passkey-only) tonen we
// alleen de instructie om eerst een wachtwoord in te stellen.
export function DeleteAccountSection() {
  const { data: user } = useCurrentUser();
  const [opened, setOpened] = useState(false);
  const del = useDeleteAccount();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeleteAccountInput>({ resolver: zodResolver(DeleteAccountSchema) });

  if (!user) return null;

  if (!user.hasPassword) {
    return (
      <section className="space-y-2" aria-label="Account verwijderen">
        <h2 className="text-base font-semibold text-danger">Account verwijderen</h2>
        <p className="text-sm text-ink-muted">
          Je hebt nog geen wachtwoord ingesteld. Stel er eerst één in via "Wachtwoord vergeten" — die
          stap voorkomt dat een gestolen sessie je account stilletjes kan verwijderen.
        </p>
      </section>
    );
  }

  if (!opened) {
    return (
      <section className="space-y-3" aria-label="Account verwijderen">
        <h2 className="text-base font-semibold text-danger">Account verwijderen</h2>
        <p className="text-sm text-ink-muted">
          Je account, sessies en gekoppelde aanmeldmethodes worden permanent verwijderd. Maaltijden
          en daglogs worden in een latere stap meeverwijderd.
        </p>
        <Button variant="danger" size="sm" onClick={() => setOpened(true)}>
          Ik wil mijn account verwijderen
        </Button>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((d) => del.mutate(d))}
      className="space-y-3"
      aria-label="Account verwijderen — bevestigen"
      noValidate
    >
      <h2 className="text-base font-semibold text-danger">Account verwijderen — bevestigen</h2>
      <p className="text-sm text-ink-muted">
        Typ <strong>VERWIJDER</strong> en je huidige wachtwoord om door te gaan. Deze actie kan niet
        worden teruggedraaid.
      </p>

      <Input
        label="Typ VERWIJDER"
        type="text"
        autoComplete="off"
        {...register('confirm')}
        error={errors.confirm?.message}
      />

      <Input
        label="Huidig wachtwoord"
        type="password"
        autoComplete="current-password"
        {...register('currentPassword')}
        error={errors.currentPassword?.message}
      />

      {del.error && (
        <p className="text-sm text-danger" role="alert">
          {del.error.message}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="danger" size="sm" loading={del.isPending}>
          Definitief verwijderen
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={del.isPending}
          onClick={() => setOpened(false)}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
