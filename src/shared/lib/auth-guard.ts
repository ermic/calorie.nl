import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User } from '@/payload-types';
import { getPayload } from './payload';

export async function getCurrentUser(): Promise<User | null> {
  const payload = await getPayload();
  const headersList = await headers();
  try {
    const { user } = await payload.auth({ headers: headersList });
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
