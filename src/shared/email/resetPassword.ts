import { escapeHtml } from '@/shared/lib/html-escape';

export type ResetPasswordEmailProps = {
  name?: string | null;
  link: string;
};

export function resetPasswordEmail({ name, link }: ResetPasswordEmailProps): string {
  const greeting = name ? `Hoi ${escapeHtml(name)},` : 'Hoi,';
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><title>Wachtwoord herstellen</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h1 style="font-size:18px;margin:0 0 16px">Wachtwoord herstellen</h1>
    <p style="margin:0 0 12px">${greeting}</p>
    <p style="margin:0 0 12px">Je hebt een verzoek gedaan om je wachtwoord te herstellen. Klik op de knop om een nieuw wachtwoord in te stellen. De link is 1 uur geldig.</p>
    <p style="margin:24px 0;text-align:center">
      <a href="${link}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600">Nieuw wachtwoord instellen</a>
    </p>
    <p style="font-size:13px;color:#666;margin:0 0 8px">Werkt de knop niet? Plak deze link in je browser:</p>
    <p style="font-size:13px;color:#059669;word-break:break-all;margin:0 0 24px"><a href="${link}" style="color:#059669">${link}</a></p>
    <p style="font-size:13px;color:#666;margin:0">Heb je dit niet aangevraagd? Negeer deze e-mail dan, je wachtwoord blijft ongewijzigd.</p>
  </div>
</body>
</html>`;
}
