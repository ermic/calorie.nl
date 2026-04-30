import { NextRequest, NextResponse } from 'next/server';
import { Google } from 'arctic';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { hashToken } from '@/shared/lib/tokens';
import { getPayload } from '@/shared/lib/payload';
import { requireServerUrl } from '@/shared/lib/server-url';
import { issueSessionCookieOnResponse } from '@/shared/lib/sessions';
import {
  linkProviderToUser,
  resolveOrCreateUserForProvider,
} from '@/shared/lib/account-linking';
import type { User } from '@/payload-types';

export const runtime = 'nodejs';

type GoogleIdTokenClaims = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

// JWKS voor Google's OpenID Connect id_tokens. createRemoteJWKSet cachet
// de keys per request-cycle en hertrekt automatisch bij rotation.
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

function safeRedirectTo(raw: string | null | undefined): string {
  if (!raw) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

// Callback voor Google OAuth. Match state tegen login_challenges,
// wisselt code voor tokens, decodeert id_token, resolveert (of maakt)
// een user, geeft een sessie uit en redirect naar returnTo.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const base = requireServerUrl();

  if (!code || !state) {
    return NextResponse.redirect(`${base}/login?error=oauth_state_mismatch`, 303);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${base}/api/auth/google/callback`;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${base}/login?error=oauth_not_configured`, 303);
  }

  const payload = await getPayload();

  // Lazy cleanup van verlopen challenges, probabilistisch (~5%).
  // Errors in de cleanup mogen de OAuth-flow niet brekken — de cleanup
  // is best-effort.
  if (Math.random() < 0.05) {
    try {
      await payload.delete({
        collection: 'loginChallenges',
        where: { expiresAt: { less_than: new Date().toISOString() } },
        overrideAccess: true,
      });
    } catch (err) {
      payload.logger.error({ err }, 'google oauth lazy challenge-cleanup failed');
    }
  }

  const result = await payload.find({
    collection: 'loginChallenges',
    where: {
      and: [
        { kind: { equals: 'oauth-state' } },
        { challenge: { equals: hashToken(state) } },
        { provider: { equals: 'google' } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  const challenge = result.docs[0];
  if (!challenge || !challenge.pkceVerifier) {
    return NextResponse.redirect(`${base}/login?error=oauth_state_mismatch`, 303);
  }

  // Single-use: meteen verwijderen zodat een replay van dezelfde state
  // niet kan slagen, ongeacht success of failure verderop.
  await payload.delete({
    collection: 'loginChallenges',
    id: challenge.id,
    overrideAccess: true,
  });

  let claims: GoogleIdTokenClaims;
  try {
    const google = new Google(clientId, clientSecret, redirectUri);
    const tokens = await google.validateAuthorizationCode(code, challenge.pkceVerifier);
    const idToken = tokens.idToken();
    // Verifieer id_token-handtekening tegen Google's JWKS + check
    // issuer/audience. Beschermt tegen geforceerde tokens als de
    // tokenexchange ooit gespoofd zou worden.
    const verified = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: clientId,
    });
    claims = verified.payload as GoogleIdTokenClaims;
  } catch (err) {
    payload.logger.error({ err }, 'google oauth token-exchange failed');
    return NextResponse.redirect(`${base}/login?error=oauth_provider_error`, 303);
  }

  if (!claims.sub) {
    return NextResponse.redirect(`${base}/login?error=oauth_provider_error`, 303);
  }
  if (!claims.email) {
    return NextResponse.redirect(`${base}/login?error=email_required`, 303);
  }

  const providerInput = {
    provider: 'google' as const,
    providerUserId: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified === true,
    name: claims.name ?? null,
  };
  const returnTo = safeRedirectTo(challenge.returnTo);

  let user: User;
  try {
    if (challenge.intent === 'link' && challenge.userId) {
      const existing = await payload.findByID({
        collection: 'users',
        id: challenge.userId,
        overrideAccess: true,
      });
      if (!existing) {
        return NextResponse.redirect(`${base}/login?error=oauth_link_requires_login`, 303);
      }
      const linked = await linkProviderToUser(existing as User, providerInput);
      if (linked.kind === 'conflict-unverified-email') {
        return NextResponse.redirect(`${base}/login?error=oauth_already_linked`, 303);
      }
      user = linked.user;
    } else {
      const resolution = await resolveOrCreateUserForProvider(providerInput);
      if (resolution.kind === 'conflict-unverified-email') {
        return NextResponse.redirect(
          `${base}/login?error=account_exists_login_first&provider=google`,
          303,
        );
      }
      user = resolution.user;
    }
  } catch (err) {
    payload.logger.error({ err }, 'google oauth account-linking failed');
    return NextResponse.redirect(`${base}/login?error=oauth_provider_error`, 303);
  }

  // Geen 303 naar `${returnTo}` — die request krijgt van de browser
  // `Sec-Fetch-Site: cross-site` (Google staat in de redirect-chain) en
  // dan weigert payload.auth de net-uitgegeven cookie. We renderen
  // daarom een mini-HTML met een client-side redirect (meta-refresh +
  // JS-fallback). Die JS-/meta-navigatie wordt vanuit ons eigen origin
  // geïnitieerd → `Sec-Fetch-Site: same-origin` → cookie geaccepteerd.
  const target = `${base}${returnTo}`;
  // HTML-attribute escape voor de meta-refresh url.
  const attrEscaped = target.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  // JSON-string escape + extra `<` → `<` zodat een opzettelijke
  // returnTo met `</script>` niet uit de script-tag kan breken.
  const jsLiteral = JSON.stringify(target).replace(/</g, '\\u003c');
  const html = `<!doctype html>
<html lang="nl"><head>
<meta charset="utf-8">
<title>Inloggen…</title>
<meta http-equiv="refresh" content="0; url=${attrEscaped}">
<script>window.location.replace(${jsLiteral});</script>
</head><body><p>Inloggen voltooid, een moment…</p></body></html>`;
  const response = new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
  try {
    await issueSessionCookieOnResponse(user, response);
  } catch (err) {
    payload.logger.error({ err, userId: user.id }, 'google oauth issueSession failed');
    return NextResponse.redirect(`${base}/login?error=oauth_provider_error`, 303);
  }

  return response;
}
