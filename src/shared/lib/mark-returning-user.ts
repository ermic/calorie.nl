// Vraagt het server-endpoint om de cc_has_logged_in cookie te zetten.
// Gebruikt door client-side login-flows (e-mail, passkey, password-reset).
// Server-side flows (Google OAuth callback) zetten de cookie direct
// op hun eigen NextResponse.
//
// Faalt stil — dit is alleen UX-state. Een gefaald cookie-set betekent
// dat de gebruiker volgende keer nog de landing ziet, niet kapot.
export async function markReturningUser(): Promise<void> {
  try {
    await fetch('/api/auth/mark-returning', {
      method: 'POST',
      credentials: 'same-origin',
    });
  } catch {
    // bewust slikken
  }
}
