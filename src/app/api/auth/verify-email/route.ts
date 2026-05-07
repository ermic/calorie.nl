import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from '@/shared/lib/payload';
import { hashToken } from '@/shared/lib/tokens';

export const runtime = 'nodejs';

// Bevestigt het e-mailadres van een user. Token komt uit de mail-link;
// we matchen op sha256-hash zodat plain tokens nooit in de DB staan.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const base = process.env.NEXT_PUBLIC_SERVER_URL ?? '';

  if (!token) {
    return NextResponse.redirect(`${base}/login?error=verify_invalid`, 303);
  }

  const payload = await getPayload();
  const tokenHash = hashToken(token);

  // Lazy cleanup van verlopen tokens — voorkomt onbeperkte DB-groei.
  // Probabilistisch (~5%) zodat we niet bij elke valid-click een
  // schrijvende DELETE doen onder load.
  if (Math.random() < 0.05) {
    await payload.delete({
      collection: 'emailVerifications',
      where: { expiresAt: { less_than: new Date().toISOString() } },
      overrideAccess: true,
    });
  }

  const result = await payload.find({
    collection: 'emailVerifications',
    where: {
      and: [
        { tokenHash: { equals: tokenHash } },
        { kind: { equals: 'verify' } },
        { expiresAt: { greater_than: new Date().toISOString() } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  const record = result.docs[0];

  if (!record) {
    return NextResponse.redirect(`${base}/login?error=verify_invalid`, 303);
  }

  // User kan tussen mail-send en click verwijderd zijn (admin-action of
  // straks fase-4 self-delete). Vang dat af i.p.v. een 500 te tonen.
  try {
    await payload.update({
      collection: 'users',
      id: record.userId,
      data: { emailVerified: true },
      overrideAccess: true,
    });
  } catch (err) {
    payload.logger.error({ err, userId: record.userId }, 'verify-email update failed');
    await payload.delete({
      collection: 'emailVerifications',
      where: { tokenHash: { equals: tokenHash } },
      overrideAccess: true,
    });
    return NextResponse.redirect(`${base}/login?error=verify_invalid`, 303);
  }
  // Delete-by-where i.p.v. by-id om de race tussen parallelle clicks
  // (mail-preview + user-click) niet te laten 500'en.
  await payload.delete({
    collection: 'emailVerifications',
    where: { tokenHash: { equals: tokenHash } },
    overrideAccess: true,
  });

  return NextResponse.redirect(`${base}/login?verified=1`, 303);
}
