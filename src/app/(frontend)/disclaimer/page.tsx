import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, BackLink } from '@/shared/ui';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description:
    'Disclaimer van calorietje.nl: schattingen geen medisch advies, beta-status, en links naar privacy, voorwaarden en project-info.',
  alternates: { canonical: '/disclaimer' },
};

export default function DisclaimerPage() {
  return (
    <main className="min-h-dvh py-8 space-y-8">
      <div className="mx-auto w-full max-w-2xl px-4 space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Disclaimer</h1>
        <p className="text-sm text-ink-muted">
          Korte versie van de belangrijkste voorbehouden bij calorietje.nl.
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4">
        <Card padded className="space-y-4 text-sm leading-relaxed text-ink">
          <section className="space-y-1">
            <h2 className="font-semibold">Schattingen, geen medisch advies</h2>
            <p className="text-ink-muted">
              Calorietje.nl geeft schattingen op basis van AI-foto-analyse en de
              Nederlandse NEVO-database. Die schattingen kunnen er naast zitten — gebruik
              de cijfers niet voor medische beslissingen, diëten onder begeleiding of
              klinische doeleinden. Bij twijfel: raadpleeg een diëtist of arts.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Beta</h2>
            <p className="text-ink-muted">
              Calorietje.nl is een beta-project. Functies kunnen veranderen, en bugs zijn
              niet uitgesloten. Vragen of opmerkingen? Mail naar{' '}
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
            <h2 className="font-semibold">Verder lezen</h2>
            <ul className="list-disc space-y-1 pl-5 text-ink-muted">
              <li>
                <Link href="/privacy" className="text-primary-600 hover:underline">
                  Privacybeleid
                </Link>{' '}
                — welke gegevens we verwerken, waar en hoe lang.
              </li>
              <li>
                <Link href="/terms" className="text-primary-600 hover:underline">
                  Gebruiksvoorwaarden
                </Link>{' '}
                — accountregels, beta-status, aansprakelijkheid.
              </li>
              <li>
                <Link href="/about" className="text-primary-600 hover:underline">
                  Over dit project
                </Link>{' '}
                — wie het bouwt en hoe de cijfers tot stand komen.
              </li>
            </ul>
          </section>
        </Card>
      </div>

      <div className="flex justify-center pt-2">
        <BackLink />
      </div>
    </main>
  );
}
