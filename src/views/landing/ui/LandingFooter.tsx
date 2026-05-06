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
        <p>
          <Link href="/disclaimer" className="hover:underline">
            Disclaimer
          </Link>
        </p>
      </div>
    </footer>
  );
}
