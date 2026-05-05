import Link from 'next/link';
import type { Metadata } from 'next';
import { Card } from '@/shared/ui';

export const metadata: Metadata = {
  title: 'Disclaimer — calorietje.nl',
  description: 'Hoe calorietje.nl met je gegevens en API-key omgaat.',
};

export default function DisclaimerPage() {
  return (
    <main className="min-h-dvh px-4 py-8 mx-auto w-full max-w-2xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Disclaimer</h1>
        <p className="text-sm text-ink-muted">
          Hoe calorietje.nl met je gegevens en API-key omgaat.
        </p>
      </div>

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

      <div className="flex justify-center pt-2">
        <Link href="/login" className="text-sm text-primary-600 hover:underline">
          Terug naar login
        </Link>
      </div>
    </main>
  );
}
