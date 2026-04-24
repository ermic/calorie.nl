import type { Access, CollectionBeforeValidateHook, FieldHook } from 'payload';

export const forceOwnerUser: FieldHook = ({ req, operation, value }) => {
  if (operation === 'create' && req.user) return req.user.id;
  return value;
};

export const ownByUser: Access = ({ req: { user } }) => {
  if (!user) return false;
  return { user: { equals: user.id } };
};

export const ownViaMeal: Access = ({ req: { user } }) => {
  if (!user) return false;
  return { 'meal.user': { equals: user.id } };
};

export const loggedInCreate: Access = ({ req: { user } }) => Boolean(user);

export const verifyDayLogBelongsToUser: CollectionBeforeValidateHook = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create' || !req.user || !data?.dayLog) return data;

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
