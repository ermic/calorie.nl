import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { sql } from '@payloadcms/db-postgres';
import { getPayload } from '@/shared/lib/payload';
import { analyzePhoto, type GeminiImageMimeType } from '@/features/analyze-photo';
import { getDailyAICredits } from '@/entities/user/model/calculations';
import { isAdmin } from '@/shared/payload/hooks';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_FILE_BYTES = 4 * 1024 * 1024;
// Body bevat multipart-overhead bovenop de foto. 6 MB vangt de overhead
// op maar rejecteert vroege wanpraktijken (10 MB+ payloads) voordat Next
// ze in memory buffert.
const MAX_BODY_BYTES = 6 * 1024 * 1024;

// Magic bytes per formaat dat Gemini 2.5 ondersteunt. file.type is
// browser-input en kan liegen — sniff de eerste bytes om willekeurige
// uploads onder een image-vlag te blokkeren.
//   JPEG: FF D8 FF                            (offset 0)
//   PNG:  89 50 4E 47                         (offset 0)
//   WebP: RIFF....WEBP                        (offset 0 + 8)
//   HEIC: ....ftyp{heic|heix|mif1|msf1}       (offset 4)
function asciiAt(buffer: Buffer, offset: number, length: number): string {
  if (buffer.length < offset + length) return '';
  return buffer.subarray(offset, offset + length).toString('ascii');
}

function detectImageType(buffer: Buffer): GeminiImageMimeType | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (asciiAt(buffer, 0, 4) === 'RIFF' && asciiAt(buffer, 8, 4) === 'WEBP') return 'image/webp';
  if (asciiAt(buffer, 4, 4) === 'ftyp') {
    const brand = asciiAt(buffer, 8, 4);
    if (brand === 'heic' || brand === 'heix') return 'image/heic';
    if (brand === 'mif1' || brand === 'msf1' || brand === 'heif') return 'image/heif';
  }
  return null;
}

type CreditRow = { ai_photo_credits: number };

// Atomic credit-decrement via raw SQL. Als de laatste reset NULL is of
// < vandaag (server-TZ) was, refill naar dailyMax − 1; anders gewoon
// −1. Niets updaten als er geen credits over zijn en het dezelfde dag
// is. Zero rows returned = 429. Voorkomt races tussen parallelle tabs.
// GREATEST-clamp op de refill zodat een toekomstig plan met dailyMax=0
// geen negatief getal in de kolom kan zetten.
async function consumeCredit(
  db: Awaited<ReturnType<typeof getPayload>>['db'],
  userId: number,
  dailyMax: number,
): Promise<number | null> {
  const result = await db.drizzle.execute(sql`
    UPDATE users
    SET
      ai_photo_credits = CASE
        WHEN credits_reset_at IS NULL OR DATE(credits_reset_at) < CURRENT_DATE THEN GREATEST(${dailyMax - 1}, 0)
        ELSE ai_photo_credits - 1
      END,
      credits_reset_at = CASE
        WHEN credits_reset_at IS NULL OR DATE(credits_reset_at) < CURRENT_DATE THEN NOW()
        ELSE credits_reset_at
      END
    WHERE id = ${userId}
      AND (credits_reset_at IS NULL OR DATE(credits_reset_at) < CURRENT_DATE OR ai_photo_credits > 0)
    RETURNING ai_photo_credits
  `);
  const rows = (result as unknown as { rows: CreditRow[] }).rows;
  return rows[0]?.ai_photo_credits ?? null;
}

export async function POST(req: NextRequest) {
  const payload = await getPayload();

  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const bypassCredits = isAdmin(user);

  // Early reject op Content-Length zodat Next een 10MB+ payload niet
  // eerst volledig buffert.
  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: `Foto te groot (max ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB)` },
      { status: 413 },
    );
  }

  // Credit-check: atomic decrement vooraf. Voorkomt double-spend bij
  // parallelle tabs. Admins bypassen.
  let creditsRemaining: number | null = null;
  if (!bypassCredits) {
    creditsRemaining = await consumeCredit(payload.db, user.id, getDailyAICredits(user.plan));
    if (creditsRemaining === null) {
      return NextResponse.json(
        { error: 'Geen AI-credits meer vandaag', upgradeRequired: user.plan === 'FREE' },
        { status: 429 },
      );
    }
  }

  const formData = await req.formData();
  const file = formData.get('photo') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Geen foto meegestuurd' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `Foto te groot (max ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB)` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectImageType(buffer);
  if (!detectedType) {
    return NextResponse.json(
      { error: 'Ongeldig beeldformaat. JPEG, PNG, WebP, HEIC en HEIF worden ondersteund.' },
      { status: 400 },
    );
  }

  const base64 = buffer.toString('base64');

  try {
    const analysis = await analyzePhoto(base64, detectedType);
    return NextResponse.json({ analysis, creditsRemaining });
  } catch (err) {
    console.error('Photo analysis failed:', err);
    // Credit is al geconsumeerd — we refunden niet. Bij herhaalde Gemini-
    // outage zou dat anders oneindig credits teruggeven; gebruiker ziet
    // de 503 en wacht.
    const raw = err instanceof Error ? err.message : '';
    if (raw.includes('429') || raw.toLowerCase().includes('quota')) {
      return NextResponse.json(
        { error: 'AI-dienst heeft de dagelijkse limiet bereikt. Probeer later opnieuw.' },
        { status: 503 },
      );
    }
    if (
      raw.includes('503') ||
      raw.toLowerCase().includes('service unavailable') ||
      raw.toLowerCase().includes('high demand')
    ) {
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
    return NextResponse.json({ error: 'Analyse mislukt. Probeer het opnieuw.' }, { status: 502 });
  }
}
