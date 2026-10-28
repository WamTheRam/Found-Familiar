import { describe, expect, it } from 'vitest';
import { MOODS, contrastRatio, isValidMood, moodFor, readableTextOn } from './mood';

describe('mood scale', () => {
  it('has ten distinct values from 1 to 10', () => {
    expect(MOODS.map((m) => m.value)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(MOODS.map((m) => m.color)).size).toBe(10);
  });
  it('keeps text readable (WCAG AA, 4.5:1) on every mood colour', () => {
    for (const m of MOODS) expect(contrastRatio(readableTextOn(m.color), m.color)).toBeGreaterThanOrEqual(4.5);
  });
  it('validates moods', () => {
    expect(isValidMood(10)).toBe(true);
    expect(isValidMood(0)).toBe(false);
    expect(isValidMood(5.5)).toBe(false);
    expect(isValidMood(null)).toBe(false);
  });
  it('looks moods up', () => {
    expect(moodFor(8)?.label).toBe('Grounded');
    expect(moodFor(null)).toBeNull();
  });
});
