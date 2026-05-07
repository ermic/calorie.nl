import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, BackLink } from '@/shared/ui';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'Privacybeleid van calorietje.nl: welke gegevens we opslaan, waar, hoe lang en hoe je ze verwijdert.',
  alternates: { canonical: '/privacy' },
};

const LAST_UPDATED = '7 mei 2026';

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh py-8 space-y-8">
      <div className="mx-auto w-full max-w-2xl px-4 space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Privacy</h1>
        <p className="text-sm text-ink-muted">
          Welke gegevens calorietje.nl verzamelt, waarom en hoe je ze kwijt raakt.
        </p>
        <p className="text-xs text-ink-muted">Laatst bijgewerkt: {LAST_UPDATED}</p>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4">
        <Card padded className="space-y-5 text-sm leading-relaxed text-ink">
          <section className="space-y-1">
            <h2 className="font-semibold">Verwerkingsverantwoordelijke</h2>
            <p className="text-ink-muted">
              Calorietje.nl is een persoonlijk, niet-commercieel project. Verantwoordelijke:
              Erik de Boer, bereikbaar via{' '}
              <a
                href="mailto:calorietje@erikie.nl"
                className="text-primary-600 hover:underline"
              >
                calorietje@erikie.nl
              </a>
              .
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Welke gegevens we opslaan</h2>
            <ul className="list-disc space-y-1 pl-5 text-ink-muted">
              <li>
                <strong className="font-semibold text-ink">Account</strong>: e-mailadres,
                wachtwoord-hash (bcrypt), eventueel je Google-account-ID als je via Google
                inlogt.
              </li>
              <li>
                <strong className="font-semibold text-ink">Profiel</strong>: optionele
                voorkeuren zoals dagelijkse doelen of meeteenheden die je zelf invult.
              </li>
              <li>
                <strong className="font-semibold text-ink">Maaltijden</strong>: foto&apos;s,
                tekstuele beschrijvingen en de berekende voedingswaarden die je opslaat in
                je dagboek.
              </li>
              <li>
                <strong className="font-semibold text-ink">Sessies</strong>: een
                HTTP-only cookie om je ingelogd te houden.
              </li>
            </ul>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Wat we niet opslaan</h2>
            <p className="text-ink-muted">
              Je Gemini API-key wordt nooit naar onze server gestuurd. Hij blijft uitsluitend
              in je browser (localStorage) en gaat rechtstreeks van je apparaat naar Google.
              We hebben geen tracking-pixels, geen advertentie-cookies en geen analytics-
              service van derden draaien.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Waar de gegevens staan</h2>
            <p className="text-ink-muted">
              Alle data staat op een eigen Hetzner-VPS in Duitsland (EU), in een
              PostgreSQL-database die niet publiek bereikbaar is. Foto&apos;s die je
              uploadt voor analyse worden tijdens de analyse via Google Gemini verwerkt.
              Wat Google daarmee doet valt onder hun voorwaarden — gebruik je eigen
              API-key, dan is dat jouw eigen account bij Google.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Hoe lang we het bewaren</h2>
            <p className="text-ink-muted">
              Account- en maaltijddata bewaren we zolang je account bestaat. Accounts die
              langer dan een jaar inactief zijn kunnen we verwijderen na een
              waarschuwingsmail. Verwijder je je account zelf, dan worden alle gegevens
              direct en onomkeerbaar uit de database gewist.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Je rechten (AVG)</h2>
            <p className="text-ink-muted">
              Je hebt recht op inzage, correctie, verwijdering, beperking en
              dataportabiliteit. Inzage en correctie regel je via je profielpagina.
              Verwijdering doe je zelf in je profiel: je opent het bevestigingsblok,
              typt &quot;VERWIJDER&quot; én je huidige wachtwoord, en bevestigt met
              &quot;Definitief verwijderen&quot;. De verwijdering is daarna direct en
              onomkeerbaar. Voor inzage in een exporteerbaar formaat kun je een mailtje
              sturen naar{' '}
              <a
                href="mailto:calorietje@erikie.nl"
                className="text-primary-600 hover:underline"
              >
                calorietje@erikie.nl
              </a>
              . Klachten kun je melden bij de Autoriteit Persoonsgegevens.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Cookies</h2>
            <p className="text-ink-muted">
              Calorietje gebruikt alleen functionele cookies: een sessie-cookie om je
              ingelogd te houden, een &quot;returning user&quot;-cookie om de landing
              over te slaan, en (tijdens OAuth) een tijdelijk state-cookie tegen CSRF.
              Geen tracking, geen advertentie-cookies.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Verwerkers van derden</h2>
            <ul className="list-disc space-y-1 pl-5 text-ink-muted">
              <li>
                <strong className="font-semibold text-ink">Google (Gemini)</strong> —
                ontvangt je foto + tekst rechtstreeks vanaf je apparaat met jouw eigen
                API-key.
              </li>
              <li>
                <strong className="font-semibold text-ink">Google (OAuth)</strong> —
                alleen als je via Google inlogt; ontvangt dan je e-mailadres en account-ID.
              </li>
              <li>
                <strong className="font-semibold text-ink">SMTP-provider</strong> — voor
                transactionele mails (verificatie, wachtwoord-reset).
              </li>
              <li>
                <strong className="font-semibold text-ink">Hetzner</strong> — hosting
                provider voor de VPS waarop de database draait.
              </li>
            </ul>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Verder lezen</h2>
            <p className="text-ink-muted">
              Zie ook de{' '}
              <Link href="/terms" className="text-primary-600 hover:underline">
                gebruiksvoorwaarden
              </Link>{' '}
              en{' '}
              <Link href="/about" className="text-primary-600 hover:underline">
                over dit project
              </Link>
              .
            </p>
          </section>
        </Card>
      </div>

      <div className="flex justify-center pt-2">
        <BackLink />
      </div>
    </main>
  );
}
