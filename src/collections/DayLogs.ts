import type { CollectionConfig } from 'payload';
import { forceOwnerUser, loggedInCreate, ownByUser } from '@/shared/payload/hooks';

export const DayLogs: CollectionConfig = {
  slug: 'dayLogs',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['date', 'user', 'totalCalories'],
  },
  access: {
    read: ownByUser,
    update: ownByUser,
    delete: ownByUser,
    create: loggedInCreate,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      hooks: { beforeChange: [forceOwnerUser] },
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
