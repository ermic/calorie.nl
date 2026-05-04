import type {
  CollectionAfterChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
} from 'payload';
import { adminOrSelfUser, isAdmin } from '@/shared/payload/hooks';
import { resetPasswordEmail } from '@/shared/email/resetPassword';
import { verifyEmail } from '@/shared/email/verifyEmail';
import { generateToken, hashToken } from '@/shared/lib/tokens';
import { requireServerUrl } from '@/shared/lib/server-url';
import { DEFAULT_TIMEZONE, isValidTimezone } from '@/shared/lib/timezone';

// Velden die een user niet zelf via PATCH /api/users/:id mag wijzigen.
// 'email' staat hier zodat de change-email-flow (met dubbele
// bevestiging) niet bypassed kan worden via een rauwe PATCH.
const PRIVILEGED_FIELDS = ['plan', 'aiPhotoCredits', 'creditsResetAt', 'role', 'email'] as const;

// Public registration (no req.user) forceert veilige defaults; zelf-updates
// laten de privileged velden ongewijzigd t.o.v. de bestaande doc-waardes.
// Een andere user bewerken (bv. admin via /admin) blijft toegestaan.
// Server-side mutaties met overrideAccess: true hebben geen req.user en
// vallen daarmee buiten de reset (zo kan confirm-email-change wel email
// updaten).
const lockPrivilegedFieldsOnSelfWrite: CollectionBeforeValidateHook = ({
  data,
  operation,
  req,
  originalDoc,
}) => {
  if (!data) return data;
  const mutable = data as Record<string, unknown>;

  const isAnonCreate = operation === 'create' && !req.user;
  const isSelfUpdate =
    operation === 'update' &&
    req.user?.collection === 'users' &&
    originalDoc &&
    String(originalDoc.id) === String(req.user.id);

  if (isAnonCreate) {
    // Forceer defaults — 'delete' zou 'required'-validatie breken omdat
    // Payload defaultValue's niet meer apply't nadat de hook gelopen heeft.
    mutable.plan = 'FREE';
    mutable.aiPhotoCredits = 5;
    mutable.creditsResetAt = new Date();
    mutable.role = 'user';
  } else if (isSelfUpdate) {
    // Reset naar originalDoc — 'delete' zou required-validatie laten falen
    // omdat collection-beforeValidate ná de field-fallback draait, dus na
    // verwijderen wordt er geen waarde meer teruggezet.
    const original = originalDoc as Record<string, unknown>;
    for (const field of PRIVILEGED_FIELDS) mutable[field] = original[field];
  }

  return data;
};

// Stuurt bij user-create een verificatiemail. Slaat alleen de sha256-hash
// van de token op; plain token zit in de mail-link. Skipt users die al
// verified zijn (bv. later via OAuth met email_verified=true). Errors in
// de mail-send mogen de create-transactie niet rollbacken — de user kan
// daarna via de banner /resend gebruiken.
const sendVerifyEmailOnCreate: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create') return doc;
  if (doc.emailVerified) return doc;

  try {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await req.payload.create({
      collection: 'emailVerifications',
      overrideAccess: true,
      data: { tokenHash, userId: String(doc.id), kind: 'verify', expiresAt },
    });

    const link = `${requireServerUrl()}/api/auth/verify-email?token=${token}`;
    await req.payload.sendEmail({
      to: doc.email,
      subject: 'Bevestig je e-mailadres — Calorietje',
      html: verifyEmail({ name: doc.name ?? null, link }),
    });
  } catch (err) {
    req.payload.logger.error({ err, userId: doc.id }, 'verify-email send failed');
  }

  return doc;
};

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    forgotPassword: {
      generateEmailHTML: (args) => {
        const { token, user } = (args ?? {}) as { token?: string; user?: { name?: string | null; email?: string } };
        const link = `${requireServerUrl()}/reset-password?token=${token ?? ''}`;
        return resetPasswordEmail({ name: user?.name, link });
      },
      generateEmailSubject: () => 'Wachtwoord herstellen — Calorietje',
    },
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role', 'plan', 'aiPhotoCredits'],
  },
  access: {
    create: () => true,
    read: adminOrSelfUser,
    update: adminOrSelfUser,
    delete: adminOrSelfUser,
    admin: ({ req: { user } }) => isAdmin(user),
  },
  hooks: {
    beforeValidate: [lockPrivilegedFieldsOnSelfWrite],
    afterChange: [sendVerifyEmailOnCreate],
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'emailVerified',
      type: 'checkbox',
      defaultValue: false,
      access: { update: () => false },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'hasPassword',
      type: 'checkbox',
      defaultValue: true,
      access: { update: () => false },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      // Gekoppelde sociale accounts. Alleen schrijfbaar via server-side
      // mutaties (overrideAccess: true), niet via PATCH /api/users/:id.
      name: 'providers',
      type: 'array',
      access: { update: () => false },
      admin: { readOnly: true },
      fields: [
        {
          name: 'provider',
          type: 'select',
          required: true,
          options: [
            { label: 'Google', value: 'google' },
            { label: 'Facebook', value: 'facebook' },
            { label: 'Passkey (placeholder)', value: 'passkey' },
          ],
        },
        { name: 'providerUserId', type: 'text', required: true, index: true },
        { name: 'email', type: 'text' },
        { name: 'emailVerified', type: 'checkbox', defaultValue: false },
        { name: 'linkedAt', type: 'date', defaultValue: () => new Date() },
      ],
    },
    {
      // WebAuthn-credentials. Alleen schrijfbaar via server-side mutaties.
      name: 'passkeyCredentials',
      type: 'array',
      access: { update: () => false },
      admin: { readOnly: true },
      fields: [
        { name: 'credentialId', type: 'text', required: true, unique: true, index: true },
        { name: 'publicKey', type: 'text', required: true },
        { name: 'counter', type: 'number', required: true, defaultValue: 0 },
        { name: 'transports', type: 'json' },
        {
          name: 'deviceType',
          type: 'select',
          options: [
            { label: 'Single device', value: 'singleDevice' },
            { label: 'Multi device', value: 'multiDevice' },
          ],
        },
        { name: 'backedUp', type: 'checkbox', defaultValue: false },
        { name: 'label', type: 'text' },
        { name: 'createdAt', type: 'date', defaultValue: () => new Date() },
        { name: 'lastUsedAt', type: 'date' },
      ],
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Gebruiker', value: 'user' },
        { label: 'Admin', value: 'admin' },
      ],
      defaultValue: 'user',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'plan',
      type: 'select',
      options: [
        { label: 'Free', value: 'FREE' },
        { label: 'Premium', value: 'PREMIUM' },
        { label: 'Pro', value: 'PRO' },
      ],
      defaultValue: 'FREE',
      required: true,
    },
    { name: 'aiPhotoCredits', type: 'number', defaultValue: 5, required: true },
    { name: 'creditsResetAt', type: 'date', defaultValue: () => new Date() },
    { name: 'dailyCalorieGoal', type: 'number', defaultValue: 2000, min: 0, max: 20000 },
    { name: 'weightKg', type: 'number', min: 0, max: 500 },
    { name: 'heightCm', type: 'number', min: 0, max: 300 },
    { name: 'birthDate', type: 'date' },
    {
      name: 'gender',
      type: 'select',
      options: [
        { label: 'Man', value: 'MALE' },
        { label: 'Vrouw', value: 'FEMALE' },
        { label: 'Anders', value: 'OTHER' },
      ],
    },
    {
      name: 'activityLevel',
      type: 'select',
      options: [
        { label: 'Weinig beweging', value: 'SEDENTARY' },
        { label: 'Licht actief', value: 'LIGHT' },
        { label: 'Matig actief', value: 'MODERATE' },
        { label: 'Actief', value: 'ACTIVE' },
        { label: 'Zeer actief', value: 'VERY_ACTIVE' },
      ],
      defaultValue: 'MODERATE',
    },
    {
      name: 'timezone',
      type: 'text',
      required: true,
      defaultValue: DEFAULT_TIMEZONE,
      validate: (value: unknown) => {
        // Geen vroege return op '': een PATCH met lege string zou via
        // CREATE-default vrij komen, maar bij UPDATE kan het de kolom op
        // '' zetten (DB DEFAULT geldt alleen op INSERT). Wijs het hier af.
        if (value == null) return true;
        return isValidTimezone(value) || 'Ongeldige IANA-tijdzone';
      },
    },
  ],
};
