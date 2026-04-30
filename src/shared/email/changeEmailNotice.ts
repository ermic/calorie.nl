import { escapeHtml } from '@/shared/lib/html-escape';

export type ChangeEmailNoticeProps = {
  name?: string | null;
  newEmail: string;
  revokeLink: string;
};

// Wordt naar het OUDE adres gestuurd zodra een e-mailwijziging is
// aangevraagd, zodat de eigenaar van het oude adres kan ingrijpen als
// het verzoek niet van hem afkomstig was.
export function changeEmailNoticeEmail({ name, newEmail, revokeLink }: ChangeEmailNoticeProps): string {
  const greeting = name ? `Hoi ${escapeHtml(name)},` : 'Hoi,';
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><title>E-mailwijziging aangevraagd</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h1 style="font-size:18px;margin:0 0 16px">E-mailwijziging aangevraagd</h1>
    <p style="margin:0 0 12px">${greeting}</p>
    <p style="margin:0 0 12px">Er is gevraagd om je Calorietje-account te wijzigen naar <strong>${escapeHtml(newEmail)}</strong>. De wijziging gaat alleen door als die nieuwe ontvanger zelf bevestigt.</p>
    <p style="margin:0 0 12px">Was jij dit niet? Trek het verzoek dan in via onderstaande knop. De link is 24 uur geldig.</p>
    <p style="margin:24px 0;text-align:center">
      <a href="${revokeLink}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600">Verzoek intrekken</a>
    </p>
    <p style="font-size:13px;color:#666;margin:0">Was jij dit wel? Dan hoef je niets te doen — bevestig op het nieuwe adres en je bent klaar.</p>
  </div>
</body>
</html>`;
}
