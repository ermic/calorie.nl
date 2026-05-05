// Sta alleen veilige image-bronnen toe: app-relatieve paden, https://,
// of door ons gegenereerde WebP/JPEG-thumb-data-URLs (max ~80KB om
// DOM-payloads beheersbaar te houden). JPEG is de iOS-Safari-fallback
// voor WebP. Blokt javascript:, http:// (mixed-content), andere data:
// subtypes en willekeurige schemes — photoUrl kan via AI- of user-
// input gezet worden.
const THUMB_DATA_PREFIXES = [
  'data:image/webp;base64,',
  'data:image/jpeg;base64,',
] as const;
const THUMB_DATA_MAX_LENGTH = 80_000;

export function safeImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/')) return url;
  if (url.startsWith('https://')) return url;
  if (
    url.length <= THUMB_DATA_MAX_LENGTH &&
    THUMB_DATA_PREFIXES.some((p) => url.startsWith(p))
  ) {
    return url;
  }
  return null;
}
