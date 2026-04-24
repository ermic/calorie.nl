import type { Access, CollectionBeforeValidateHook, CollectionConfig, Where } from 'payload';
import { forceOwnerUser, isAdmin, loggedInCreate } from '@/shared/payload/hooks';

// Non-admin users may not mark food as VERIFIED or set verified=true.
// Server-side calls (overrideAccess / no req.user) can still write these.
const stripTrustedFlags: CollectionBeforeValidateHook = ({ data, req }) => {
  if (!req.user || !data) return data;
  if (data.source === 'VERIFIED') data.source = 'USER';
  if (data.verified === true) data.verified = false;
  return data;
};

// USER-source foods zijn persoonlijke entries (auto-aangemaakt vanuit de
// add-meal flow) en mogen alleen door de creator gezien worden. Andere
// bronnen (OFF, AI, VERIFIED) blijven gedeelde bibliotheek-data zodat
// search bij elke ingelogde user dezelfde OFF-resultaten ziet.
const sharedOrOwnFood: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const where: Where = {
    or: [{ source: { not_equals: 'USER' } }, { createdBy: { equals: user.id } }],
  };
  return where;
};

// Mutaties (update/delete) zijn strikter: alleen je eigen USER-foods.
// OFF/AI/VERIFIED zijn shared library en mogen alleen door admin gewijzigd
// worden. Zonder deze regel zou Payload's default 'logged-in mag alles'
// inkappen op gemeenschappelijke OFF-data of andermans persoonlijke
// entries.
const ownFoodOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const where: Where = {
    and: [{ source: { equals: 'USER' } }, { createdBy: { equals: user.id } }],
  };
  return where;
};

export const Foods: CollectionConfig = {
  slug: 'foods',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'brand', 'caloriesPer100', 'source', 'verified', 'createdBy'],
  },
  access: {
    read: sharedOrOwnFood,
    create: loggedInCreate,
    update: ownFoodOrAdmin,
    delete: ownFoodOrAdmin,
  },
  hooks: {
    beforeValidate: [stripTrustedFlags],
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
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      // Bij create automatisch op req.user.id zetten — voorkomt dat
      // client-input een andere creator-id meestuurt. Bestaande non-USER
      // foods (OFF-imports, admin-seeds) krijgen ook een createdBy maar
      // dat heeft geen access-effect want hun source is niet 'USER'.
      hooks: { beforeChange: [forceOwnerUser] },
      admin: { position: 'sidebar' },
    },
  ],
};
