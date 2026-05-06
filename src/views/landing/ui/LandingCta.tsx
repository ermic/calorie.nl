import Link from 'next/link';

export function LandingCta() {
  return (
    <section className="px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-3xl rounded-3xl bg-primary-600 px-8 py-12 text-center shadow-lg sm:px-12">
        <h2 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">
          Begin met tracken — gratis
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-primary-50/90">
          Geen abonnement, geen credit-card. Maak een account, voeg je eigen Gemini-key toe en je kunt los.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-base font-medium text-primary-700 shadow-sm transition hover:bg-primary-50"
          >
            Account aanmaken
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-base font-medium text-white transition hover:bg-white/10"
          >
            Al een account? Inloggen
          </Link>
        </div>
      </div>
    </section>
  );
}
