import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { getPayload } from '@/shared/lib/payload';
import { analyzePhoto } from '@/features/analyze-photo';
import { getDailyAICredits } from '@/entities/user/model/calculations';
import { isAdmin } from '@/shared/payload/hooks';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const payload = await getPayload();

  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  // Admins kunnen ongehinderd testen en ontwikkelen.
  const bypassCredits = isAdmin(user);

  const now = new Date();
  const lastReset = user.creditsResetAt ? new Date(user.creditsResetAt) : new Date(0);
  const isNewDay = now.toDateString() !== lastReset.toDateString();

  let credits = user.aiPhotoCredits ?? 0;
  if (!bypassCredits && isNewDay) {
    credits = getDailyAICredits(user.plan);
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { aiPhotoCredits: credits, creditsResetAt: now.toISOString() },
    });
  }

  if (!bypassCredits && credits <= 0) {
    return NextResponse.json(
      { error: 'Geen AI-credits meer vandaag', upgradeRequired: user.plan === 'FREE' },
      { status: 429 },
    );
  }

  const formData = await req.formData();
  const file = formData.get('photo') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Geen foto meegestuurd' }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Foto te groot (max 4MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

  try {
    const analysis = await analyzePhoto(base64, mimeType);

    if (!bypassCredits) {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: { aiPhotoCredits: credits - 1 },
      });
    }

    return NextResponse.json({
      analysis,
      creditsRemaining: bypassCredits ? null : credits - 1,
    });
  } catch (err) {
    console.error('Photo analysis failed:', err);
    // Gemini errors stoppen hun HTTP-status in de message. Map bekende
    // gevallen naar een nette NL-foutmelding; anders generiek 502.
    const raw = err instanceof Error ? err.message : '';
    if (raw.includes('429') || raw.toLowerCase().includes('quota')) {
      return NextResponse.json(
        { error: 'AI-dienst heeft de dagelijkse limiet bereikt. Probeer later opnieuw.' },
        { status: 503 },
      );
    }
    if (raw.includes('503') || raw.toLowerCase().includes('service unavailable') || raw.toLowerCase().includes('high demand')) {
      return NextResponse.json(
        { error: 'AI-dienst is tijdelijk overbelast. Probeer over een minuut opnieuw.' },
        { status: 503 },
      );
    }
    if (raw.includes('404') || raw.toLowerCase().includes('not found')) {
      return NextResponse.json(
        { error: 'AI-model is niet beschikbaar. Neem contact op met de beheerder.' },
        { status: 502 },
      );
    }
    if (raw.toLowerCase().includes('api key') || raw.includes('403')) {
      return NextResponse.json(
        { error: 'AI-dienst is niet juist geconfigureerd.' },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: 'Analyse mislukt. Probeer het opnieuw.' },
      { status: 502 },
    );
  }
}
