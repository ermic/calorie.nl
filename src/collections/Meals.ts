import type { CollectionConfig } from 'payload';
import {
  forceOwnerUser,
  loggedInCreate,
  ownByUser,
  verifyDayLogBelongsToUser,
} from '@/shared/payload/hooks';

export const Meals: CollectionConfig = {
  slug: 'meals',
  admin: {
    useAsTitle: 'mealType',
    defaultColumns: ['mealType', 'eatenAt', 'user', 'aiAnalyzed'],
  },
  access: {
    read: ownByUser,
    update: ownByUser,
    delete: ownByUser,
    create: loggedInCreate,
  },
  hooks: {
    beforeValidate: [verifyDayLogBelongsToUser],
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
