import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { getPayload } from '@/shared/lib/payload';
import { issueSessionForUser } from '@/shared/lib/sessions';
import { getRpId, getRpOrigin } from '@/shared/lib/webauthn';
import type { User } from '@/payload-types';

export const runtime = 'nodejs';

const PASSKEY_LOGIN_COOKIE = 'passkey-login-challenge';

type Body = { response?: AuthenticationResponseJSON };

// Stap 2: browser stuurt assertion door, server zoekt credential op via
// response.id, valideert handtekening + counter, en geeft een sessie uit.
// Challenge wordt opgehaald via cookie die /options heeft gezet — bindt
// verify aan exact die challenge.
export async function POST(request: Request) {
  const payload = await getPayload();
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.response?.id) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const challengeId = cookieStore.get(PASSKEY_LOGIN_COOKIE)?.value;
  if (!challengeId) {
    return NextResponse.json({ error: 'Login-sessie verlopen' }, { status: 400 });
  }

  const challenge = await payload
    .findByID({ collection: 'loginChallenges', id: challengeId, overrideAccess: true })
    .catch(() => null);
  if (
    !challenge ||
    challenge.kind !== 'webauthn-login' ||
    new Date(challenge.expiresAt) < new Date()
  ) {
    return NextResponse.json({ error: 'Login-sessie verlopen' }, { status: 400 });
  }

  // Match credential op de id die de browser teruggeeft.
  const userResult = await payload.find({
    collection: 'users',
    where: { 'passkeyCredentials.credentialId': { equals: body.response.id } },
    limit: 1,
    overrideAccess: true,
    depth: 1,
  });
  const user = userResult.docs[0] as User | undefined;
  const credential = user?.passkeyCredentials?.find((c) => c.credentialId === body.response!.id);
  if (!user || !credential) {
    return NextResponse.json({ error: 'Ongeldige passkey' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getRpOrigin(),
      expectedRPID: getRpId(),
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, 'base64url'),
        counter: credential.counter,
        transports: (credential.transports as AuthenticatorTransport[] | null | undefined) ?? undefined,
      },
    });
  } catch (err) {
    payload.logger.error({ err, userId: user.id }, 'passkey login verify failed');
    return NextResponse.json({ error: 'Ongeldige passkey' }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'Ongeldige passkey' }, { status: 400 });
  }

  // Counter monotoon stijgend; lager = mogelijke kloon → afwijzen.
  const newCounter = verification.authenticationInfo.newCounter;
  if (newCounter < credential.counter) {
    payload.logger.warn(
      { userId: user.id, credentialId: credential.credentialId, oldCounter: credential.counter, newCounter },
      'passkey counter regression — mogelijke gekloonde authenticator',
    );
    return NextResponse.json({ error: 'Ongeldige passkey' }, { status: 400 });
  }

  const updatedCredentials = (user.passkeyCredentials ?? []).map((c) =>
    c.credentialId === credential.credentialId
      ? { ...c, counter: newCounter, lastUsedAt: new Date().toISOString() }
      : c,
  );
  await payload.update({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    data: { passkeyCredentials: updatedCredentials },
  });

  await payload.delete({
    collection: 'loginChallenges',
    id: challenge.id,
    overrideAccess: true,
  });
  cookieStore.delete(PASSKEY_LOGIN_COOKIE);

  await issueSessionForUser(user);

  return NextResponse.json({ user });
}
