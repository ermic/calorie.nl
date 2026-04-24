'use server';

import { revalidatePath } from 'next/cache';
import { headers as nextHeaders } from 'next/headers';
import { getPayload } from '@/shared/lib/payload';
import type { User } from '@/payload-types';
import type { ProfilePatch } from '../model/schema';

// Server-action om het profiel te updaten. Voordelen boven een client-
// side PATCH naar /api/users/:id:
//   - revalidatePath('/') invalideert RSC-caches voor alle layouts, dus
//     dashboard (TDEE-suggestie, ring-goal) en meals-list zien directe
//     updates zonder dat de gebruiker handmatig hoeft te herladen.
//   - De action haalt de user uit de cookie, dus de client hoeft geen
//     userId door te geven — scheelt een verwissel-vector.
// Access-control via adminOrSelfUser + lockPrivilegedFieldsOnSelfWrite
// hook blijft ongewijzigd.
export async function updateProfileAction(patch: ProfilePatch): Promise<{ user: User }> {
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) {
    throw new Error('Niet ingelogd');
  }

  const updated = (await payload.update({
    collection: 'users',
    id: user.id,
    data: patch,
    overrideAccess: false,
    user,
  })) as User;

  revalidatePath('/', 'layout');

  return { user: updated };
}
