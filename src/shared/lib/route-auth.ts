import { cookies as nextCookies, headers as nextHeaders } from 'next/headers';
import type { User } from '@/payload-types';
import { getPayload } from './payload';

// Wrapper rond payload.auth() voor custom Next.js route-handlers.
// Payload v3 herkent in deze setup wel de Authorization-header maar niet
// de payload-token cookie — terwijl de browser bij client-side fetches
// automatisch de cookie meestuurt en geen Authorization. Deze helper
// leest de cookie en geeft hem als JWT Authorization-header door, zodat
// custom routes hetzelfde authenticatie-gedrag hebben als de UI verwacht.
export async function getRouteUser(): Promise<User | null> {
  const payload = await getPayload();
  const headers = await nextHeaders();

  // Als de caller al een Authorization-header heeft meegestuurd (e2e
  // tests, native apps), probeer die direct. Zo niet: skip de extra
  // payload.auth-call en val meteen door naar de cookie-fallback.
  if (headers.get('authorization')) {
    const direct = await payload.auth({ headers });
    if (direct.user && direct.user.collection === 'users') {
      return direct.user as User;
    }
  }

  // Fallback: cookie → Authorization-header.
  const cookieStore = await nextCookies();
  const token = cookieStore.get('payload-token')?.value;
  if (!token) return null;

  const augmented = new Headers(headers);
  augmented.set('authorization', `JWT ${token}`);
  const result = await payload.auth({ headers: augmented });
  return result.user && result.user.collection === 'users'
    ? (result.user as User)
    : null;
}
