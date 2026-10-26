import { describe, expect, it } from 'vitest';
import {
  addDays, addMonths, daysBetween, monthGrid, startOfWeek, todayStr, weekdayIndex, weekDays,
} from './dates';

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('is not affected by daylight saving', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
  });

  it('starts weeks on Monday', () => {
    expect(weekdayIndex('2026-10-14')).toBe(2); // Wednesday
    expect(startOfWeek('2026-10-14')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12'); // Sunday
    expect(weekDays('2026-10-14')[6]).toBe('2026-10-18');
  });

  it('clamps the day when changing month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonths('2026-03-31', -13)).toBe('2025-02-28');
  });

  it('builds full Monday-first month grids', () => {
    const grid = monthGrid('2026-10-14');
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid[0][0]).toBe('2026-09-28');
    expect(grid[grid.length - 1][6]).toBe('2026-11-01');
  });

  it('formats today from local parts', () => {
    expect(todayStr(new Date(2026, 9, 14, 23, 59))).toBe('2026-10-14');
  });
});
