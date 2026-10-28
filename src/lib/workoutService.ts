import type { WorkoutRepository } from '../data/repository';
import { sessionIdFor } from '../data/repository';
import type {
  CatchUp, CatchUpStatus, DateStr, ExerciseDef, ExerciseLog, ExerciseStatus, SetLog,
  WorkoutDay, WorkoutPlan, WorkoutSession,
} from '../types';
import { catchUpPolicy, type PriorOccurrence } from './catchUp';
import { occurrenceDateBefore, slotIndexFor, weekNumberFor } from './cycle';
import { weekDays } from './dates';

export const logIdFor = (sessionId: string, exerciseId: string) => `${sessionId}:${exerciseId}`;
export const catchUpIdFor = (originLogId: string) => `catchup:${originLogId}`;

export interface Reference { date: DateStr; sets: SetLog[] }
export interface ExerciseItem { def: ExerciseDef; log: ExerciseLog | null; reference: Reference | null }
export interface CatchUpItem { record: CatchUp; reference: Reference | null }
export interface StripDay { date: DateStr; label: string; isRest: boolean }

export interface WorkoutView {
  date: DateStr;
  plan: WorkoutPlan | null;
  days: WorkoutDay[];
  weekNumber: number | null;
  /** null = rest day or no plan yet */
  day: WorkoutDay | null;
  items: ExerciseItem[];
  catchUps: CatchUpItem[];
  strip: StripDay[];
}

type DayMap = Map<string, WorkoutDay>;

export function scheduleFor(plan: WorkoutPlan, byId: DayMap, date: DateStr) {
  const slotIndex = slotIndexFor(plan, date);
  const id = plan.slots[slotIndex] ?? null;
  return { slotIndex, day: id ? byId.get(id) ?? null : null };
}

export function weekStrip(plan: WorkoutPlan, byId: DayMap, date: DateStr): StripDay[] {
  return weekDays(date).map((d) => {
    const { day } = scheduleFor(plan, byId, d);
    return { date: d, label: day?.name ?? 'Rest', isRest: !day };
  });
}

/**
 * Most recent COMPLETED performance of an exercise before `beforeDate`.
 * Skipped or unfinished sessions are ignored, so they never replace the reference.
 */
export async function lastCompletedReference(
  repo: WorkoutRepository, exerciseId: string, beforeDate: DateStr,
): Promise<Reference | null> {
  const logs = (await repo.listLogsByExercise(exerciseId))
    .filter((l) => l.status === 'completed' && l.sessionDate < beforeDate)
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
  return logs[0] ? { date: logs[0].sessionDate, sets: logs[0].sets } : null;
}

interface SlotContext { date: DateStr; slotIndex: number; cycleWeeks: 1 | 2; dayId: string }

/** What the persisted records say about this exercise `n` occurrences of the same slot ago. */
async function priorOccurrence(
  repo: WorkoutRepository, ctx: SlotContext, exerciseId: string, n: number,
): Promise<PriorOccurrence | null> {
  const date = occurrenceDateBefore(ctx.cycleWeeks, ctx.date, n);
  const session = await repo.getSession(date);
  if (!session || session.dayId !== ctx.dayId || session.slotIndex !== ctx.slotIndex || session.cycleWeeks !== ctx.cycleWeeks) {
    return null;
  }
  const log = await repo.getLog(logIdFor(session.id, exerciseId));
  return { date, logId: log?.id, status: log?.status };
}

export async function loadWorkoutView(repo: WorkoutRepository, date: DateStr): Promise<WorkoutView> {
  const plan = (await repo.getPlan()) ?? null;
  const days = await repo.listDays();
  if (!plan) return { date, plan: null, days, weekNumber: null, day: null, items: [], catchUps: [], strip: [] };

  const byId: DayMap = new Map(days.map((d) => [d.id, d]));
  const session = await repo.getSession(date);
  const sched = scheduleFor(plan, byId, date);
  // A date that already has a session keeps the day it was logged under, even if the split changed later.
  const sessionDay = session ? byId.get(session.dayId) ?? null : null;
  const day = sessionDay ?? sched.day;
  const slotIndex = session && sessionDay ? session.slotIndex : sched.slotIndex;
  const cycleWeeks = session && sessionDay ? session.cycleWeeks : plan.cycleWeeks;

  const items: ExerciseItem[] = [];
  if (day) {
    for (const def of day.exercises) {
      const log = session ? (await repo.getLog(logIdFor(session.id, def.id))) ?? null : null;
      const reference = await lastCompletedReference(repo, def.id, date);
      items.push({ def, log, reference });

      // Eligibility comes only from persisted records of earlier occurrences.
      const ctx: SlotContext = { date, slotIndex, cycleWeeks, dayId: day.id };
      const decision = catchUpPolicy({
        previous: await priorOccurrence(repo, ctx, def.id, 1),
        beforePrevious: await priorOccurrence(repo, ctx, def.id, 2),
      });
      if (decision.eligible && decision.originLogId && decision.originDate) {
        await repo.createCatchUpIfAbsent({
          id: catchUpIdFor(decision.originLogId),
          originLogId: decision.originLogId,
          originDate: decision.originDate,
          dueDate: date,
          dayId: day.id,
          dayName: day.name,
          slotIndex,
          exerciseId: def.id,
          exerciseName: def.name,
          plannedSets: def.sets,
          targetReps: def.targetReps,
          status: 'open',
          sets: [],
          updatedAt: Date.now(),
        });
      }
    }
  }

  const catchUps: CatchUpItem[] = [];
  for (const record of await repo.listCatchUpsDue(date)) {
    if (record.status === 'open') {
      // If the original skip was undone, the open catch-up no longer applies.
      const origin = await repo.getLog(record.originLogId);
      if (origin?.status !== 'skipped') continue;
    }
    catchUps.push({ record, reference: await lastCompletedReference(repo, record.exerciseId, date) });
  }
  catchUps.sort((a, b) => a.record.exerciseName.localeCompare(b.record.exerciseName));

  return {
    date, plan, days, weekNumber: weekNumberFor(plan, date), day, items, catchUps,
    strip: weekStrip(plan, byId, date),
  };
}

/** Saves one exercise's sets and status for a date, creating the session on first use. Never touches other dates. */
export async function saveExerciseProgress(
  repo: WorkoutRepository, date: DateStr, exerciseId: string, sets: SetLog[], status: ExerciseStatus,
): Promise<ExerciseLog> {
  const plan = await repo.getPlan();
  if (!plan) throw new Error('No workout split has been set up.');
  const byId: DayMap = new Map((await repo.listDays()).map((d) => [d.id, d]));

  let session: WorkoutSession | undefined = await repo.getSession(date);
  let day: WorkoutDay | null;
  if (session) {
    day = byId.get(session.dayId) ?? null;
  } else {
    const sched = scheduleFor(plan, byId, date);
    day = sched.day;
    if (!day) throw new Error('This is a rest day.');
    session = {
      id: sessionIdFor(date), date, slotIndex: sched.slotIndex, cycleWeeks: plan.cycleWeeks,
      dayId: day.id, dayName: day.name, createdAt: Date.now(),
    };
    await repo.saveSession(session);
  }
  const def = day?.exercises.find((e) => e.id === exerciseId);
  if (!def) throw new Error('That exercise is not part of this workout.');

  const log: ExerciseLog = {
    id: logIdFor(session.id, def.id), sessionId: session.id, sessionDate: date,
    exerciseId: def.id, exerciseName: def.name, plannedSets: def.sets, targetReps: def.targetReps,
    status, sets, updatedAt: Date.now(),
  };
  await repo.saveLog(log);
  return log;
}

/** Catch-up progress lives in its own record and never writes to normal exercise logs. */
export async function saveCatchUpProgress(
  repo: WorkoutRepository, catchUpId: string, sets: SetLog[], status: CatchUpStatus,
): Promise<CatchUp> {
  const existing = await repo.getCatchUp(catchUpId);
  if (!existing) throw new Error('Catch-up record not found.');
  const next: CatchUp = { ...existing, sets, status, updatedAt: Date.now() };
  await repo.saveCatchUp(next);
  return next;
}
