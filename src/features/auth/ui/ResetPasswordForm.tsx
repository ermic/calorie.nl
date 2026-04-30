'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@/shared/ui';
import { ResetPasswordSchema, type ResetPasswordInput } from '@/shared/lib/schemas';
import { useResetPassword } from '../api/useResetPassword';

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const reset = useResetPassword(token);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(ResetPasswordSchema) });

  if (!token) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Ongeldige link</h1>
        <p className="text-sm text-ink-muted">
          De herstellink ontbreekt of is onvolledig. Vraag een nieuwe link aan.
        </p>
        <p className="text-sm">
          <Link href="/forgot-password" className="text-primary-600 hover:underline">
            Nieuwe link aanvragen
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => reset.mutate(d))} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-semibold">Nieuw wachtwoord</h1>
        <p className="mt-1 text-sm text-ink-muted">Stel een nieuw wachtwoord in voor je account.</p>
      </div>

      <Input
        label="Nieuw wachtwoord"
        type="password"
        autoComplete="new-password"
        {...register('password')}
        error={errors.password?.message}
      />

      <Input
        label="Herhaal wachtwoord"
        type="password"
        autoComplete="new-password"
        {...register('passwordConfirm')}
        error={errors.passwordConfirm?.message}
      />

      {reset.error && (
        <p className="text-sm text-danger" role="alert">
          {reset.error.message}
        </p>
      )}

      <Button type="submit" fullWidth loading={reset.isPending}>
        Wachtwoord opslaan
      </Button>
    </form>
  );
}
