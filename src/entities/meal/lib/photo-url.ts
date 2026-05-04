// Sta alleen veilige image-bronnen toe: app-relatieve paden, https://,
// of door ons gegenereerde WebP-thumb-data-URLs (max ~80KB om DOM-
// payloads beheersbaar te houden). Blokt javascript:, http:// (mixed-
// content), andere data: subtypes en willekeurige schemes — photoUrl
// kan via AI- of user-input gezet worden.
const THUMB_DATA_PREFIX = 'data:image/webp;base64,';
const THUMB_DATA_MAX_LENGTH = 80_000;

export function safeImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/')) return url;
  if (url.startsWith('https://')) return url;
  if (url.startsWith(THUMB_DATA_PREFIX) && url.length <= THUMB_DATA_MAX_LENGTH) return url;
  return null;
}
