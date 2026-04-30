import { escapeHtml } from '@/shared/lib/html-escape';

export type ChangeEmailRevokedProps = {
  name?: string | null;
};

// Wordt naar het oude adres gestuurd ter bevestiging dat de aangevraagde
// wijziging is ingetrokken — niets is veranderd.
export function changeEmailRevokedEmail({ name }: ChangeEmailRevokedProps): string {
  const greeting = name ? `Hoi ${escapeHtml(name)},` : 'Hoi,';
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><title>E-mailwijziging ingetrokken</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h1 style="font-size:18px;margin:0 0 16px">E-mailwijziging ingetrokken</h1>
    <p style="margin:0 0 12px">${greeting}</p>
    <p style="margin:0 0 12px">De aangevraagde wijziging is ingetrokken — er is niets veranderd aan je account.</p>
    <p style="margin:0;font-size:13px;color:#666">Heb je je wachtwoord niet zelf gewijzigd of het verzoek niet zelf gestart? Reset je wachtwoord via "Wachtwoord vergeten" om zeker te zijn dat niemand anders toegang heeft.</p>
  </div>
</body>
</html>`;
}
