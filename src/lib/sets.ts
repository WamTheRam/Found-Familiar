import type { SetLog } from '../types';

/** Weights are kilograms in 0.5 steps. */
export const isValidWeight = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1000 && Number.isInteger(n * 2);
export const isValidReps = (n: number) => Number.isInteger(n) && n >= 0 && n <= 999;

/** An exercise can be marked completed once at least one set has both weight and reps. */
export const canComplete = (sets: SetLog[]) => sets.some((s) => s.weightKg !== null && s.reps !== null);

export function formatSet(s: SetLog): string | null {
  return s.weightKg === null || s.reps === null ? null : `${s.weightKg} kg × ${s.reps}`;
}
