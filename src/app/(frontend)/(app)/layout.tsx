import type { ReactNode } from 'react';
import { AppShell } from '@/widgets/app-shell';
import { requireUser } from '@/shared/lib/auth-guard';

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <AppShell>{children}</AppShell>;
}
