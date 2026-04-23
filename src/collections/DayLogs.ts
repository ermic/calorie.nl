import type { Access, CollectionConfig } from 'payload';

const ownOnly: Access = ({ req: { user } }) => {
  if (!user) return false;
  return { user: { equals: user.id } };
};

export const DayLogs: CollectionConfig = {
  slug: 'dayLogs',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['date', 'user', 'totalCalories'],
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
    { name: 'date', type: 'date', required: true, index: true },
    { name: 'totalCalories', type: 'number', defaultValue: 0 },
    { name: 'totalProtein', type: 'number', defaultValue: 0 },
    { name: 'totalCarbs', type: 'number', defaultValue: 0 },
    { name: 'totalFat', type: 'number', defaultValue: 0 },
    { name: 'note', type: 'textarea' },
  ],
  indexes: [{ fields: ['user', 'date'], unique: true }],
};
