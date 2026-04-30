import { escapeHtml } from '@/shared/lib/html-escape';

export type PasswordChangedEmailProps = {
  name?: string | null;
};

export function passwordChangedEmail({ name }: PasswordChangedEmailProps): string {
  const greeting = name ? `Hoi ${escapeHtml(name)},` : 'Hoi,';
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><title>Wachtwoord gewijzigd</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h1 style="font-size:18px;margin:0 0 16px">Je wachtwoord is gewijzigd</h1>
    <p style="margin:0 0 12px">${greeting}</p>
    <p style="margin:0 0 12px">We laten je weten dat het wachtwoord van je Calorietje-account zojuist is gewijzigd.</p>
    <p style="margin:0 0 12px">Als jij dit zelf hebt gedaan, hoef je niets te doen.</p>
    <p style="margin:0;font-size:13px;color:#666">Was jij dit niet? Reset je wachtwoord meteen via "Wachtwoord vergeten" en neem contact op.</p>
  </div>
</body>
</html>`;
}
