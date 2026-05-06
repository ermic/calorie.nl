import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/views/landing';
import { getCurrentUser } from '@/shared/lib/auth-guard';
import { RETURNING_USER_COOKIE } from '@/shared/lib/returning-user';

export const metadata: Metadata = {
  title: {
    absolute: 'Calorietje — calorieën tellen via een foto van je maaltijd',
  },
  description:
    'Calorieën tellen via een foto van je maaltijd of handmatig met de Nederlandse NEVO-database. Gratis, geen abonnement, je eigen Gemini API-key.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Calorietje — calorieën tellen via een foto van je maaltijd',
    description:
      'Calorieën tellen via een foto van je maaltijd of handmatig met de Nederlandse NEVO-database.',
    url: '/',
    type: 'website',
  },
};

type HomePageProps = {
  searchParams: Promise<{ over?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  // ?over=1 is de override die de "Over Calorietje"-link op /login zet:
  // dan willen we de landing altijd tonen, ook voor terugkerende users
  // of ingelogde gebruikers die nieuwsgierig zijn.
  const { over } = await searchParams;
  const forceLanding = over === '1';

  if (!forceLanding) {
    // Ingelogde users hoeven de marketing-landing nooit te zien.
    const user = await getCurrentUser();
    if (user) redirect('/dashboard');

    // Bezoekers die ooit succesvol hebben ingelogd (cookie gezet door
    // /api/auth/mark-returning of door de Google OAuth-callback, en bij
    // logout bewust niet gewist) sturen we direct naar /login.
    const cookieStore = await cookies();
    if (cookieStore.get(RETURNING_USER_COOKIE)?.value === '1') {
      redirect('/login');
    }
  }

  return <LandingPage />;
}
