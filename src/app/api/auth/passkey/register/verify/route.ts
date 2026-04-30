import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { getPayload } from '@/shared/lib/payload';
import { getRouteUser } from '@/shared/lib/route-auth';
import { getRpId, getRpOrigin } from '@/shared/lib/webauthn';

export const runtime = 'nodejs';

type Body = {
  response?: RegistrationResponseJSON;
  label?: string;
};

// Stap 2: browser stuurt het attestation-resultaat door, server
// valideert tegen onze opgeslagen challenge en persisteert de credential.
export async function POST(request: Request) {
  const payload = await getPayload();
  const user = await getRouteUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.response) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 });
  }

  const userId = String(user.id);
  const result = await payload.find({
    collection: 'loginChallenges',
    where: {
      and: [
        { userId: { equals: userId } },
        { kind: { equals: 'webauthn-register' } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  const challenge = result.docs[0];
  if (!challenge) {
    return NextResponse.json({ error: 'Registratie verlopen' }, { status: 400 });
  }
  if (new Date(challenge.expiresAt) < new Date()) {
    await payload.delete({ collection: 'loginChallenges', id: challenge.id, overrideAccess: true });
    return NextResponse.json({ error: 'Registratie verlopen' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getRpOrigin(),
      expectedRPID: getRpId(),
    });
  } catch (err) {
    payload.logger.error({ err, userId }, 'passkey register verify failed');
    return NextResponse.json({ error: 'Verificatie mislukt' }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Verificatie mislukt' }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  const existing = user.passkeyCredentials ?? [];
  await payload.update({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    data: {
      passkeyCredentials: [
        ...existing,
        {
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString('base64url'),
          counter: credential.counter,
          transports: (credential.transports ?? []) as unknown as Record<string, unknown>,
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          label: body.label ?? defaultLabel(request),
          createdAt: new Date().toISOString(),
        },
      ],
    },
  });

  await payload.delete({
    collection: 'loginChallenges',
    id: challenge.id,
    overrideAccess: true,
  });

  return NextResponse.json({ ok: true });
}

function defaultLabel(req: Request): string {
  const ua = req.headers.get('user-agent') ?? '';
  if (/iPhone|iPad/i.test(ua)) return 'iPhone/iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'Apparaat';
}
