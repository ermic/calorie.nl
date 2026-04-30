import type { CollectionConfig } from 'payload';

// Server-only state-store voor OAuth-state + (later) WebAuthn-challenges.
// Alleen schrijfbaar via API-routes met overrideAccess: true.
export const LoginChallenges: CollectionConfig = {
  slug: 'loginChallenges',
  admin: { hidden: true },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'OAuth state', value: 'oauth-state' },
        { label: 'WebAuthn — register', value: 'webauthn-register' },
        { label: 'WebAuthn — login', value: 'webauthn-login' },
      ],
      index: true,
    },
    // base64url-string: state-token bij OAuth, base64url-challenge bij WebAuthn.
    { name: 'challenge', type: 'text', required: true, index: true, unique: true },
    // PKCE-verifier (alleen oauth-state).
    { name: 'pkceVerifier', type: 'text' },
    // Provider die deze state hoort (bv 'google', 'facebook'). Optioneel
    // omdat WebAuthn geen provider heeft.
    { name: 'provider', type: 'text' },
    // 'login' of 'link' bij oauth-state — hoort de callback de bestaande
    // ingelogde user te koppelen of een nieuwe sessie uit te geven.
    { name: 'intent', type: 'text' },
    // Bestaande user-id, indien intent='link' of bij webauthn-register/login.
    { name: 'userId', type: 'text', index: true },
    // Lokale redirect-target na succesvolle callback (moet beginnen met '/').
    { name: 'returnTo', type: 'text' },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
};
