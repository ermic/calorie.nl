import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card } from '@/shared/ui';
import { ForgotPasswordForm } from '@/features/auth';
import { getCurrentUser } from '@/shared/lib/auth-guard';

export const metadata: Metadata = {
  title: 'Wachtwoord vergeten',
  description: 'Vraag een resetlink aan voor je Calorietje-account.',
  alternates: { canonical: '/forgot-password' },
};

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <Card className="w-full max-w-sm">
      <ForgotPasswordForm />
    </Card>
  );
}
