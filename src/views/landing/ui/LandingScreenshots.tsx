import Image from 'next/image';

const SCREENSHOTS = [
  {
    src: '/landing/home.PNG',
    alt: 'Calorietje dashboard met dagelijkse calorie-ring, recente maaltijden en weekgrafiek',
    caption: 'Dashboard',
    body: 'Je dagdoel, macro-verdeling en de afgelopen 7 dagen in één oogopslag.',
  },
  {
    src: '/landing/maaltijden_overzicht.PNG',
    alt: 'Calorietje maaltijden-overzicht met dagelijkse maaltijd-cards',
    caption: 'Maaltijden',
    body: 'Alle maaltijden chronologisch, gegroepeerd per dag met totalen.',
  },
  {
    src: '/landing/maaltijd_detail.PNG',
    alt: 'Detailweergave van een maaltijd met macro-cirkel en ingrediëntenlijst',
    caption: 'Maaltijd-detail',
    body: 'AI-analyse breekt je maaltijd op in losse items en geeft een zekerheidsscore.',
  },
  {
    src: '/landing/profiel.PNG',
    alt: 'Profielpagina met calorie-doel en lichaamsmaten',
    caption: 'Profiel',
    body: 'Stel je doel in of laat Calorietje het schatten op basis van je TDEE.',
  },
];

// SVG fractalNoise ge-encodeerd als data-URI; ligt als overlay over de
// gradient zodat de roze sectie een korrelige 'verzonken' textuur krijgt
// in plaats van een vlakke kleur.
const NOISE_SVG =
  "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

export function LandingScreenshots() {
  return (
    <section
      className="relative px-6 py-12 sm:py-16"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        backdropFilter: 'blur(12px)',
        backgroundImage:
          'radial-gradient(at center top, rgba(255, 255, 255, 0) 0%, rgb(255 227 204 / 0.5) 45%, rgba(255, 255, 255, 0.39) 100%)',
        boxShadow:
          'inset 0 12px 28px -8px rgba(120, 30, 30, 0.18), inset 0 -12px 28px -8px rgba(120, 30, 30, 0.12)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
        style={{ backgroundImage: NOISE_SVG }}
      />
      <div className="relative mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-semibold text-ink sm:text-3xl">
          Hoe het eruitziet
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink-muted">
          Ontworpen voor je telefoon, maar werkt overal waar je een browser hebt.
        </p>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {SCREENSHOTS.map(({ src, alt, caption, body }) => (
            <figure key={caption} className="flex flex-col items-center text-center">
              <div className="relative w-full max-w-[260px] overflow-hidden rounded-[28px] border border-ink/10 bg-white shadow-md">
                <Image
                  src={src}
                  alt={alt}
                  width={1170}
                  height={2532}
                  sizes="(min-width: 1024px) 240px, (min-width: 640px) 50vw, 80vw"
                  className="h-auto w-full"
                  priority={caption === 'Dashboard'}
                />
              </div>
              <figcaption className="mt-4">
                <div className="text-sm font-semibold text-ink">{caption}</div>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
