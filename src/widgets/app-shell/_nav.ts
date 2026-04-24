import { Home, ListChecks, UserRound, type LucideIcon } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/meals', label: 'Maaltijden', icon: ListChecks },
  { href: '/profile', label: 'Profiel', icon: UserRound },
];

export function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
