import type { CollectionConfig } from 'payload';

export const Foods: CollectionConfig = {
  slug: 'foods',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'brand', 'caloriesPer100', 'source', 'verified'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'barcode', type: 'text', unique: true, index: true },
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'brand', type: 'text' },
    { name: 'caloriesPer100', type: 'number', required: true },
    { name: 'proteinPer100', type: 'number', defaultValue: 0 },
    { name: 'carbsPer100', type: 'number', defaultValue: 0 },
    { name: 'fatPer100', type: 'number', defaultValue: 0 },
    { name: 'fiberPer100', type: 'number', defaultValue: 0 },
    { name: 'sugarPer100', type: 'number', defaultValue: 0 },
    { name: 'servingSize', type: 'number' },
    { name: 'servingUnit', type: 'text' },
    {
      name: 'source',
      type: 'select',
      options: [
        { label: 'User', value: 'USER' },
        { label: 'Open Food Facts', value: 'OPEN_FOOD_FACTS' },
        { label: 'AI Generated', value: 'AI_GENERATED' },
        { label: 'Verified', value: 'VERIFIED' },
      ],
      defaultValue: 'USER',
      required: true,
    },
    { name: 'verified', type: 'checkbox', defaultValue: false },
  ],
};
