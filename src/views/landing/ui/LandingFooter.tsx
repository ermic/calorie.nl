import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="px-6 pb-10 pt-6 text-center text-xs text-ink-muted">
      <div className="mx-auto max-w-3xl space-y-2">
        <p>
          Calorietje is in beta. Vragen of opmerkingen?{' '}
          <a href="mailto:calorietje@erikie.nl" className="text-primary-600 hover:underline">
            calorietje@erikie.nl
          </a>
        </p>
        <nav aria-label="Juridisch">
          <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <li>
              <Link href="/about" className="hover:underline">
                Over dit project
              </Link>
            </li>
            <li aria-hidden="true">·</li>
            <li>
              <Link href="/privacy" className="hover:underline">
                Privacy
              </Link>
            </li>
            <li aria-hidden="true">·</li>
            <li>
              <Link href="/terms" className="hover:underline">
                Voorwaarden
              </Link>
            </li>
            <li aria-hidden="true">·</li>
            <li>
              <Link href="/disclaimer" className="hover:underline">
                Disclaimer
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
