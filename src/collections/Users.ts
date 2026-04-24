import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload';
import { adminOrSelfUser, isAdmin } from '@/shared/payload/hooks';

const PRIVILEGED_FIELDS = ['plan', 'aiPhotoCredits', 'creditsResetAt', 'role'] as const;

// Public registration (no req.user) forceert veilige defaults; zelf-updates
// laten de privileged velden ongewijzigd t.o.v. de bestaande doc-waardes.
// Een andere user bewerken (bv. admin via /admin) blijft toegestaan.
const lockPrivilegedFieldsOnSelfWrite: CollectionBeforeValidateHook = ({
  data,
  operation,
  req,
  originalDoc,
}) => {
  if (!data) return data;
  const mutable = data as Record<string, unknown>;

  const isAnonCreate = operation === 'create' && !req.user;
  const isSelfUpdate =
    operation === 'update' &&
    req.user?.collection === 'users' &&
    originalDoc &&
    String(originalDoc.id) === String(req.user.id);

  if (isAnonCreate) {
    // Forceer defaults — 'delete' zou 'required'-validatie breken omdat
    // Payload defaultValue's niet meer apply't nadat de hook gelopen heeft.
    mutable.plan = 'FREE';
    mutable.aiPhotoCredits = 5;
    mutable.creditsResetAt = new Date();
    mutable.role = 'user';
  } else if (isSelfUpdate) {
    // Patch-based: veld weglaten = bestaande waarde blijft staan.
    for (const field of PRIVILEGED_FIELDS) delete mutable[field];
  }

  return data;
};

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role', 'plan', 'aiPhotoCredits'],
  },
  access: {
    create: () => true,
    read: adminOrSelfUser,
    update: adminOrSelfUser,
    delete: adminOrSelfUser,
    admin: ({ req: { user } }) => isAdmin(user),
  },
  hooks: {
    beforeValidate: [lockPrivilegedFieldsOnSelfWrite],
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Gebruiker', value: 'user' },
        { label: 'Admin', value: 'admin' },
      ],
      defaultValue: 'user',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'plan',
      type: 'select',
      options: [
        { label: 'Free', value: 'FREE' },
        { label: 'Premium', value: 'PREMIUM' },
        { label: 'Pro', value: 'PRO' },
      ],
      defaultValue: 'FREE',
      required: true,
    },
    { name: 'aiPhotoCredits', type: 'number', defaultValue: 5, required: true },
    { name: 'creditsResetAt', type: 'date', defaultValue: () => new Date() },
    { name: 'dailyCalorieGoal', type: 'number', defaultValue: 2000, min: 0, max: 20000 },
    { name: 'weightKg', type: 'number', min: 0, max: 500 },
    { name: 'heightCm', type: 'number', min: 0, max: 300 },
    { name: 'birthDate', type: 'date' },
    {
      name: 'gender',
      type: 'select',
      options: [
        { label: 'Man', value: 'MALE' },
        { label: 'Vrouw', value: 'FEMALE' },
        { label: 'Anders', value: 'OTHER' },
      ],
    },
    {
      name: 'activityLevel',
      type: 'select',
      options: [
        { label: 'Weinig beweging', value: 'SEDENTARY' },
        { label: 'Licht actief', value: 'LIGHT' },
        { label: 'Matig actief', value: 'MODERATE' },
        { label: 'Actief', value: 'ACTIVE' },
        { label: 'Zeer actief', value: 'VERY_ACTIVE' },
      ],
      defaultValue: 'MODERATE',
    },
  ],
};
