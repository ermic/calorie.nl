import { NextResponse } from 'next/server';
import { getPayload } from '@/shared/lib/payload';
import { getRouteUser } from '@/shared/lib/route-auth';

export const runtime = 'nodejs';

// DELETE /api/auth/passkey/credentials/:id — verwijdert één passkey
// van de huidige user. Last-method-guard voorkomt dat een user die
// alleen passkeys heeft (geen wachtwoord, geen providers) z'n laatste
// inlogmethode wegklikt.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: credentialId } = await params;
  const payload = await getPayload();
  const user = await getRouteUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const all = user.passkeyCredentials ?? [];
  const remaining = all.filter((c) => c.credentialId !== credentialId);

  if (remaining.length === all.length) {
    return NextResponse.json({ error: 'Passkey niet gevonden' }, { status: 404 });
  }

  // Last-method-guard: hasPassword OR andere providers (non-passkey) OR
  // een andere passkey moet beschikbaar blijven.
  const otherProviders = (user.providers ?? []).filter((p) => p.provider !== 'passkey');
  if (!user.hasPassword && otherProviders.length === 0 && remaining.length === 0) {
    return NextResponse.json(
      {
        error:
          'Dit is je enige inlogmethode. Stel eerst een wachtwoord in via "Wachtwoord vergeten" voor je deze verwijdert.',
      },
      { status: 409 },
    );
  }

  await payload.update({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    data: { passkeyCredentials: remaining },
  });

  return NextResponse.json({ ok: true });
}
