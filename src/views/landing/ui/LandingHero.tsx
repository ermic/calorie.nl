import Link from 'next/link';

export function LandingHero() {
  return (
    <section className="px-6 pt-12 pb-10 text-center sm:pt-20 sm:pb-14">
      <p className="text-sm font-medium uppercase tracking-wider text-primary-600">
        calorietje.nl
      </p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
        Calorieën tellen{' '}
        <span className="text-primary-600">via een foto</span>
        {' '}van je maaltijd
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
        Track wat je eet zonder eindeloos zoeken in databases. Foto maken, AI doet de rest,
        of vul handmatig in via de Nederlandse NEVO-database.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/register"
          className="inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-primary-700"
        >
          Gratis account aanmaken
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-full border border-ink/15 px-6 py-3 text-base font-medium text-ink transition hover:bg-ink/5"
        >
          Inloggen
        </Link>
      </div>
      <p className="mt-4 text-xs text-ink-muted">
        Werkt met je eigen, gratis Gemini API-key, geen abonnement vereist.
      </p>
    </section>
  );
}
