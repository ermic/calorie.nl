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
    // Gebruikersfeedback op de AI-schatting (1=slecht/rood t/m 5=top/groen).
    // Driver voor toekomstige model-tuning: combineer met aiSnapshot om te
    // bepalen waar de pipeline systematisch overschat/onderschat.
    {
      name: 'userRating',
      type: 'number',
      min: 1,
      max: 5,
      admin: { description: '1 (slecht) t/m 5 (top), gegeven door de gebruiker na opslag.' },
    },
    // Snapshot van de oorspronkelijke AI-output (items + confidence + notes)
    // vóór handmatige aanpassingen. Samen met de uiteindelijke MealItems-
    // rijen geeft dit het delta-trainingssignaal: wat schatte AI vs. wat
    // bleef er na correctie staan.
    { name: 'aiSnapshot', type: 'json' },
    // Volledige pipeline-log van de analyse (NEVO-matches, Gemini-fallback,
    // weights). Alleen bewaard om later te kunnen reconstrueren waarom een
    // bepaalde schatting eruitzag zoals hij eruitzag.
    { name: 'pipelineDebug', type: 'json' },
  ],
};
