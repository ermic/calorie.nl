import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, BackLink } from '@/shared/ui';

export const metadata: Metadata = {
  title: 'Gebruiksvoorwaarden',
  description:
    'Voorwaarden voor het gebruik van calorietje.nl: medische disclaimer, beta-status en accountregels.',
  alternates: { canonical: '/terms' },
};

const LAST_UPDATED = '7 mei 2026';

export default function TermsPage() {
  return (
    <main className="min-h-dvh py-8 space-y-8">
      <div className="mx-auto w-full max-w-2xl px-4 space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Gebruiksvoorwaarden</h1>
        <p className="text-sm text-ink-muted">
          De spelregels voor het gebruik van calorietje.nl.
        </p>
        <p className="text-xs text-ink-muted">Laatst bijgewerkt: {LAST_UPDATED}</p>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4">
        <Card padded className="space-y-5 text-sm leading-relaxed text-ink">
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
            <h2 className="font-semibold">Beta-status</h2>
            <p className="text-ink-muted">
              Calorietje.nl is een beta-project. Functies kunnen veranderen of
              verdwijnen, en bugs zijn niet uitgesloten. Er is geen garantie op
              beschikbaarheid of dataretentie buiten wat in het{' '}
              <Link href="/privacy" className="text-primary-600 hover:underline">
                privacybeleid
              </Link>{' '}
              staat.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Account en verantwoordelijkheid</h2>
            <ul className="list-disc space-y-1 pl-5 text-ink-muted">
              <li>Je houdt je inloggegevens geheim en gebruikt het account zelf.</li>
              <li>Je vult correcte gegevens in (geldig e-mailadres) zodat herstel mogelijk is.</li>
              <li>
                Je gebruikt de dienst niet om grote hoeveelheden geautomatiseerd verkeer te
                genereren of de infrastructuur opzettelijk te overbelasten.
              </li>
              <li>
                Je upload geen foto&apos;s of inhoud waarvoor je geen rechten hebt of die de
                wet schenden.
              </li>
            </ul>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Je eigen API-key</h2>
            <p className="text-ink-muted">
              Foto-analyse vereist een eigen Gemini API-key, die je aan Google koppelt en
              waarvan jij de kosten draagt. De key blijft lokaal in je browser — zie het{' '}
              <Link href="/privacy" className="text-primary-600 hover:underline">
                privacybeleid
              </Link>
              . Misbruik of overschrijding van Google-quota is jouw verantwoordelijkheid.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Beëindiging</h2>
            <p className="text-ink-muted">
              Je kunt je account op elk moment via je profielpagina verwijderen. Wij
              behouden ons het recht voor om accounts te verwijderen die langer dan een
              jaar inactief zijn (na waarschuwingsmail) of die deze voorwaarden duidelijk
              schenden.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Aansprakelijkheid</h2>
            <p className="text-ink-muted">
              Calorietje.nl wordt aangeboden &quot;as is&quot;, zonder garanties op
              juistheid, beschikbaarheid of geschiktheid voor een bepaald doel. Voor
              zover wettelijk toegestaan is de aansprakelijkheid voor schade als gevolg
              van gebruik van deze dienst beperkt tot directe schade en uitgesloten voor
              gevolgschade.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Wijzigingen</h2>
            <p className="text-ink-muted">
              Deze voorwaarden kunnen veranderen. De &quot;laatst bijgewerkt&quot;-datum
              bovenaan geeft aan wanneer er voor het laatst iets is aangepast.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Contact</h2>
            <p className="text-ink-muted">
              Vragen? Mail{' '}
              <a
                href="mailto:calorietje@erikie.nl"
                className="text-primary-600 hover:underline"
              >
                calorietje@erikie.nl
              </a>
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
