import type { Access, CollectionConfig } from 'payload';

const ownOnly: Access = ({ req: { user } }) => {
  if (!user) return false;
  return { user: { equals: user.id } };
};

export const Meals: CollectionConfig = {
  slug: 'meals',
  admin: {
    useAsTitle: 'mealType',
    defaultColumns: ['mealType', 'eatenAt', 'user', 'aiAnalyzed'],
  },
  access: {
    read: ownOnly,
    update: ownOnly,
    delete: ownOnly,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'dayLog',
      type: 'relationship',
      relationTo: 'dayLogs',
      required: true,
    },
    { name: 'eatenAt', type: 'date', defaultValue: () => new Date() },
    {
      name: 'mealType',
      type: 'select',
      options: [
        { label: 'Ontbijt', value: 'BREAKFAST' },
        { label: 'Lunch', value: 'LUNCH' },
        { label: 'Diner', value: 'DINNER' },
        { label: 'Tussendoor', value: 'SNACK' },
      ],
      required: true,
    },
    { name: 'photoUrl', type: 'text' },
    { name: 'aiAnalyzed', type: 'checkbox', defaultValue: false },
    { name: 'aiConfidence', type: 'number' },
  ],
};
