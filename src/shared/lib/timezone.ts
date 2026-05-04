// Centralized timezone helpers — gebruikt door User-collectie, schemas
// en day-bucket logica zodat de fallback en validatie consistent zijn.

import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Europe/Amsterdam';

// Valideert een IANA-timezone via de Intl-API. Gooit niet — geeft
// boolean terug zodat caller (zod refine, payload validate) zelf de
// foutmelding bepaalt.
export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Lijst van alle IANA-zones die de runtime kent. Node 18+/moderne
// browsers ondersteunen Intl.supportedValuesOf; bij oude runtimes
// vallen we terug op een minimale lijst zodat de profielpagina niet
// crasht.
export function getSupportedTimezones(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : null;
  if (supported && supported.length > 0) return supported;
  return [DEFAULT_TIMEZONE, 'UTC', 'Europe/London', 'America/New_York', 'America/Los_Angeles'];
}

// Geeft het UTC-instant dat correspondeert met 00:00 lokale tijd in `tz`
// op de kalenderdag waar `date` (UTC-instant) valt in `tz`. Gebruik dit
// om eatenAt >= start_of_day-queries op Payload te bouwen.
export function startOfDayInTimezone(date: Date, tz: string): Date {
  const dayKey = formatInTimeZone(date, tz, 'yyyy-MM-dd');
  return fromZonedTime(`${dayKey}T00:00:00`, tz);
}

// Idem maar het einde van de dag (23:59:59.999 lokale tijd) als UTC.
export function endOfDayInTimezone(date: Date, tz: string): Date {
  const dayKey = formatInTimeZone(date, tz, 'yyyy-MM-dd');
  return fromZonedTime(`${dayKey}T23:59:59.999`, tz);
}

// Verschuif een dag-grens met `days` kalenderdagen in `tz`. Gebruikt
// kalenderrekenen (jaar/maand/dag) i.p.v. 24h-stappen, zodat DST-
// overgangen geen halve dag verschuiven.
export function addDaysInTimezone(date: Date, days: number, tz: string): Date {
  const [y, m, d] = formatInTimeZone(date, tz, 'yyyy-MM-dd').split('-').map(Number);
  // UTC-Date + setUTCDate is veilig voor cross-month/-year arithmetic.
  const probe = new Date(Date.UTC(y, m - 1, d + days));
  const newKey = `${probe.getUTCFullYear()}-${String(probe.getUTCMonth() + 1).padStart(2, '0')}-${String(probe.getUTCDate()).padStart(2, '0')}`;
  return fromZonedTime(`${newKey}T00:00:00`, tz);
}

// YYYY-MM-DD label voor de dag waarop een UTC-instant valt in `tz`.
export function dayKeyInTimezone(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, 'yyyy-MM-dd');
}
