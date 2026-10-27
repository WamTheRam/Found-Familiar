import type { DateStr } from '../types';

/*
 * All calendar dates are plain "YYYY-MM-DD" strings. Arithmetic is done in UTC
 * on a throwaway Date, so timezones and daylight saving can never shift a day.
 */

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function toDateStr(y: number, m: number, d: number): DateStr {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

export function parseDateStr(s: DateStr): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) throw new Error(`Invalid date string: ${s}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function fromUtc(ms: number): DateStr {
  const dt = new Date(ms);
  return toDateStr(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function toUtc(s: DateStr): number {
  const { y, m, d } = parseDateStr(s);
  return Date.UTC(y, m - 1, d);
}

/** Today's date in the device's local timezone. */
export function todayStr(now: Date = new Date()): DateStr {
  return toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(s: DateStr, n: number): DateStr {
  return fromUtc(toUtc(s) + n * 86_400_000);
}

export function daysBetween(a: DateStr, b: DateStr): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** 0 = Monday ... 6 = Sunday (the mockups start weeks on Monday). */
export function weekdayIndex(s: DateStr): number {
  const dow = new Date(toUtc(s)).getUTCDay(); // 0 = Sunday
  return (dow + 6) % 7;
}

export function startOfWeek(s: DateStr): DateStr {
  return addDays(s, -weekdayIndex(s));
}

export function weekDays(s: DateStr): DateStr[] {
  const start = startOfWeek(s);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Move by whole months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(s: DateStr, n: number): DateStr {
  const { y, m, d } = parseDateStr(s);
  const index = y * 12 + (m - 1) + n;
  const ny = Math.floor(index / 12);
  const nm = (index % 12 + 12) % 12 + 1;
  return toDateStr(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

export function isSameMonth(a: DateStr, b: DateStr): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Full weeks (Mon-Sun) covering the month, including spill-over days. */
export function monthGrid(s: DateStr): DateStr[][] {
  const { y, m } = parseDateStr(s);
  const first = toDateStr(y, m, 1);
  const last = toDateStr(y, m, daysInMonth(y, m));
  const weeks: DateStr[][] = [];
  for (let cursor = startOfWeek(first); cursor <= last; cursor = addDays(cursor, 7)) {
    weeks.push(weekDays(cursor));
  }
  return weeks;
}

const longFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
});
const monthFmt = new Intl.DateTimeFormat('en-GB', {
  month: 'long', year: 'numeric', timeZone: 'UTC',
});

export const formatLong = (s: DateStr) => longFmt.format(new Date(toUtc(s)));
export const formatMonthYear = (s: DateStr) => monthFmt.format(new Date(toUtc(s)));

const shortFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
});
export const formatShort = (s: DateStr) => shortFmt.format(new Date(toUtc(s)));
