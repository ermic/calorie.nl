import { WifiOff } from 'lucide-react';
import { EmptyState } from '@/shared/ui';

export const metadata = {
  title: 'Offline — Calorie Tracker',
};

export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <EmptyState
        icon={WifiOff}
        title="Je bent offline"
        description="Controleer je verbinding en probeer opnieuw. Eerder bezochte pagina's kunnen nog wel beschikbaar zijn."
      />
    </main>
  );
}
