import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card } from '@/shared/ui';
import { RegisterForm } from '@/features/auth';
import { getCurrentUser } from '@/shared/lib/auth-guard';

export const metadata: Metadata = {
  title: 'Account aanmaken',
  description:
    'Maak een gratis account aan op Calorietje en begin met het tracken van je calorieën via AI foto-herkenning of handmatig.',
  alternates: { canonical: '/register' },
  openGraph: {
    title: 'Account aanmaken — Calorietje',
    description:
      'Maak een gratis account aan en track je calorieën via AI foto-herkenning of handmatig.',
    url: '/register',
    type: 'website',
  },
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <Card className="w-full max-w-sm">
      <RegisterForm />
    </Card>
  );
}
