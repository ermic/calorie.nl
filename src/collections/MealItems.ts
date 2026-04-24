import type { CollectionConfig } from 'payload';
import {
  loggedInCreate,
  ownViaMeal,
  verifyMealBelongsToUser,
} from '@/shared/payload/hooks';

export const MealItems: CollectionConfig = {
  slug: 'mealItems',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'quantity', 'unit', 'calories'],
  },
  access: {
    read: ownViaMeal,
    update: ownViaMeal,
    delete: ownViaMeal,
    create: loggedInCreate,
  },
  hooks: {
    beforeValidate: [verifyMealBelongsToUser],
  },
  fields: [
    { name: 'meal', type: 'relationship', relationTo: 'meals', required: true },
    { name: 'food', type: 'relationship', relationTo: 'foods' },
    { name: 'name', type: 'text', required: true },
    { name: 'quantity', type: 'number', required: true },
    { name: 'unit', type: 'text', required: true },
    { name: 'calories', type: 'number', required: true },
    { name: 'protein', type: 'number', defaultValue: 0 },
    { name: 'carbs', type: 'number', defaultValue: 0 },
    { name: 'fat', type: 'number', defaultValue: 0 },
    { name: 'fiber', type: 'number', defaultValue: 0 },
    { name: 'sugar', type: 'number', defaultValue: 0 },
  ],
};
