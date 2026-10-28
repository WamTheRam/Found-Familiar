import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createIndexedDbRepository, type AppRepository } from '../data/repository';
import type { WorkoutDay, WorkoutPlan } from '../types';
import {
  lastCompletedReference, loadWorkoutView, saveCatchUpProgress, saveExerciseProgress,
} from './workoutService';

let n = 0;
const freshName = () => `wk-test-${++n}`;
const S = (w: number, r: number) => ({ weightKg: w, reps: r });

const PULL: WorkoutDay = {
  id: 'pull', name: 'Pull', focus: 'back & biceps',
  exercises: [
    { id: 'lat', name: 'Lat pulldown', sets: 3, targetReps: 10 },
    { id: 'row', name: 'Seated cable row', sets: 3, targetReps: 12 },
  ],
};
const PUSH: WorkoutDay = { id: 'push', name: 'Push', exercises: [{ id: 'bench', name: 'Bench press', sets: 3, targetReps: 8 }] };

// 2026-10-05 is a Monday. Wednesdays: 7, 14, 21, 28 Oct.
const weeklyPlan = (slots: (string | null)[] = ['push', null, 'pull', null, null, null, null]): WorkoutPlan => ({
  id: 'plan', cycleWeeks: 1, anchorDate: '2026-10-05', slots, updatedAt: 1,
});
const fortnightlyPlan: WorkoutPlan = {
  id: 'plan', cycleWeeks: 2, anchorDate: '2026-10-05', updatedAt: 1,
  // Week 1: Wed = Pull. Week 2: Thu = Pull (a different slot).
  slots: [null, null, 'pull', null, null, null, null, null, null, null, 'pull', null, null, null],
};

async function setup(plan: WorkoutPlan = weeklyPlan(), name = freshName()): Promise<{ repo: AppRepository; name: string }> {
  const repo = createIndexedDbRepository(name);
  await repo.saveSplit(plan, [PULL, PUSH]);
  return { repo, name };
}

describe('catch-up end to end (weekly)', () => {
  it('shows catch-up on the next occurrence for an explicitly skipped exercise, once', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [], 'skipped');
    const v = await loadWorkoutView(repo, '2026-10-14');
    expect(v.catchUps.map((c) => [c.record.exerciseId, c.record.originDate, c.record.dueDate, c.record.status]))
      .toEqual([['lat', '2026-10-07', '2026-10-14', 'open']]);

    await loadWorkoutView(repo, '2026-10-14'); // reopening must not duplicate
    await loadWorkoutView(repo, '2026-10-14');
    expect(await repo.listCatchUpsDue('2026-10-14')).toHaveLength(1);
  });

  it('does not show it again later, and other exercises are unaffected', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [], 'skipped');
    await saveExerciseProgress(repo, '2026-10-07', 'row', [S(35, 12)], 'completed');
    expect((await loadWorkoutView(repo, '2026-10-14')).catchUps.map((c) => c.record.exerciseId)).toEqual(['lat']);
    const later = await loadWorkoutView(repo, '2026-10-21');
    expect(later.catchUps).toEqual([]);
    expect((await loadWorkoutView(repo, '2026-10-28')).catchUps).toEqual([]);
  });

  it('older misses do not accumulate once a later occurrence was done', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [], 'skipped');
    await saveExerciseProgress(repo, '2026-10-14', 'lat', [S(45, 10)], 'completed');
    expect((await loadWorkoutView(repo, '2026-10-21')).catchUps).toEqual([]);
  });

  it('gives no catch-up when the previous occurrence was never recorded', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [], 'skipped');
    // 14 Oct never opened, so 21 Oct has no preceding record and nothing to catch up
    expect((await loadWorkoutView(repo, '2026-10-21')).catchUps).toEqual([]);
  });

  it('unfinished exercises do not generate catch-up', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [S(45, 5)], 'unfinished');
    expect((await loadWorkoutView(repo, '2026-10-14')).catchUps).toEqual([]);
  });

  it('skipped twice in a row: only the most recent miss is caught up', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [], 'skipped');
    await loadWorkoutView(repo, '2026-10-14');
    await saveExerciseProgress(repo, '2026-10-14', 'lat', [], 'skipped');
    const v = await loadWorkoutView(repo, '2026-10-21');
    expect(v.catchUps.map((c) => c.record.originDate)).toEqual(['2026-10-14']);
    expect(await repo.listCatchUpsDue('2026-10-14')).toHaveLength(1); // the earlier one stays on its own day
    expect(await repo.listCatchUpsDue('2026-10-21')).toHaveLength(1);
  });

  it('keeps catch-up progress after reopening the app, without duplicates', async () => {
    const { repo, name } = await setup();
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [], 'skipped');
    const v = await loadWorkoutView(repo, '2026-10-14');
    await saveCatchUpProgress(repo, v.catchUps[0].record.id, [S(40, 10)], 'completed');

    const reopened = createIndexedDbRepository(name); // a fresh connection, like reloading the page
    const again = await loadWorkoutView(reopened, '2026-10-14');
    expect(again.catchUps).toHaveLength(1);
    expect(again.catchUps[0].record.status).toBe('completed');
    expect(again.catchUps[0].record.sets).toEqual([S(40, 10)]);
    expect(await reopened.listCatchUpsDue('2026-10-14')).toHaveLength(1);
  });

  it('never overwrites normal history', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [], 'skipped');
    const v = await loadWorkoutView(repo, '2026-10-14');
    await saveExerciseProgress(repo, '2026-10-14', 'lat', [S(47.5, 10)], 'completed');
    await saveCatchUpProgress(repo, v.catchUps[0].record.id, [S(40, 8)], 'completed');
    const after = await loadWorkoutView(repo, '2026-10-14');
    expect(after.items[0].log?.sets).toEqual([S(47.5, 10)]);
    expect(after.catchUps[0].record.sets).toEqual([S(40, 8)]);
    expect((await repo.getLog('session:2026-10-07:lat'))?.status).toBe('skipped');
  });

  it('hides an open catch-up if the original skip is undone', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [], 'skipped');
    await loadWorkoutView(repo, '2026-10-14');
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [S(45, 10)], 'completed');
    expect((await loadWorkoutView(repo, '2026-10-14')).catchUps).toEqual([]);
  });
});

describe('catch-up end to end (fortnightly)', () => {
  it('compares Week 1 Pull with the previous Week 1 Pull, not Week 2', async () => {
    const { repo } = await setup(fortnightlyPlan);
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [], 'skipped'); // Week 1 Wed
    const week2 = await loadWorkoutView(repo, '2026-10-15'); // Week 2 Thu Pull: a different slot
    expect(week2.day?.id).toBe('pull');
    expect(week2.catchUps).toEqual([]);
    expect((await loadWorkoutView(repo, '2026-10-14')).day).toBeNull(); // Week 2 Wed is a rest day
    const week1Again = await loadWorkoutView(repo, '2026-10-21'); // Week 1 Wed again
    expect(week1Again.weekNumber).toBe(1);
    expect(week1Again.catchUps.map((c) => c.record.originDate)).toEqual(['2026-10-07']);
  });
});

describe('references', () => {
  it('uses the last COMPLETED session; unfinished and skipped ones do not replace it', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-09-30', 'lat', [S(45, 10), S(45, 10)], 'completed');
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [S(50, 8)], 'unfinished');
    const v = await loadWorkoutView(repo, '2026-10-14');
    expect(v.items[0].reference).toEqual({ date: '2026-09-30', sets: [S(45, 10), S(45, 10)] });
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [], 'skipped');
    expect((await lastCompletedReference(repo, 'lat', '2026-10-14'))?.date).toBe('2026-09-30');
  });

  it('shows an empty reference when nothing was ever completed (no invented values)', async () => {
    const { repo } = await setup();
    expect((await loadWorkoutView(repo, '2026-10-14')).items.map((i) => i.reference)).toEqual([null, null]);
  });

  it('only looks at earlier dates', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-10-21', 'lat', [S(60, 5)], 'completed');
    expect(await lastCompletedReference(repo, 'lat', '2026-10-14')).toBeNull();
  });
});

describe('editing the split keeps history', () => {
  it('renames and adds exercises without breaking history or catch-up', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [], 'skipped');
    const renamed: WorkoutDay = {
      ...PULL, name: 'Pull day',
      exercises: [
        { id: 'lat', name: 'Lat pull-down', sets: 4, targetReps: 8 },
        PULL.exercises[1],
        { id: 'curl', name: 'Hammer curl', sets: 3, targetReps: 12 },
      ],
    };
    await repo.saveSplit(weeklyPlan(), [renamed]);

    expect((await repo.getSession('2026-10-07'))?.dayName).toBe('Pull'); // snapshot kept
    expect((await repo.getLog('session:2026-10-07:lat'))?.exerciseName).toBe('Lat pulldown');
    const v = await loadWorkoutView(repo, '2026-10-14');
    expect(v.items.map((i) => i.def.name)).toEqual(['Lat pull-down', 'Seated cable row', 'Hammer curl']);
    expect(v.catchUps.map((c) => c.record.exerciseId)).toEqual(['lat']);
  });

  it('a moved workout slot does not inherit catch-up from the old slot', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [], 'skipped');
    await repo.saveSplit(weeklyPlan(['push', null, null, 'pull', null, null, null]), [PULL, PUSH]); // Pull moves to Thursday
    expect((await loadWorkoutView(repo, '2026-10-15')).catchUps).toEqual([]);
    expect((await repo.getSession('2026-10-07'))?.slotIndex).toBe(2);
  });

  it('archived days keep their history viewable', async () => {
    const { repo } = await setup();
    await saveExerciseProgress(repo, '2026-10-07', 'lat', [S(45, 10)], 'completed');
    await repo.saveSplit(weeklyPlan(['push', null, null, null, null, null, null]), [{ ...PULL, archived: true }, PUSH]);
    const past = await loadWorkoutView(repo, '2026-10-07');
    expect(past.day?.id).toBe('pull');
    expect(past.items[0].log?.status).toBe('completed');
    expect((await loadWorkoutView(repo, '2026-10-14')).day).toBeNull(); // Wednesday is now a rest day
  });
});
