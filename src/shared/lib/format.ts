import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const toDate = (d: Date | string) => (typeof d === 'string' ? new Date(d) : d);

export const formatDateShort = (d: Date | string) => format(toDate(d), 'eee d MMM', { locale: nl });

export const formatDateLong = (d: Date | string) => format(toDate(d), 'eeee d MMMM yyyy', { locale: nl });

export const formatTime = (d: Date | string) => format(toDate(d), 'HH:mm');

export const formatKcal = (n: number) => `${Math.round(n)} kcal`;

export const formatMacro = (g: number) => `${Math.round(g)} g`;
