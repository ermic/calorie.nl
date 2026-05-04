import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

const toDate = (d: Date | string) => (typeof d === 'string' ? new Date(d) : d);

// Met `tz` rendert de helper zone-onafhankelijk in user-tz (verplicht
// voor server-side calls — anders krijg je UTC). Zonder `tz` valt 'ie
// terug op de runtime-tz (browser → user, server → UTC). Pure-client
// callers mogen 'tz' leeg laten; server-callers moeten user.timezone
// meegeven.
export const formatDateShort = (d: Date | string, tz?: string) =>
  tz
    ? formatInTimeZone(toDate(d), tz, 'eee d MMM', { locale: nl })
    : format(toDate(d), 'eee d MMM', { locale: nl });

export const formatDateLong = (d: Date | string, tz?: string) =>
  tz
    ? formatInTimeZone(toDate(d), tz, 'eeee d MMMM yyyy', { locale: nl })
    : format(toDate(d), 'eeee d MMMM yyyy', { locale: nl });

export const formatTime = (d: Date | string, tz?: string) =>
  tz ? formatInTimeZone(toDate(d), tz, 'HH:mm') : format(toDate(d), 'HH:mm');

export const formatKcal = (n: number) => `${Math.round(n)} kcal`;

export const formatMacro = (g: number) => `${Math.round(g)} g`;
