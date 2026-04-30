import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from '@/shared/lib/payload';
import { hashToken } from '@/shared/lib/tokens';

export const runtime = 'nodejs';

// Bevestigt een e-mailwijziging via klik in de mail naar het NIEUWE
// adres. Pas hier wisselt users.email + emailVerified=true. Beide
// tokens (confirm + revoke) voor deze user worden opgeruimd zodat de
// oude revoke-link niet meer werkt.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const base = process.env.NEXT_PUBLIC_SERVER_URL ?? '';

  if (!token) {
    return NextResponse.redirect(`${base}/login?error=email_change_invalid`, 303);
  }

  const payload = await getPayload();
  const tokenHash = hashToken(token);

  // Lazy cleanup van verlopen tokens, probabilistisch (~5%).
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
        { kind: { equals: 'change-confirm' } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  const record = result.docs[0];
  if (!record || !record.newEmail) {
    return NextResponse.redirect(`${base}/login?error=email_change_invalid`, 303);
  }

  // De newEmail kan ondertussen bij een andere user terecht zijn gekomen
  // (bv. via een ander account dat hem registreerde). Re-check uniciteit
  // vóór we wisselen — anders breken we de unique-constraint.
  const conflicting = await payload.find({
    collection: 'users',
    where: { email: { equals: record.newEmail } },
    limit: 1,
    overrideAccess: true,
  });
  if (conflicting.docs.length > 0 && String(conflicting.docs[0].id) !== record.userId) {
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
    return NextResponse.redirect(`${base}/login?error=email_change_taken`, 303);
  }

  try {
    await payload.update({
      collection: 'users',
      id: record.userId,
      data: { email: record.newEmail, emailVerified: true },
      overrideAccess: true,
    });
  } catch (err) {
    payload.logger.error({ err, userId: record.userId }, 'confirm-email-change update failed');
    return NextResponse.redirect(`${base}/login?error=email_change_invalid`, 303);
  }

  // Beide tokens + eventuele eerste-verify rijen weg — schoon opnieuw beginnen.
  await payload.delete({
    collection: 'emailVerifications',
    where: { userId: { equals: record.userId } },
    overrideAccess: true,
  });

  return NextResponse.redirect(`${base}/login?email_changed=1`, 303);
}
