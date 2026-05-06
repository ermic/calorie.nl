const STEPS = [
  {
    number: '1',
    title: 'Account aanmaken',
    body: 'Maak gratis een account met je e-mailadres of via Google. Geen creditcard, geen abonnement.',
  },
  {
    number: '2',
    title: 'Gemini-key toevoegen',
    body: 'Haal een gratis API-key op bij Google AI Studio en plak ’m in je browser. De key blijft op je apparaat.',
  },
  {
    number: '3',
    title: 'Foto of zoek',
    body: 'Maak een foto van je maaltijd of zoek handmatig in NEVO. Macro’s en calorieën worden automatisch berekend.',
  },
];

export function LandingHowItWorks() {
  return (
    <section className="bg-ink/[0.03] px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-semibold text-ink sm:text-3xl">
          Zo werkt het
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink-muted">
          In drie stappen klaar om je eerste maaltijd te tracken.
        </p>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map(({ number, title, body }) => (
            <li
              key={number}
              className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-base font-semibold text-white">
                {number}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
