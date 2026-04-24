import type { Access, CollectionBeforeValidateHook, FieldHook } from 'payload';

/** Admin-check op een req.user-achtig object. Onbekende vorm → false. */
export function isAdmin(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false;
  const u = user as { collection?: string; role?: string };
  return u.collection === 'users' && u.role === 'admin';
}

export const forceOwnerUser: FieldHook = ({ req, operation, value }) => {
  if (operation === 'create' && req.user) return req.user.id;
  return value;
};

export const ownByUser: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return { user: { equals: user.id } };
};

export const ownViaMeal: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return { 'meal.user': { equals: user.id } };
};

/** Admin ziet / bewerkt / verwijdert elke user, anderen alleen zichzelf. */
export const adminOrSelfUser: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return { id: { equals: user.id } };
};

export const loggedInCreate: Access = ({ req: { user } }) => Boolean(user);

export const verifyDayLogBelongsToUser: CollectionBeforeValidateHook = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create' || !req.user || !data?.dayLog) return data;
  if (isAdmin(req.user)) return data;

  const dayLogId = typeof data.dayLog === 'object' ? data.dayLog.id : data.dayLog;
  const dayLog = await req.payload.findByID({
    collection: 'dayLogs',
    id: dayLogId,
    depth: 0,
    req,
  });

  const ownerId = typeof dayLog.user === 'object' ? dayLog.user.id : dayLog.user;
  if (ownerId !== req.user.id) {
    throw new Error('dayLog hoort niet bij de huidige user');
  }
  return data;
};

export const verifyMealBelongsToUser: CollectionBeforeValidateHook = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create' || !req.user || !data?.meal) return data;
  if (isAdmin(req.user)) return data;

  const mealId = typeof data.meal === 'object' ? data.meal.id : data.meal;
  const meal = await req.payload.findByID({
    collection: 'meals',
    id: mealId,
    depth: 0,
    req,
  });

  const ownerId = typeof meal.user === 'object' ? meal.user.id : meal.user;
  if (ownerId !== req.user.id) {
    throw new Error('meal hoort niet bij de huidige user');
  }
  return data;
};
