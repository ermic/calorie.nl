import { NextResponse } from 'next/server';
import { getPayload } from '@/shared/lib/payload';
import { getRouteUser } from '@/shared/lib/route-auth';

export const runtime = 'nodejs';

const KNOWN_PROVIDERS = new Set(['google', 'facebook']);

// DELETE /api/auth/providers/:provider — verwijdert alle entries voor
// dat provider-type van de huidige user. Last-method-guard voorkomt
// dat een user zichzelf permanent buitensluit.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!KNOWN_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Onbekende provider' }, { status: 400 });
  }

  const payload = await getPayload();
  const user = await getRouteUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const allProviders = user.providers ?? [];
  const remaining = allProviders.filter((p) => p.provider !== provider);

  if (remaining.length === allProviders.length) {
    return NextResponse.json(
      { error: 'Deze provider is niet gekoppeld.' },
      { status: 404 },
    );
  }

  // Last-method-guard: een user moet altijd minstens één manier hebben
  // om in te loggen. hasPassword=true OR een ander provider OR (later)
  // een passkey is voldoende.
  // 'passkey'-providers in users.providers zijn placeholders — echte
  // passkey-credentials komen in fase 3 in een aparte sub-collection.
  // Voor nu tellen we dus alleen non-passkey-providers.
  const remainingActiveProviders = remaining.filter((p) => p.provider !== 'passkey');
  if (!user.hasPassword && remainingActiveProviders.length === 0) {
    return NextResponse.json(
      {
        error:
          'Dit is je enige inlogmethode. Stel eerst een wachtwoord in via "Wachtwoord vergeten" voor je deze ontkoppelt.',
      },
      { status: 409 },
    );
  }

  await payload.update({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    data: { providers: remaining },
  });

  return NextResponse.json({ ok: true });
}
