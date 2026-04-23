import type { Access, CollectionConfig } from 'payload';

const loggedIn: Access = ({ req: { user } }) => Boolean(user);

export const MealItems: CollectionConfig = {
  slug: 'mealItems',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'quantity', 'unit', 'calories'],
  },
  access: {
    read: loggedIn,
    update: loggedIn,
    delete: loggedIn,
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
