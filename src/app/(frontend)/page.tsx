import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex-1 px-6 py-12 max-w-2xl mx-auto w-full">
      <h1 className="text-3xl font-semibold tracking-tight mb-4">Calorie Tracker</h1>
      <p className="text-zinc-600 mb-8">
        Houd je dagelijkse calorieën bij — handmatig of met AI foto-herkenning.
      </p>
      <div className="flex gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center rounded-full bg-emerald-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-emerald-700"
        >
          Open admin
        </Link>
      </div>
      <p className="text-xs text-zinc-500 mt-12">
        Dev setup — frontend wordt later via FSD opgebouwd (widgets, features).
      </p>
    </main>
  );
}
