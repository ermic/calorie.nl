'use client';

import { Home, ListChecks, Plus, UserRound, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { openAddMealSheet, useAppDispatch } from '@/shared/store';
import { cn } from '@/shared/lib/cn';

type Tab = { href: string; label: string; icon: LucideIcon };

const TABS: Tab[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/meals', label: 'Maaltijden', icon: ListChecks },
  { href: '/profile', label: 'Profiel', icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname() ?? '';
  const dispatch = useAppDispatch();

  return (
    <nav
      role="navigation"
      aria-label="Hoofdnavigatie"
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur border-t border-ink/5',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="grid grid-cols-4 items-center h-16">
        {TABS.slice(0, 2).map((tab) => (
          <NavItem key={tab.href} tab={tab} active={isActive(pathname, tab.href)} />
        ))}

        <li className="flex items-center justify-center">
          <button
            type="button"
            aria-label="Maaltijd toevoegen"
            onClick={() => dispatch(openAddMealSheet())}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full',
              'bg-primary-600 text-white shadow-[var(--shadow-card)] hover:bg-primary-700',
              'focus-visible:outline-none',
            )}
          >
            <Plus size={24} aria-hidden />
          </button>
        </li>

        <NavItem tab={TABS[2]!} active={isActive(pathname, TABS[2]!.href)} />
      </ul>
    </nav>
  );
}

function NavItem({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <li>
      <Link
        href={tab.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex flex-col items-center justify-center gap-1 h-full py-2',
          active ? 'text-primary-600' : 'text-ink-muted hover:text-ink',
        )}
      >
        <Icon size={22} aria-hidden />
        <span className="text-[11px] font-medium">{tab.label}</span>
      </Link>
    </li>
  );
}
