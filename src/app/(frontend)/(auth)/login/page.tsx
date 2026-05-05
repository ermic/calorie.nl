import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/shared/ui';
import { LoginForm } from '@/features/auth';
import { getCurrentUser } from '@/shared/lib/auth-guard';

type LoginSearchParams = {
  verified?: string;
  email_changed?: string;
  email_change_revoked?: string;
  account_deleted?: string;
  error?: string;
};

type Flag = { kind: 'success' | 'error'; text: string };

function getFlag(p: LoginSearchParams): Flag | null {
  if (p.verified === '1') return { kind: 'success', text: 'E-mailadres bevestigd.' };
  if (p.email_changed === '1')
    return { kind: 'success', text: 'E-mailadres gewijzigd. Log in met je nieuwe adres.' };
  if (p.email_change_revoked === '1')
    return { kind: 'success', text: 'De aangevraagde e-mailwijziging is ingetrokken.' };
  if (p.account_deleted === '1')
    return { kind: 'success', text: 'Je account is verwijderd. Bedankt dat je Calorietje hebt gebruikt.' };
  switch (p.error) {
    case 'verify_invalid':
      return { kind: 'error', text: 'Deze verificatielink is ongeldig of al gebruikt.' };
    case 'verify_expired':
      return {
        kind: 'error',
        text: 'Deze verificatielink is verlopen. Log in en vraag een nieuwe aan via de banner.',
      };
    case 'email_change_invalid':
      return { kind: 'error', text: 'Deze e-mailwijzigingslink is ongeldig of al gebruikt.' };
    case 'email_change_taken':
      return { kind: 'error', text: 'Het nieuwe e-mailadres is inmiddels in gebruik.' };
    case 'oauth_state_mismatch':
      return { kind: 'error', text: 'Inlog-sessie verlopen of ongeldig. Probeer opnieuw.' };
    case 'oauth_provider_error':
      return { kind: 'error', text: 'De provider kon je niet inloggen. Probeer opnieuw.' };
    case 'oauth_not_configured':
      return { kind: 'error', text: 'OAuth-login is op deze omgeving niet geconfigureerd.' };
    case 'oauth_link_requires_login':
      return { kind: 'error', text: 'Log eerst in om een Google-account te koppelen.' };
    case 'oauth_already_linked':
      return { kind: 'error', text: 'Deze Google-account is al aan een ander Calorietje-account gekoppeld.' };
    case 'account_exists_login_first':
      return {
        kind: 'error',
        text: 'Je hebt al een account met dit e-mailadres. Log eerst in en koppel daarna Google via je profiel.',
      };
    case 'email_required':
      return { kind: 'error', text: 'De provider gaf geen e-mailadres door. Voeg toestemming toe of gebruik een andere methode.' };
    default:
      return null;
  }
}

function Banner({ flag }: { flag: Flag }) {
  const cls =
    flag.kind === 'success'
      ? 'mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900'
      : 'mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900';
  return (
    <div role={flag.kind === 'success' ? 'status' : 'alert'} className={cls}>
      {flag.text}
    </div>
  );
}

type LoginPageProps = {
  searchParams: Promise<LoginSearchParams>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const flag = getFlag(params);

  // Ingelogde users zonder feedback-flag meteen doorsturen. Mét flag
  // (klik op een verify-/email-change-link in zelfde browser) tonen we
  // de banner zodat ze acknowledgement zien en zelf doorklikken.
  const user = await getCurrentUser();
  if (user && !flag) redirect('/');

  return (
    <div className="w-full max-w-sm space-y-4">
      {!user && (
        <h1 className="text-2xl font-semibold text-ink text-center">calorietje.nl</h1>
      )}
      {!user && (
        <Card padded className="text-sm text-ink-muted leading-relaxed">
          <p>
            Track je calorieën met behulp van AI, via een foto van je maaltijd of handmatig.
            Even een eigen API-key regelen op{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              aistudio.google.com
            </a>{' '}
            (gratis), en je kunt los. De app is beta, dus de AI schat slim maar zit er soms
            naast. Tip: een vork of lepel naast je bord, of zet je maaltijd op de weegschaal
            voor een betere schatting.
          </p>
        </Card>
      )}
      <Card>
        {flag && <Banner flag={flag} />}
        {user ? (
          <p className="text-sm text-ink-muted">
            <Link href="/" className="text-primary-600 hover:underline">
              Doorgaan naar dashboard
            </Link>
          </p>
        ) : (
          <LoginForm />
        )}
      </Card>
      <p className="text-center text-xs text-ink-muted">
        <Link href="/disclaimer" className="hover:underline">
          Disclaimer
        </Link>
      </p>
    </div>
  );
}
