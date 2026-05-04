// Detectie + base64-encoding voor de Gemini-pipeline. De magic-byte-
// sniffer zelf zit in shared/lib/image-mime omdat de thumb-generator
// dezelfde detectie nodig heeft — feature mag uit shared importeren,
// shared niet uit feature.

import { detectImageType, type DetectedImageMime } from '@/shared/lib/image-mime';

// Re-export onder de oude naam zodat publieke consumers van deze
// feature (via index.ts) niet hoeven te wijzigen. Set is identiek:
// alle gedetecteerde formaten worden door Gemini geaccepteerd.
export type GeminiImageMimeType = DetectedImageMime;
export { detectImageType };

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
