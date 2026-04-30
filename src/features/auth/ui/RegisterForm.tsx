'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@/shared/ui';
import { RegisterSchema, type RegisterInput } from '@/shared/lib/schemas';
import { useRegister } from '../api/useRegister';
import { GoogleButton } from './GoogleButton';

export function RegisterForm() {
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema) });

  const onSubmit = (data: RegisterInput) => registerMutation.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-semibold">Account aanmaken</h1>
        <p className="mt-1 text-sm text-ink-muted">Begin met het bijhouden van je maaltijden.</p>
      </div>

      <Input
        label="Naam"
        type="text"
        autoComplete="name"
        hint="Optioneel"
        {...register('name')}
        error={errors.name?.message}
      />

      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        {...register('email')}
        error={errors.email?.message}
      />

      <Input
        label="Wachtwoord"
        type="password"
        autoComplete="new-password"
        hint="Minimaal 8 tekens"
        {...register('password')}
        error={errors.password?.message}
      />

      <Input
        label="Wachtwoord bevestigen"
        type="password"
        autoComplete="new-password"
        {...register('passwordConfirm')}
        error={errors.passwordConfirm?.message}
      />

      {registerMutation.error && (
        <p className="text-sm text-danger" role="alert">
          {registerMutation.error.message}
        </p>
      )}

      <Button type="submit" fullWidth loading={registerMutation.isPending}>
        Account aanmaken
      </Button>

      <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-wider text-ink-muted">
        <div className="h-px flex-1 bg-ink/10" />
        of
        <div className="h-px flex-1 bg-ink/10" />
      </div>

      <GoogleButton />

      <p className="text-sm text-ink-muted text-center">
        Al een account?{' '}
        <Link href="/login" className="text-primary-600 hover:underline">
          Inloggen
        </Link>
      </p>
    </form>
  );
}
