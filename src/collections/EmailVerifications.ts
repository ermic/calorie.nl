import type { CollectionConfig } from 'payload';

// Server-only token-store voor e-mailverificatie en e-mailwijziging.
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
    // 'verify' = eerste-verify (newEmail null); 'change-confirm' = klik op
    // bevestig-link in nieuwe-mail-adres; 'change-revoke' = klik op
    // intrekken-link in oude-mail-adres. Confirm en revoke horen bij
    // dezelfde wijziging en delen newEmail.
    {
      name: 'kind',
      type: 'select',
      options: [
        { label: 'Eerste-verificatie', value: 'verify' },
        { label: 'E-mailwijziging — bevestig', value: 'change-confirm' },
        { label: 'E-mailwijziging — intrekken', value: 'change-revoke' },
      ],
      defaultValue: 'verify',
      required: true,
      index: true,
    },
    { name: 'newEmail', type: 'text' },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
};
