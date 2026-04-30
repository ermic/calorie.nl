import { escapeHtml } from '@/shared/lib/html-escape';

export type ChangeEmailConfirmProps = {
  name?: string | null;
  link: string;
};

// Wordt naar het NIEUWE adres gestuurd om te bevestigen dat het mailbox-
// eigendom heeft. Pas na klik op de knop wordt het account-e-mailadres
// daadwerkelijk gewijzigd.
export function changeEmailConfirmEmail({ name, link }: ChangeEmailConfirmProps): string {
  const greeting = name ? `Hoi ${escapeHtml(name)},` : 'Hoi,';
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><title>Bevestig je nieuwe e-mailadres</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h1 style="font-size:18px;margin:0 0 16px">Bevestig je nieuwe e-mailadres</h1>
    <p style="margin:0 0 12px">${greeting}</p>
    <p style="margin:0 0 12px">Je hebt aangevraagd om je e-mailadres bij Calorietje te wijzigen. Klik op de knop om dit nieuwe adres te bevestigen. De link is 24 uur geldig.</p>
    <p style="margin:24px 0;text-align:center">
      <a href="${link}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600">Bevestig nieuw e-mailadres</a>
    </p>
    <p style="font-size:13px;color:#666;margin:0 0 8px">Werkt de knop niet? Plak deze link in je browser:</p>
    <p style="font-size:13px;word-break:break-all;margin:0 0 24px"><a href="${link}" style="color:#059669">${link}</a></p>
    <p style="font-size:13px;color:#666;margin:0">Heb je dit niet zelf aangevraagd? Negeer deze e-mail dan.</p>
  </div>
</body>
</html>`;
}
