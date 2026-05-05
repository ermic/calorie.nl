// Genereert een kleine WebP-thumbnail van een door de gebruiker gekozen
// foto, voor opslag als data-URL in meal.photoUrl. Doel: 256×256 max,
// zware compressie, ~10KB per thumb. Aspect-ratio blijft behouden
// (fit-inside, geen crop).
//
// HEIC/HEIF wordt afgehandeld via een dynamische import van heic2any —
// die library is alleen browser-bruikbaar en weegt ~500KB, dus we
// laden 'm pas wanneer een HEIC daadwerkelijk gezien wordt.
//
// Bij elke fout (corrupt bestand, decoder-crash, niet-ondersteund
// formaat) retourneert generateMealThumb null. De caller slaat de
// meal dan zonder thumb op — beter een lege placeholder dan een
// gefaalde meal-save.

import { detectImageType } from './image-mime';

const THUMB_MAX_DIM = 256;
const WEBP_QUALITY = 0.55;
// JPEG iets hogere quality omdat 'ie minder efficiënt comprimeert dan
// WebP; nog steeds ruim onder de 60KB-cap voor 256×256.
const JPEG_QUALITY = 0.7;

async function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob);
  }
  // Fallback voor oudere browsers zonder createImageBitmap (zeldzaam,
  // maar voorkomt een harde crash op bv. oudere Safari-versies).
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image-load-failed'));
    };
    img.src = url;
  });
}

function fitInside(width: number, height: number, maxDim: number) {
  if (width <= maxDim && height <= maxDim) return { width, height };
  const ratio = width / height;
  return ratio >= 1
    ? { width: maxDim, height: Math.round(maxDim / ratio) }
    : { width: Math.round(maxDim * ratio), height: maxDim };
}

export async function generateMealThumb(file: File): Promise<string | null> {
  try {
    const buffer = await file.arrayBuffer();
    const view = new Uint8Array(buffer);
    const mime = detectImageType(view);
    if (!mime) return null;

    let blob: Blob = file;
    if (mime === 'image/heic' || mime === 'image/heif') {
      // Lazy-load — alleen iOS-uploads betalen de bundle-kost.
      const heic2any = (await import('heic2any')).default;
      const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
      blob = Array.isArray(converted) ? converted[0] : converted;
    }

    const bitmap = await loadBitmap(blob);
    let dataUrl: string;
    try {
      const srcW = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width;
      const srcH = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height;
      if (!srcW || !srcH) return null;

      const { width, height } = fitInside(srcW, srcH, THUMB_MAX_DIM);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
      dataUrl = canvas.toDataURL('image/webp', WEBP_QUALITY);
      // iOS Safari < 16 en sommige iOS PWA-WebViews honoreren WebP-
      // encoding niet en geven dan een PNG terug. Detecteer dat en val
      // terug op JPEG — universeel ondersteund en server-zijdig
      // toegestaan.
      if (!dataUrl.startsWith('data:image/webp;')) {
        dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      }
    } finally {
      // ImageBitmap pakt VRAM tot expliciete close (of GC); op iOS kan
      // drawImage incidenteel throwen — finally zorgt dat we alsnog
      // opruimen i.p.v. tot de volgende GC-cycle te wachten.
      if ('close' in bitmap) bitmap.close();
    }

    if (
      !dataUrl.startsWith('data:image/webp;') &&
      !dataUrl.startsWith('data:image/jpeg;')
    ) {
      return null;
    }
    return dataUrl;
  } catch {
    return null;
  }
}
