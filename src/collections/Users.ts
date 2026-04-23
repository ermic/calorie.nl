import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'plan', 'aiPhotoCredits'],
  },
  fields: [
    { name: 'name', type: 'text' },
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
    { name: 'dailyCalorieGoal', type: 'number', defaultValue: 2000 },
    { name: 'weightKg', type: 'number' },
    { name: 'heightCm', type: 'number' },
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
