import { escapeHtml } from '@/shared/lib/html-escape';

export type AccountDeletedEmailProps = {
  name?: string | null;
};

// Bevestigingsmail naar het oude e-mailadres direct na verwijderen.
// User-account is op dat moment al weg; deze mail dient als
// audit-spoor zodat een aanvaller met geldige sessie het account niet
// stilletjes kan verwijderen.
export function accountDeletedEmail({ name }: AccountDeletedEmailProps): string {
  const greeting = name ? `Hoi ${escapeHtml(name)},` : 'Hoi,';
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><title>Je Calorietje-account is verwijderd</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h1 style="font-size:18px;margin:0 0 16px">Je account is verwijderd</h1>
    <p style="margin:0 0 12px">${greeting}</p>
    <p style="margin:0 0 12px">Je Calorietje-account is zojuist op jouw verzoek verwijderd. Inloggen lukt niet meer met dit e-mailadres.</p>
    <p style="margin:0 0 12px">Bedankt dat je Calorietje hebt gebruikt — graag tot ziens.</p>
    <p style="margin:0;font-size:13px;color:#666">Heb jij dit niet zelf gedaan? Neem contact op met support; mogelijk had iemand toegang tot je account.</p>
  </div>
</body>
</html>`;
}
