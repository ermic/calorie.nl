import type { CollectionConfig } from 'payload';

// Server-only token-store voor e-mailverificatie en (later) e-mailwijziging.
// Alleen schrijfbaar via API-routes met overrideAccess: true.
export const EmailVerifications: CollectionConfig = {
  slug: 'emailVerifications',
  admin: { hidden: true },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'tokenHash', type: 'text', required: true, index: true, unique: true },
    { name: 'userId', type: 'text', required: true, index: true },
    // gevuld bij e-mailwijziging (komt in een latere stap), null bij eerste verify
    { name: 'newEmail', type: 'text' },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
};
