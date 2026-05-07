import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, BackLink } from '@/shared/ui';

export const metadata: Metadata = {
  title: 'Over dit project',
  description:
    'Over calorietje.nl: wie het bouwt, waarom, en welke voedingsdata, AI en methodologie eronder zitten.',
  alternates: { canonical: '/about' },
};

const NOISE_SVG =
  "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

export default function AboutPage() {
  return (
    <main className="min-h-dvh py-8 space-y-8">
      <div className="mx-auto w-full max-w-2xl px-4 space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Over dit project</h1>
        <p className="text-sm text-ink-muted">
          Wie er achter calorietje.nl zit, waarom het bestaat en hoe de cijfers tot stand
          komen.
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4">
        <Card padded className="space-y-5 text-sm leading-relaxed text-ink">
          <section className="space-y-1">
            <h2 className="font-semibold">Wie</h2>
            <p className="text-ink-muted">
              Calorietje.nl wordt gebouwd en onderhouden door{' '}
              <strong className="font-semibold text-ink">Erik de Boer</strong>, software
              engineer bij{' '}
              <a
                href="https://jump.nl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                jump.nl
              </a>
              . Het is een persoonlijk, niet-commercieel project. Bereikbaar via{' '}
              <a
                href="mailto:erik@jump.nl"
                className="text-primary-600 hover:underline"
              >
                erik@jump.nl
              </a>
              .
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Waarom</h2>
            <p className="text-ink-muted">
              Calorieën tellen via apps voelt vaak als zoeken naar een speld in een
              hooiberg. Calorietje combineert een foto van je maaltijd met een
              gestructureerde voedingsdatabase, zodat je in twee klikken weet wat je
              binnen hebt gekregen — zonder abonnement of advertenties. De app is
              ontstaan tijdens leertijd bij jump.nl en per ongeluk uitgegroeid tot een werkend
              product.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold">Hoe de cijfers tot stand komen</h2>
            <p className="text-ink-muted">
              De voedingswaarden in de app zijn gebaseerd op de officiële Nederlandse{' '}
              <a
                href="https://www.rivm.nl/nederlands-voedingsstoffenbestand"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                NEVO-database
              </a>{' '}
              (beheerd door{' '}
              <a
                href="https://www.rivm.nl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                RIVM
              </a>
              {' '}/{' '}
              <a
                href="https://www.voedingscentrum.nl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Voedingscentrum
              </a>
              ). Voor fotoanalyse gebruikt calorietje{' '}
              <a
                href="https://deepmind.google/technologies/gemini/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Google Gemini
              </a>
              , gecombineerd met vector-retrieval over NEVO via{' '}
              <a
                href="https://github.com/pgvector/pgvector"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                pgvector
              </a>
              . Concrete pipeline:
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-ink-muted">
              <li>
                Je maakt een foto. Gemini herkent ingrediënten en geschatte hoeveelheden.
              </li>
              <li>
                De herkende ingrediënten worden gematcht tegen NEVO via semantische
                similarity (pgvector).
              </li>
              <li>
                Per match worden de macro&apos;s (kcal, eiwit, vet, koolhydraten) per gram
                opgehaald uit NEVO en geschaald naar de geschatte hoeveelheid.
              </li>
              <li>Je kunt elke match handmatig corrigeren of overrulen.</li>
            </ol>
            <p className="text-ink-muted">
              Twee onnauwkeurigheden om je bewust van te zijn: Gemini schat porties op
              basis van een 2D-foto (kan er flink naast zitten), en NEVO-waarden zijn
              gemiddelden, een specifiek product kan afwijken. Voor medische of
              klinische doeleinden zijn deze cijfers daarom niet geschikt; zie ook de{' '}
              <Link href="/terms" className="text-primary-600 hover:underline">
                gebruiksvoorwaarden
              </Link>
              .
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Bron- en data-attributie</h2>
            <ul className="list-disc space-y-1 pl-5 text-ink-muted">
              <li>
                <strong className="font-semibold text-ink">
                  <a
                    href="https://www.rivm.nl/nederlands-voedingsstoffenbestand"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    NEVO
                  </a>
                </strong>{' '}
                Nederlandse voedingsstoffenbestand, beheerd door het RIVM/
                Voedingscentrum. Gebruikt voor alle voedingswaarden in de app.
              </li>
              <li>
                <strong className="font-semibold text-ink">
                  <a
                    href="https://ai.google.dev/gemini-api/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Google Gemini
                  </a>
                </strong>{' '}
                LLM voor foto-herkenning en vrije-tekst-invoer. Draait via je eigen
                API-key.
              </li>
              <li>
                <strong className="font-semibold text-ink">
                  <a
                    href="https://github.com/pgvector/pgvector"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    pgvector
                  </a>
                </strong>{' '}
                 PostgreSQL-extensie voor semantisch zoeken op NEVO-items.
              </li>
            </ul>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold">Privacy en data</h2>
            <p className="text-ink-muted">
              Je API-key blijft op je apparaat, je voedingsdata staat in een eigen
              database in de EU, en je kunt je account zelf verwijderen via een
              bevestigingsstap met &quot;VERWIJDER&quot; en je huidige wachtwoord.
              Volledige uitleg in het{' '}
              <Link href="/privacy" className="text-primary-600 hover:underline">
                privacybeleid
              </Link>
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
              De technische leerdoelen achter dit project:
          </h2>
          <ul className="mx-auto mt-3 space-y-2 text-left text-sm leading-relaxed text-ink-muted sm:text-base">
            <li>
              <strong className="font-semibold text-ink">Feature-Sliced Design</strong>{' '}
              binnen Next.js App Router, met strikte laag-scheiding tussen <em>app</em>,
              <em> views</em>, <em>widgets</em>, <em>features</em>, <em>entities</em> en{' '}
              <em>shared</em>.
            </li>
            <li>
              <strong className="font-semibold text-ink">PostgreSQL met pgvector</strong>{' '}
              voor semantisch zoeken op NEVO, zodat AI-uitvoer wordt verankerd in
              betrouwbare brondata.
            </li>
            <li>
              <strong className="font-semibold text-ink">
                Retrieval-Augmented Generation
              </strong>{' '}
              met Google Gemini: foto-analyse + vector-retrieval + NEVO-grounding.
            </li>
            <li>
              <strong className="font-semibold text-ink">Privacy-by-design</strong> door
              API-keys uitsluitend client-side te bewaren. Gebruikers houden de regie en
              de kosten van hun eigen LLM-gebruik in handen.
            </li>
            <li>
              <strong className="font-semibold text-ink">
                Een complete authenticatie-laag
              </strong>{' '}
              opzetten: registratie met emailverificatie, wachtwoordreset en
              transactionele mails.
            </li>
            <li>
              <strong className="font-semibold text-ink">Single sign-on</strong> via een
              externe provider als alternatief inlog-pad, met veilige accountkoppeling
              op een geverifieerd emailadres.
            </li>
            <li>
              <strong className="font-semibold text-ink">
                Tailwind CSS met design-tokens
              </strong>{' '}
              en herbruikbare <em>shared/ui</em> componenten, UI-consistentie zonder
              externe componenten-bibliotheek.
            </li>
            <li>
              <strong className="font-semibold text-ink">Self-hosted DevOps </strong>
              een eigen Linux VPS in de EU, handmatig ingericht (reverse proxy, TLS,
              process-management, database) om de hele stack te begrijpen.
            </li>
            <li>
              <strong className="font-semibold text-ink">
                Gedisciplineerde Git-workflow
              </strong>{' '}
              met feature branches, pull requests, een vaste senior / coderabbit review op
              productiefalen, en idempotente databasemigraties.
            </li>
          </ul>
          <p className="mx-auto mt-6 text-sm leading-relaxed text-ink sm:text-base">
            <span className="font-semibold">Erik de Boer</span>
            <br />
            <a
              href="mailto:erik@jump.nl"
              className="text-primary-600 hover:underline"
            >
              erik@jump.nl
            </a>
          </p>
        </div>
      </section>

      <div className="flex justify-center pt-2">
        <BackLink />
      </div>
    </main>
  );
}
