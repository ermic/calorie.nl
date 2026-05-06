import { NextRequest, NextResponse } from 'next/server';
import { Google, generateCodeVerifier, generateState } from 'arctic';
import { getPayload } from '@/shared/lib/payload';
import { getRouteUser } from '@/shared/lib/route-auth';
import { requireServerUrl } from '@/shared/lib/server-url';
import { hashToken } from '@/shared/lib/tokens';

export const runtime = 'nodejs';

const STATE_TTL_MS = 10 * 60 * 1000;

function safeRedirectTo(raw: string | null): string {
  if (!raw) return '/dashboard';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  return raw;
}

// Start van de Google OAuth flow. intent=login (default) of intent=link
// (alleen voor reeds ingelogde users die een Google-account willen
// koppelen). Persist state + PKCE-verifier in login_challenges; arctic
// bouwt de Google-authorize-URL.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const intent = url.searchParams.get('intent') === 'link' ? 'link' : 'login';
  const redirectTo = safeRedirectTo(url.searchParams.get('redirectTo'));
  const base = requireServerUrl();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${base}/api/auth/google/callback`;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${base}/login?error=oauth_not_configured`, 303);
  }

  let userId: string | undefined;
  if (intent === 'link') {
    const user = await getRouteUser();
    if (!user) {
      return NextResponse.redirect(`${base}/login?error=oauth_link_requires_login`, 303);
    }
    userId = String(user.id);
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const payload = await getPayload();
  await payload.create({
    collection: 'loginChallenges',
    overrideAccess: true,
    data: {
      kind: 'oauth-state',
      // Hash state in DB zodat een DB-leak geen actieve OAuth-flows
      // hijack-baar maakt. Plain state gaat alleen via redirect mee.
      challenge: hashToken(state),
      pkceVerifier: codeVerifier,
      provider: 'google',
      intent,
      userId,
      returnTo: redirectTo,
      expiresAt: new Date(Date.now() + STATE_TTL_MS).toISOString(),
    },
  });

  const google = new Google(clientId, clientSecret, redirectUri);
  const authUrl = google.createAuthorizationURL(state, codeVerifier, [
    'openid',
    'email',
    'profile',
  ]);
  authUrl.searchParams.set('access_type', 'online');
  authUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(authUrl.toString(), 303);
}
