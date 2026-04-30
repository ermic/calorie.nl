'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@/shared/ui';
import { ChangeEmailSchema, type ChangeEmailInput } from '@/shared/lib/schemas';
import { useChangeEmail } from '../api/useChangeEmail';

const SUCCESS_RESET_MS = 8_000;

export function ChangeEmailForm() {
  const change = useChangeEmail();
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<ChangeEmailInput>({ resolver: zodResolver(ChangeEmailSchema) });

  const { isSuccess, reset: resetMutation } = change;
  useEffect(() => {
    if (!isSuccess) return;
    resetForm();
    const id = setTimeout(resetMutation, SUCCESS_RESET_MS);
    return () => clearTimeout(id);
  }, [isSuccess, resetForm, resetMutation]);

  return (
    <form
      onSubmit={handleSubmit((d) => change.mutate(d))}
      className="space-y-4"
      noValidate
      aria-label="E-mailadres wijzigen"
    >
      <h2 className="text-base font-semibold">E-mailadres wijzigen</h2>
      <p className="text-sm text-ink-muted">
        We sturen een bevestigingslink naar het nieuwe adres en een notificatie naar je huidige
        adres. Je e-mailadres wijzigt pas na de bevestigingsklik.
      </p>

      <Input
        label="Nieuw e-mailadres"
        type="email"
        autoComplete="email"
        {...register('newEmail')}
        error={errors.newEmail?.message}
      />

      <Input
        label="Huidig wachtwoord"
        type="password"
        autoComplete="current-password"
        {...register('currentPassword')}
        error={errors.currentPassword?.message}
      />

      {change.error && (
        <p className="text-sm text-danger" role="alert">
          {change.error.message}
        </p>
      )}
      {change.isSuccess && (
        <p className="text-sm text-emerald-700" role="status">
          Bevestigingsmail verstuurd. Klik de link in je nieuwe inbox om te bevestigen.
        </p>
      )}

      <Button type="submit" loading={change.isPending}>
        Wijziging aanvragen
      </Button>
    </form>
  );
}
