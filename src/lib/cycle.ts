import type { DateStr, WorkoutPlan } from '../types';
import { addDays, daysBetween, startOfWeek, weekdayIndex } from './dates';

export type CycleConfig = Pick<WorkoutPlan, 'cycleWeeks' | 'anchorDate'>;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** 1-based week of the cycle that contains `date` (always 1 for weekly cycles). */
export function weekNumberFor(cfg: CycleConfig, date: DateStr): number {
  const weeks = daysBetween(startOfWeek(cfg.anchorDate), startOfWeek(date)) / 7;
  return mod(weeks, cfg.cycleWeeks) + 1;
}

/** Position of a date within the cycle: 0..6 (weekly) or 0..13 (fortnightly), Monday-first. */
export function slotIndexFor(cfg: CycleConfig, date: DateStr): number {
  return (weekNumberFor(cfg, date) - 1) * 7 + weekdayIndex(date);
}

/** Date of the occurrence `n` cycles earlier (or later, if negative) than `date`. */
export const occurrenceDateBefore = (cycleWeeks: number, date: DateStr, n = 1): DateStr =>
  addDays(date, -cycleWeeks * 7 * n);

/** Anchor Monday that makes the week containing `date` be week number `weekNumber`. */
export const anchorForWeekNumber = (date: DateStr, weekNumber: number): DateStr =>
  addDays(startOfWeek(date), -(weekNumber - 1) * 7);
