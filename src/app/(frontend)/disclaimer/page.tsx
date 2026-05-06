import type { Metadata } from 'next';
import { Card } from '@/shared/ui';
import { BackLink } from './BackLink';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description: 'Hoe calorietje.nl met je gegevens en API-key omgaat.',
  alternates: { canonical: '/disclaimer' },
};

const NOISE_SVG =
  "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

export default function DisclaimerPage() {
  return (
    <main className="min-h-dvh py-8 space-y-8">
      <div className="mx-auto w-full max-w-2xl px-4 space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Disclaimer</h1>
        <p className="text-sm text-ink-muted">
          Hoe calorietje.nl met je gegevens en API-key omgaat.
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4">
        <Card padded className="space-y-4 text-sm leading-relaxed text-ink">
        <section className="space-y-1">
          <h2 className="font-semibold">Schattingen, geen medisch advies</h2>
          <p className="text-ink-muted">
            Calorietje.nl geeft schattingen op basis van AI-foto-analyse en de Nederlandse
            NEVO-database. Die schattingen kunnen er naast zitten — gebruik de cijfers niet
            voor medische beslissingen, diëten onder begeleiding of klinische doeleinden. Bij
            twijfel: raadpleeg een diëtist of arts.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold">Je API-key blijft op je apparaat</h2>
          <p className="text-ink-muted">
            De Gemini API-key die je invult voor foto-analyse wordt nooit op onze server
            opgeslagen. We bewaren &apos;m uitsluitend lokaal in de browser (localStorage) en
            sturen &apos;m rechtstreeks vanaf je apparaat naar Google. Daardoor zien wij je key
            niet en kunnen &apos;m dus ook niet kwijtraken bij een datalek.
          </p>
          <p className="text-ink-muted">
            Gevolg: log je in op een ander apparaat of in een andere browser, dan moet je
            de API-key daar opnieuw invullen. Wis je je browsergegevens, dan ben je &apos;m ook
            kwijt — een nieuwe key haal je gratis op{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              aistudio.google.com
            </a>
            .
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold">Je kunt je gegevens zelf verwijderen</h2>
          <p className="text-ink-muted">
            Via je profielpagina kun je je account verwijderen. Daarbij worden je
            maaltijden, dagboeken en persoonsgegevens permanent uit onze database gewist.
            Een verwijdering is direct en onomkeerbaar.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold">Inactieve accounts</h2>
          <p className="text-ink-muted">
            We behouden ons het recht voor om accounts die langer dan een jaar inactief
            zijn te verwijderen, om dataminimalisatie en infrastructuurkosten in de hand
            te houden. Voordat we dat doen sturen we je een waarschuwing per e-mail, zodat
            je nog kunt inloggen om je account actief te houden of je gegevens te
            exporteren.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold">Beta</h2>
          <p className="text-ink-muted">
            Calorietje.nl is een beta-project. Functies kunnen veranderen, en bugs zijn
            niet uitgesloten. Vragen of opmerkingen? Mail naar{' '}
            <a href="mailto:calorietje@erikie.nl" className="text-primary-600 hover:underline">
              calorietje@erikie.nl
            </a>
            .
          </p>
        </section>
        </Card>
      </div>

      <section
        className="relative overflow-hidden px-6 py-10 sm:py-12"
        style={{
          backgroundColor: 'rgb(232 141 44)',
          backgroundImage:
            'radial-gradient(at center top, rgb(255 255 255) 0%, rgb(255 227 204) 45%, rgb(255 255 255) 100%)',
          boxShadow:
            'inset 0 12px 28px -8px rgba(120, 30, 30, 0.18), inset 0 -12px 28px -8px rgba(120, 30, 30, 0.12)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
          style={{ backgroundImage: NOISE_SVG }}
        />
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold text-ink sm:text-3xl">
            Steun calorietje.nl
          </h2>
          <p className="mx-auto mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
            Calorietje.nl is gratis en draait op een hobby-budget. Wil je het project
            ondersteunen? Een kleine bijdrage helpt om de servers te blijven betalen.
          </p>
          <p className="mx-auto mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
            Doneer je <strong className="font-semibold text-ink">€10 of meer</strong>, dan
            regel ik een API-key voor je, zodat je geen eigen Gemini-key meer hoeft op te
            geven. Stuur na de donatie even een mailtje naar{' '}
            <a
              href="mailto:calorietje@erikie.nl"
              className="text-primary-600 hover:underline"
            >
              calorietje@erikie.nl
            </a>{' '}
            met het account-e-mailadres waarop je de key wilt ontvangen. Je hebt dan
            genoeg credits tot circa 2500 foto-analyses.
          </p>
          <div className="mt-6">
            <a
              href="https://paypal.me/calorietje"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary-600 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              Doneer via PayPal
            </a>
          </div>
        </div>
      </section>

      <div className="flex justify-center pt-2">
        <BackLink />
      </div>
    </main>
  );
}
