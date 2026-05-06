import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { RETURNING_USER_COOKIE, RETURNING_USER_MAX_AGE } from '@/shared/lib/returning-user';

// Wordt door client-side login-flows aangeroepen na succesvolle auth om
// een long-lived cookie te zetten die markeert dat de browser bij een
// terugkerend bezoek niet meer de marketing-landing op '/' hoeft te
// zien. Logout wist deze cookie bewust niet.
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(RETURNING_USER_COOKIE, '1', {
    maxAge: RETURNING_USER_MAX_AGE,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  return new NextResponse(null, { status: 204 });
}
