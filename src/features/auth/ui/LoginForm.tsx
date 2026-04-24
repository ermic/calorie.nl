'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@/shared/ui';
import { LoginSchema, type LoginInput } from '@/shared/lib/schemas';
import { useLogin } from '../api/useLogin';

export function LoginForm() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = (data: LoginInput) => login.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-semibold">Inloggen</h1>
        <p className="mt-1 text-sm text-ink-muted">Welkom terug — log in om verder te gaan.</p>
      </div>

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
        autoComplete="current-password"
        {...register('password')}
        error={errors.password?.message}
      />

      {login.error && (
        <p className="text-sm text-danger" role="alert">
          {login.error.message}
        </p>
      )}

      <Button type="submit" fullWidth loading={login.isPending}>
        Inloggen
      </Button>

      <p className="text-sm text-ink-muted text-center">
        Nog geen account?{' '}
        <Link href="/register" className="text-primary-600 hover:underline">
          Aanmaken
        </Link>
      </p>
    </form>
  );
}
