import type { DateStr, ExerciseStatus } from '../types';

/*
 * Catch-up policy. Pure: it only sees what was persisted about earlier
 * occurrences of the SAME slot (same cycle position and same workout day).
 *
 * `previous`        = the immediately preceding occurrence of that slot
 * `beforePrevious`  = the occurrence before that (only the strict variant looks at it)
 * `null`            = no session was recorded for that occurrence
 * `status` undefined = a session exists but has no log for this exercise
 *
 * To change the app's behaviour, change the single `catchUpPolicy` export at the bottom.
 */
export interface PriorOccurrence {
  date: DateStr;
  logId?: string;
  status?: ExerciseStatus;
}

export interface CatchUpInput {
  previous: PriorOccurrence | null;
  beforePrevious: PriorOccurrence | null;
}

export interface CatchUpDecision {
  eligible: boolean;
  originLogId?: string;
  originDate?: DateStr;
}

/**
 * Rules 2, 4, 5, 6: eligible only when the immediately preceding occurrence
 * explicitly SKIPPED the exercise. Unfinished, completed or missing records give
 * nothing, and older occurrences are never consulted, so misses cannot accumulate.
 * When skipped twice in a row, only the most recent miss counts.
 */
export function standardPolicy({ previous }: CatchUpInput): CatchUpDecision {
  if (previous?.status === 'skipped' && previous.logId) {
    return { eligible: true, originLogId: previous.logId, originDate: previous.date };
  }
  return { eligible: false };
}

/** Stricter alternative: skipped in BOTH of the previous two occurrences means no catch-up. */
export function strictPolicy(input: CatchUpInput): CatchUpDecision {
  if (input.beforePrevious?.status === 'skipped') return { eligible: false };
  return standardPolicy(input);
}

/** The policy the app uses. Swap `standardPolicy` for `strictPolicy` to change it everywhere. */
export const catchUpPolicy: (input: CatchUpInput) => CatchUpDecision = standardPolicy;
