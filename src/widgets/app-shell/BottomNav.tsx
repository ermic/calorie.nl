'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { openAddMealSheet, useAppDispatch } from '@/shared/store';
import { cn } from '@/shared/lib/cn';
import { NAV_ITEMS, isActive, type NavItem } from './_nav';

export function BottomNav() {
  const pathname = usePathname() ?? '';
  const dispatch = useAppDispatch();
  const [home, meals, profile] = NAV_ITEMS;

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
        <NavTab item={home!} active={isActive(pathname, home!.href)} />
        <NavTab item={meals!} active={isActive(pathname, meals!.href)} />

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

        <NavTab item={profile!} active={isActive(pathname, profile!.href)} />
      </ul>
    </nav>
  );
}

function NavTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex flex-col items-center justify-center gap-1 h-full py-2',
          active ? 'text-primary-600' : 'text-ink-muted hover:text-ink',
        )}
      >
        <Icon size={22} aria-hidden />
        <span className="text-[11px] font-medium">{item.label}</span>
      </Link>
    </li>
  );
}
