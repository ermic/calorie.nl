import type { ReactNode } from 'react';
import { EmailVerificationBanner } from '@/widgets/email-verification-banner';
import { StripesBackground } from '@/shared/ui';
import { AddMealSheet } from './AddMealSheet';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh overflow-hidden">
      <StripesBackground animate={false} />
      <SideNav />
      <div className="relative flex flex-1 flex-col min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <EmailVerificationBanner />
        {children}
      </div>
      <BottomNav />
      <AddMealSheet />
    </div>
  );
}
