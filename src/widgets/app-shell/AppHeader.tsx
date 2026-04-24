'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { IconButton } from '@/shared/ui';

export type AppHeaderProps = {
  title: ReactNode;
  back?: boolean;
  action?: ReactNode;
  className?: string;
};

export function AppHeader({ title, back, action, className }: AppHeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center gap-2 px-3 h-14 bg-surface/85 backdrop-blur border-b border-ink/5',
        'pt-[env(safe-area-inset-top)]',
        className,
      )}
    >
      {back ? (
        <IconButton
          icon={ArrowLeft}
          aria-label="Terug"
          size="sm"
          onClick={() => router.back()}
        />
      ) : (
        <span className="inline-block w-9" aria-hidden />
      )}
      <h1 className="flex-1 text-base font-semibold truncate text-center">{title}</h1>
      <div className="flex items-center">{action ?? <span className="inline-block w-9" aria-hidden />}</div>
    </header>
  );
}
