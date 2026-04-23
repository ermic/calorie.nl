import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { getPayload } from '@/shared/lib/payload';
import { analyzePhoto } from '@/features/analyze-photo';
import { getDailyAICredits } from '@/entities/user/model/calculations';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const payload = await getPayload();

  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const now = new Date();
  const lastReset = user.creditsResetAt ? new Date(user.creditsResetAt) : new Date(0);
  const isNewDay = now.toDateString() !== lastReset.toDateString();

  let credits = user.aiPhotoCredits ?? 0;
  if (isNewDay) {
    credits = getDailyAICredits(user.plan);
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { aiPhotoCredits: credits, creditsResetAt: now.toISOString() },
    });
  }

  if (credits <= 0) {
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

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { aiPhotoCredits: credits - 1 },
    });

    return NextResponse.json({ analysis, creditsRemaining: credits - 1 });
  } catch (err) {
    console.error('Photo analysis failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analyse mislukt' },
      { status: 500 },
    );
  }
}
