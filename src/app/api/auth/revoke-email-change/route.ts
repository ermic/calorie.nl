import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from '@/shared/lib/payload';
import { hashToken } from '@/shared/lib/tokens';
import { changeEmailRevokedEmail } from '@/shared/email/changeEmailRevoked';

export const runtime = 'nodejs';

// Trekt een lopende e-mailwijziging in via klik in de mail naar het
// OUDE adres. Verwijdert beide tokens (confirm + revoke); stuurt een
// bevestigingsmail naar het oude adres.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const base = process.env.NEXT_PUBLIC_SERVER_URL ?? '';

  if (!token) {
    return NextResponse.redirect(`${base}/login?error=email_change_invalid`, 303);
  }

  const payload = await getPayload();
  const tokenHash = hashToken(token);

  const result = await payload.find({
    collection: 'emailVerifications',
    where: {
      and: [
        { tokenHash: { equals: tokenHash } },
        { kind: { equals: 'change-revoke' } },
        { expiresAt: { greater_than: new Date().toISOString() } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  const record = result.docs[0];
  if (!record) {
    return NextResponse.redirect(`${base}/login?error=email_change_invalid`, 303);
  }

  await payload.delete({
    collection: 'emailVerifications',
    where: {
      and: [
        { userId: { equals: record.userId } },
        { kind: { in: ['change-confirm', 'change-revoke'] } },
      ],
    },
    overrideAccess: true,
  });

  // Notificatiemail naar oude adres (= huidige users.email). Failure
  // niet kritisch: revoke is al doorgevoerd.
  try {
    const userResult = await payload.findByID({
      collection: 'users',
      id: record.userId,
      overrideAccess: true,
    });
    if (userResult?.email) {
      await Promise.race([
        payload.sendEmail({
          to: userResult.email,
          subject: 'E-mailwijziging ingetrokken — Calorietje',
          html: changeEmailRevokedEmail({ name: userResult.name ?? null }),
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SMTP timeout')), 10_000),
        ),
      ]);
    }
  } catch (err) {
    payload.logger.error({ err, userId: record.userId }, 'revoke-email-change notify failed');
  }

  return NextResponse.redirect(`${base}/login?email_change_revoked=1`, 303);
}
