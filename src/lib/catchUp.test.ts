import { describe, expect, it } from 'vitest';
import { catchUpPolicy, standardPolicy, strictPolicy, type PriorOccurrence } from './catchUp';

const occ = (status: PriorOccurrence['status'], date = '2026-10-07'): PriorOccurrence => ({ date, status, logId: `log-${date}` });

describe('standard catch-up policy', () => {
  it('is eligible when the previous occurrence explicitly skipped the exercise', () => {
    expect(standardPolicy({ previous: occ('skipped'), beforePrevious: null })).toEqual({
      eligible: true, originLogId: 'log-2026-10-07', originDate: '2026-10-07',
    });
  });

  it('is not eligible for completed, unfinished, missing or unrecorded exercises', () => {
    expect(standardPolicy({ previous: occ('completed'), beforePrevious: null }).eligible).toBe(false);
    expect(standardPolicy({ previous: occ('unfinished'), beforePrevious: null }).eligible).toBe(false); // rule 6
    expect(standardPolicy({ previous: occ(undefined), beforePrevious: null }).eligible).toBe(false);
    expect(standardPolicy({ previous: null, beforePrevious: null }).eligible).toBe(false);
  });

  it('ignores older misses (rule 4)', () => {
    expect(standardPolicy({ previous: occ('completed', '2026-10-14'), beforePrevious: occ('skipped') }).eligible).toBe(false);
  });

  it('uses only the most recent skip when skipped twice in a row (rule 5)', () => {
    const d = standardPolicy({ previous: occ('skipped', '2026-10-14'), beforePrevious: occ('skipped', '2026-10-07') });
    expect(d).toEqual({ eligible: true, originLogId: 'log-2026-10-14', originDate: '2026-10-14' });
  });

  it('is the policy the app currently uses', () => {
    const input = { previous: occ('skipped'), beforePrevious: occ('skipped', '2026-09-30') };
    expect(catchUpPolicy(input)).toEqual(standardPolicy(input));
  });
});

describe('strict alternative policy (not used by the app)', () => {
  it('blocks catch-up when skipped in both of the previous two occurrences', () => {
    expect(strictPolicy({ previous: occ('skipped', '2026-10-14'), beforePrevious: occ('skipped', '2026-10-07') }).eligible).toBe(false);
  });
  it('still gives catch-up after a single skip', () => {
    expect(strictPolicy({ previous: occ('skipped', '2026-10-14'), beforePrevious: occ('completed', '2026-10-07') }).eligible).toBe(true);
    expect(strictPolicy({ previous: occ('skipped', '2026-10-14'), beforePrevious: null }).eligible).toBe(true);
  });
  it('is never eligible without a skip in the previous occurrence', () => {
    expect(strictPolicy({ previous: occ('completed', '2026-10-14'), beforePrevious: occ('skipped') }).eligible).toBe(false);
    expect(strictPolicy({ previous: occ('unfinished', '2026-10-14'), beforePrevious: null }).eligible).toBe(false);
  });
});
