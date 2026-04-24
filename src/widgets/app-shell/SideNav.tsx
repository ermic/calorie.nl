'use client';

import { Home, ListChecks, Plus, UserRound, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { openAddMealSheet, useAppDispatch } from '@/shared/store';
import { cn } from '@/shared/lib/cn';

type Item = { href: string; label: string; icon: LucideIcon };

const ITEMS: Item[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/meals', label: 'Maaltijden', icon: ListChecks },
  { href: '/profile', label: 'Profiel', icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const pathname = usePathname() ?? '';
  const dispatch = useAppDispatch();

  return (
    <aside
      aria-label="Hoofdnavigatie"
      className={cn(
        'hidden md:flex flex-col w-20 shrink-0 items-center gap-3 py-6 border-r border-ink/5 bg-surface',
        'sticky top-0 self-start h-dvh',
      )}
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl w-14 py-2',
              active ? 'text-primary-600 bg-primary-50' : 'text-ink-muted hover:text-ink hover:bg-surface-muted',
            )}
          >
            <Icon size={22} aria-hidden />
            <span className="text-[11px] font-medium">{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        aria-label="Maaltijd toevoegen"
        onClick={() => dispatch(openAddMealSheet())}
        className="mt-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-[var(--shadow-card)] hover:bg-primary-700"
      >
        <Plus size={22} aria-hidden />
      </button>
    </aside>
  );
}
