'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@/shared/ui';
import { ForgotPasswordSchema, type ForgotPasswordInput } from '@/shared/lib/schemas';
import { useForgotPassword } from '../api/useForgotPassword';

export function ForgotPasswordForm() {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(ForgotPasswordSchema) });

  if (forgot.isSuccess) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Controleer je inbox</h1>
        <p className="text-sm text-ink-muted">
          Als er een account bestaat met dit e-mailadres, hebben we een herstellink gestuurd. Klik op de link
          in de mail om een nieuw wachtwoord in te stellen.
        </p>
        <p className="text-sm text-ink-muted">
          <Link href="/login" className="text-primary-600 hover:underline">
            Terug naar inloggen
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => forgot.mutate(d))} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-semibold">Wachtwoord vergeten</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Vul je e-mailadres in. We sturen je een link om een nieuw wachtwoord in te stellen.
        </p>
      </div>

      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        {...register('email')}
        error={errors.email?.message}
      />

      {forgot.error && (
        <p className="text-sm text-danger" role="alert">
          {forgot.error.message}
        </p>
      )}

      <Button type="submit" fullWidth loading={forgot.isPending}>
        Stuur herstellink
      </Button>

      <p className="text-sm text-ink-muted text-center">
        <Link href="/login" className="text-primary-600 hover:underline">
          Terug naar inloggen
        </Link>
      </p>
    </form>
  );
}
