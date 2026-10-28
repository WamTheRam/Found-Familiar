import { describe, expect, it } from 'vitest';
import { addDays, addMonths, monthGrid, setMonthYear } from './dates';

describe('date navigation across boundaries', () => {
  it('steps weeks across a year boundary in both directions', () => {
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(addDays('2027-01-01', -7)).toBe('2026-12-25');
  });

  it('steps months across a year boundary in both directions', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2027-01-15', -1)).toBe('2026-12-15');
    expect(addMonths('2027-01-31', -1)).toBe('2026-12-31');
  });

  it('twelve forward steps land on the same day next year', () => {
    let d = '2026-10-15';
    for (let i = 0; i < 12; i++) d = addMonths(d, 1);
    expect(d).toBe('2027-10-15');
  });

  it('clamps short months, including leap years', () => {
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('jumps to a month and year, keeping the day where possible', () => {
    expect(setMonthYear('2026-10-14', 2027, 3)).toBe('2027-03-14');
    expect(setMonthYear('2026-10-31', 2027, 2)).toBe('2027-02-28');
    expect(setMonthYear('2028-01-31', 2028, 2)).toBe('2028-02-29');
    expect(setMonthYear('2026-10-14', 1999, 12)).toBe('1999-12-14');
  });

  it('builds month grids that include spill-over days from neighbouring months and years', () => {
    const dec = monthGrid('2026-12-10');
    expect(dec[0][0]).toBe('2026-11-30');
    expect(dec[dec.length - 1][6]).toBe('2027-01-03');
    const feb = monthGrid('2027-02-10'); // starts on a Monday and has exactly four weeks
    expect(feb).toHaveLength(4);
    expect(feb[0][0]).toBe('2027-02-01');
    expect(feb[3][6]).toBe('2027-02-28');
  });
});
