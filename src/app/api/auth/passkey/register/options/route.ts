import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getPayload } from '@/shared/lib/payload';
import { getRouteUser } from '@/shared/lib/route-auth';
import { getRpId, RP_NAME, CHALLENGE_TTL_MS } from '@/shared/lib/webauthn';

export const runtime = 'nodejs';

// Stap 1 van passkey-registratie: server genereert challenge + opties,
// browser geeft ze door aan de authenticator. We persisteren de
// challenge in login_challenges zodat we 'm bij /verify kunnen valideren.
export async function POST() {
  const payload = await getPayload();
  const user = await getRouteUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const rpId = getRpId();
  const userIdBuffer = new TextEncoder().encode(String(user.id));

  const existing = (user.passkeyCredentials ?? []).map((c) => ({
    id: c.credentialId,
    transports: (c.transports as AuthenticatorTransport[] | null | undefined) ?? undefined,
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpId,
    userID: userIdBuffer,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: c.transports })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  const userId = String(user.id);
  // Verwijder oude registreer-challenges voor deze user — een open
  // sessie houden er hooguit één.
  await payload.delete({
    collection: 'loginChallenges',
    where: {
      and: [
        { userId: { equals: userId } },
        { kind: { equals: 'webauthn-register' } },
      ],
    },
    overrideAccess: true,
  });

  await payload.create({
    collection: 'loginChallenges',
    overrideAccess: true,
    data: {
      kind: 'webauthn-register',
      challenge: options.challenge,
      userId,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
    },
  });

  return NextResponse.json(options);
}
