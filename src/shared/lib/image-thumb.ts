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
    const srcW = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width;
    const srcH = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height;
    if (!srcW || !srcH) {
      if ('close' in bitmap) bitmap.close();
      return null;
    }

    const { width, height } = fitInside(srcW, srcH, THUMB_MAX_DIM);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if ('close' in bitmap) bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
    if ('close' in bitmap) bitmap.close();

    const dataUrl = canvas.toDataURL('image/webp', WEBP_QUALITY);
    // Sommige browsers (bv. Firefox <93) kunnen toDataURL('image/webp')
    // negeren en een PNG-data-URL teruggeven. Filter die uit zodat de
    // server-side validatie niet verrast wordt.
    if (!dataUrl.startsWith('data:image/webp;')) return null;
    return dataUrl;
  } catch {
    return null;
  }
}
