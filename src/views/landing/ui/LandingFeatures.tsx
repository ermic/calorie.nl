import { Camera, Database, ShieldCheck, Smartphone } from 'lucide-react';

const FEATURES = [
  {
    icon: Camera,
    title: 'Foto-analyse met AI',
    body:
      'Maak een foto van je bord en Gemini schat de items, hoeveelheden en macro-verdeling. Een vork of weegschaal in beeld? Nóg accurater.',
  },
  {
    icon: Database,
    title: 'Nederlandse NEVO-database',
    body:
      'Voor handmatige invoer zoek je rechtstreeks in de officiële NEVO-voedingstabel — duizenden Nederlandse producten, gemerkt en met betrouwbare waarden.',
  },
  {
    icon: ShieldCheck,
    title: 'Je API-key blijft van jou',
    body:
      'De Gemini-key staat lokaal in je browser, nooit op onze server. Wij zien je key niet, en kunnen ’m dus ook niet kwijtraken bij een datalek.',
  },
  {
    icon: Smartphone,
    title: 'Installeer als app',
    body:
      'Calorietje is een Progressive Web App: voeg toe aan je home-screen op iOS of Android en gebruik ’m zoals een native app — inclusief offline-fallback.',
  },
];

export function LandingFeatures() {
  return (
    <section className="px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-semibold text-ink sm:text-3xl">
          Snel én accuraat tracken
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink-muted">
          Vier dingen die Calorietje anders doen dan de bekende calorie-apps.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-ink/10 bg-white/60 p-6 shadow-sm backdrop-blur-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
