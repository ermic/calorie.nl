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
  ],
};
