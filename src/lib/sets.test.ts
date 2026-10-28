import { describe, expect, it } from 'vitest';
import { canComplete, formatSet, isValidReps, isValidWeight } from './sets';

describe('set validation', () => {
  it('accepts kilograms in 0.5 steps only', () => {
    expect(isValidWeight(47.5)).toBe(true);
    expect(isValidWeight(0)).toBe(true);
    expect(isValidWeight(47.25)).toBe(false);
    expect(isValidWeight(-1)).toBe(false);
    expect(isValidWeight(NaN)).toBe(false);
  });
  it('accepts whole-number reps only', () => {
    expect(isValidReps(10)).toBe(true);
    expect(isValidReps(10.5)).toBe(false);
    expect(isValidReps(-1)).toBe(false);
  });
  it('needs one full set to complete', () => {
    expect(canComplete([{ weightKg: null, reps: 10 }])).toBe(false);
    expect(canComplete([{ weightKg: null, reps: null }, { weightKg: 20, reps: 8 }])).toBe(true);
  });
  it('formats sets', () => {
    expect(formatSet({ weightKg: 47.5, reps: 10 })).toBe('47.5 kg × 10');
    expect(formatSet({ weightKg: null, reps: 10 })).toBeNull();
  });
});
