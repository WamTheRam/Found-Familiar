import { describe, expect, it } from 'vitest';
import { anchorForWeekNumber, occurrenceDateBefore, slotIndexFor, weekNumberFor } from './cycle';

const weekly = { cycleWeeks: 1 as const, anchorDate: '2026-10-05' };
const fortnightly = { cycleWeeks: 2 as const, anchorDate: '2026-10-05' };

describe('cycle calculations', () => {
  it('weekly slots follow the weekday (Monday = 0)', () => {
    expect(slotIndexFor(weekly, '2026-10-05')).toBe(0);
    expect(slotIndexFor(weekly, '2026-10-14')).toBe(2);
    expect(slotIndexFor(weekly, '2026-10-18')).toBe(6);
    expect(weekNumberFor(weekly, '2026-10-14')).toBe(1);
  });

  it('fortnightly cycles alternate Week 1 and Week 2', () => {
    expect(weekNumberFor(fortnightly, '2026-10-07')).toBe(1);
    expect(weekNumberFor(fortnightly, '2026-10-14')).toBe(2);
    expect(weekNumberFor(fortnightly, '2026-10-21')).toBe(1);
    expect(slotIndexFor(fortnightly, '2026-10-07')).toBe(2);
    expect(slotIndexFor(fortnightly, '2026-10-15')).toBe(10); // Week 2 Thursday
    expect(slotIndexFor(fortnightly, '2026-10-18')).toBe(13); // Week 2 Sunday
    expect(slotIndexFor(fortnightly, '2026-10-19')).toBe(0);
  });

  it('keeps alternating before the anchor and across year boundaries', () => {
    expect(weekNumberFor(fortnightly, '2026-09-30')).toBe(2);
    expect(weekNumberFor(fortnightly, '2026-09-23')).toBe(1);
    expect(weekNumberFor(fortnightly, '2026-12-28')).toBe(1); // 12 weeks after the anchor
    expect(weekNumberFor(fortnightly, '2027-01-04')).toBe(2); // 13 weeks after
    expect(slotIndexFor(fortnightly, '2027-01-01')).toBe(4);
  });

  it('finds the same slot one or two cycles earlier', () => {
    expect(occurrenceDateBefore(1, '2026-10-14')).toBe('2026-10-07');
    expect(occurrenceDateBefore(2, '2026-10-21')).toBe('2026-10-07');
    expect(occurrenceDateBefore(2, '2027-01-06', 2)).toBe('2026-12-09');
    expect(occurrenceDateBefore(1, '2027-01-02')).toBe('2026-12-26');
  });

  it('computes an anchor that makes this week Week 1 or Week 2', () => {
    const w1 = anchorForWeekNumber('2026-10-14', 1);
    const w2 = anchorForWeekNumber('2026-10-14', 2);
    expect(w1).toBe('2026-10-12');
    expect(w2).toBe('2026-10-05');
    expect(weekNumberFor({ cycleWeeks: 2, anchorDate: w2 }, '2026-10-14')).toBe(2);
  });
});
