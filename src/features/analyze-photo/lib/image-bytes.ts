// Magic bytes per formaat dat Gemini ondersteunt. file.type is
// browser-input en kan liegen — sniff de eerste bytes om willekeurige
// uploads onder een image-vlag te blokkeren.
//   JPEG: FF D8 FF                            (offset 0)
//   PNG:  89 50 4E 47                         (offset 0)
//   WebP: RIFF....WEBP                        (offset 0 + 8)
//   HEIC: ....ftyp{heic|heix|mif1|msf1}       (offset 4)

export type GeminiImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | 'image/heif';

function asciiAt(view: Uint8Array, offset: number, length: number): string {
  if (view.length < offset + length) return '';
  let out = '';
  for (let i = offset; i < offset + length; i++) out += String.fromCharCode(view[i]);
  return out;
}

export function detectImageType(view: Uint8Array): GeminiImageMimeType | null {
  if (view.length < 12) return null;
  if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) return 'image/jpeg';
  if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47) return 'image/png';
  if (asciiAt(view, 0, 4) === 'RIFF' && asciiAt(view, 8, 4) === 'WEBP') return 'image/webp';
  if (asciiAt(view, 4, 4) === 'ftyp') {
    const brand = asciiAt(view, 8, 4);
    if (brand === 'heic' || brand === 'heix') return 'image/heic';
    if (brand === 'mif1' || brand === 'msf1' || brand === 'heif') return 'image/heif';
  }
  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // Browser: gebruik btoa via een chunk-loop om grote arrays op te
  // delen (btoa van een grote string crasht in sommige browsers).
  if (typeof window !== 'undefined') {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return window.btoa(binary);
  }
  return Buffer.from(buffer).toString('base64');
}

export type InlineImage = { inlineData: { data: string; mimeType: GeminiImageMimeType } };

// Eén keer per file uitvoeren; cachen op de File-instance is geen winst
// want we lezen 'm één keer voor recognize en één keer voor estimate.
export async function fileToInlineData(file: File): Promise<InlineImage> {
  const buffer = await file.arrayBuffer();
  const view = new Uint8Array(buffer);
  const mimeType = detectImageType(view);
  if (!mimeType) {
    throw new Error('IMAGE_FORMAT_INVALID');
  }
  return { inlineData: { data: arrayBufferToBase64(buffer), mimeType } };
}
