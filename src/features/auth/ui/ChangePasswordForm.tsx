'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@/shared/ui';
import { ChangePasswordSchema, type ChangePasswordInput } from '@/shared/lib/schemas';
import { useChangePassword } from '../api/useChangePassword';

const SUCCESS_RESET_MS = 5_000;

export function ChangePasswordForm() {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(ChangePasswordSchema) });

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
      aria-label="Wachtwoord wijzigen"
    >
      <h2 className="text-base font-semibold">Wachtwoord wijzigen</h2>

      <Input
        label="Huidig wachtwoord"
        type="password"
        autoComplete="current-password"
        {...register('currentPassword')}
        error={errors.currentPassword?.message}
      />

      <Input
        label="Nieuw wachtwoord"
        type="password"
        autoComplete="new-password"
        {...register('newPassword')}
        error={errors.newPassword?.message}
      />

      <Input
        label="Herhaal nieuw wachtwoord"
        type="password"
        autoComplete="new-password"
        {...register('newPasswordConfirm')}
        error={errors.newPasswordConfirm?.message}
      />

      {change.error && (
        <p className="text-sm text-danger" role="alert">
          {change.error.message}
        </p>
      )}
      {change.isSuccess && (
        <p className="text-sm text-emerald-700" role="status">
          Wachtwoord gewijzigd.
        </p>
      )}

      <Button type="submit" loading={change.isPending}>
        Opslaan
      </Button>
    </form>
  );
}
