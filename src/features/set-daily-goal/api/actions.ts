'use server';

import { revalidatePath } from 'next/cache';
import { headers as nextHeaders } from 'next/headers';
import { getPayload } from '@/shared/lib/payload';
import type { User } from '@/payload-types';

// Zie ./updateProfileAction voor rationale achter server-action + path-
// revalidation. Hier willen we vooral de dashboard-ring en recent-meals
// het nieuwe doel meteen laten tonen.
export async function setDailyGoalAction(dailyCalorieGoal: number | null): Promise<{ user: User }> {
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) {
    throw new Error('Niet ingelogd');
  }

  const updated = (await payload.update({
    collection: 'users',
    id: user.id,
    data: { dailyCalorieGoal },
    overrideAccess: false,
    user,
  })) as User;

  revalidatePath('/', 'layout');

  return { user: updated };
}
