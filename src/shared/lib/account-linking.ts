import { randomBytes } from 'crypto';
import { getPayload } from './payload';
import type { User } from '@/payload-types';

export type ProviderInput = {
  provider: 'google' | 'facebook';
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name?: string | null;
};

export type LinkResolution =
  | { kind: 'matched'; user: User }
  | { kind: 'created'; user: User }
  | { kind: 'linked'; user: User }
  | { kind: 'conflict-unverified-email' };

// Resolveert een sociaal-account-claim naar een user:
// 1. Match op (provider, providerUserId) → return user.
// 2. Anders, als emailVerified én een user met die email bestaat → koppel
//    provider aan die user.
// 3. Anders, als email-conflict zonder verified email → fout zodat de UI
//    de user kan vragen eerst in te loggen en daarna te koppelen.
// 4. Anders → maak nieuwe user (hasPassword=false, random crypto-pwd).
export async function resolveOrCreateUserForProvider(
  input: ProviderInput,
): Promise<LinkResolution> {
  const payload = await getPayload();
  const normalizedEmail = input.email.trim().toLowerCase();

  // 1. Match op provider-id
  const byProvider = await payload.find({
    collection: 'users',
    where: {
      and: [
        { 'providers.provider': { equals: input.provider } },
        { 'providers.providerUserId': { equals: input.providerUserId } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  if (byProvider.docs[0]) {
    return { kind: 'matched', user: byProvider.docs[0] as User };
  }

  // 2/3. Match op email
  const byEmail = await payload.find({
    collection: 'users',
    where: { email: { equals: normalizedEmail } },
    limit: 1,
    overrideAccess: true,
  });
  if (byEmail.docs[0]) {
    if (!input.emailVerified) {
      return { kind: 'conflict-unverified-email' };
    }
    const target = byEmail.docs[0] as User;
    const existingProviders = target.providers ?? [];
    const updated = await payload.update({
      collection: 'users',
      id: target.id,
      overrideAccess: true,
      data: {
        // Markeer het account als verified — een verified provider
        // bevestigt dat de eigenaar de mailbox controleert.
        emailVerified: true,
        providers: [
          ...existingProviders,
          {
            provider: input.provider,
            providerUserId: input.providerUserId,
            email: normalizedEmail,
            emailVerified: true,
            linkedAt: new Date().toISOString(),
          },
        ],
      },
    });
    return { kind: 'linked', user: updated as User };
  }

  // 4. Nieuwe user. We zetten een lange random "password" zodat Payload's
  // required-veld is gevuld; de user kent 'm niet (hasPassword=false) en
  // moet 'wachtwoord vergeten' doen om er één te zetten. lockPrivileged-
  // FieldsOnSelfWrite vult role/plan/aiPhotoCredits in als defaults bij
  // anonCreate (req.user is undefined onder overrideAccess).
  const randomPwd = randomBytes(32).toString('base64url');
  // Payload v3 RequiredData verwacht role/plan/aiPhotoCredits in de input,
  // maar onze beforeValidate-hook vult die veilig in als defaults bij
  // anonCreate. Cast om de types niet met de hook-defaults te dupliceren.
  const createData = {
    email: normalizedEmail,
    password: randomPwd,
    name: input.name ?? null,
    emailVerified: input.emailVerified,
    hasPassword: false,
    providers: [
      {
        provider: input.provider,
        providerUserId: input.providerUserId,
        email: normalizedEmail,
        emailVerified: input.emailVerified,
        linkedAt: new Date().toISOString(),
      },
    ],
  };
  const created = await payload.create({
    collection: 'users',
    overrideAccess: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: createData as any,
  });
  return { kind: 'created', user: created as User };
}

// Voor intent='link' bij een al ingelogde user — koppelt direct zonder
// resolve. Faalt als die provider-userId al aan een ander account hangt.
export async function linkProviderToUser(
  user: User,
  input: ProviderInput,
): Promise<LinkResolution> {
  const payload = await getPayload();

  const existing = await payload.find({
    collection: 'users',
    where: {
      and: [
        { 'providers.provider': { equals: input.provider } },
        { 'providers.providerUserId': { equals: input.providerUserId } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  const found = existing.docs[0];
  if (found) {
    if (String(found.id) === String(user.id)) {
      return { kind: 'matched', user: found as User };
    }
    return { kind: 'conflict-unverified-email' };
  }

  const existingProviders = user.providers ?? [];
  const updated = await payload.update({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    data: {
      providers: [
        ...existingProviders,
        {
          provider: input.provider,
          providerUserId: input.providerUserId,
          email: input.email.trim().toLowerCase(),
          emailVerified: input.emailVerified,
          linkedAt: new Date().toISOString(),
        },
      ],
    },
  });
  return { kind: 'linked', user: updated as User };
}
