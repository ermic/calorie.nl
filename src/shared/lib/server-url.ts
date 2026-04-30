// Helper voor server-side URLs (mail-links, redirects). Throwt
// expliciet als de env-var ontbreekt zodat een vergeten env in
// productie loud-fail't bij eerste mail-send i.p.v. silent
// onbruikbare links te genereren.
export function requireServerUrl(): string {
  const url = process.env.NEXT_PUBLIC_SERVER_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SERVER_URL ontbreekt — kan geen absolute URL bouwen');
  }
  return url.replace(/\/+$/, '');
}
