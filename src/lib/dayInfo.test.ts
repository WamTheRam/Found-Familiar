import { describe, expect, it } from 'vitest';
import type { JournalEntry, Task, WorkoutDay, WorkoutPlan } from '../types';
import { buildDayInfo, describeInfo } from './dayInfo';

const pull: WorkoutDay = { id: 'pull', name: 'Pull', exercises: [] };
const plan: WorkoutPlan = { id: 'plan', cycleWeeks: 1, anchorDate: '2026-10-05', slots: [null, null, 'pull', null, null, null, null], updatedAt: 1 };
const task = (over: Partial<Task>): Task => ({ id: 'a', title: 't', date: '2026-10-14', status: 'todo', createdAt: 1, updatedAt: 1, ...over });
const entry = (date: string): JournalEntry => ({ date, mood: 7, text: 'x', updatedAt: 1 });

describe('calendar indicators', () => {
  const dates = ['2026-10-13', '2026-10-14', '2026-10-15'];

  it('combines tasks, workouts and journal entries on the right dates', () => {
    const info = buildDayInfo(dates, {
      tasks: [task({})], plan, days: [pull], journal: { '2026-10-15': entry('2026-10-15') },
    });
    expect(info.get('2026-10-13')).toBeUndefined();
    expect(info.get('2026-10-14')).toEqual({ task: 'open', workout: 'Pull' }); // Wednesday
    expect(info.get('2026-10-15')).toEqual({ journal: true });
  });

  it('shows repeating tasks per day with their own status', () => {
    const rep = task({ date: '2026-10-13', repeat: { type: 'daily' }, occurrenceStatus: { '2026-10-14': 'done' } });
    const info = buildDayInfo(dates, { tasks: [rep], plan: null, days: [], journal: {} });
    expect(info.get('2026-10-13')?.task).toBe('open');
    expect(info.get('2026-10-14')?.task).toBe('done');
  });

  it('works with no split and no data', () => {
    expect(buildDayInfo(dates, { tasks: [], plan: null, days: [], journal: {} }).size).toBe(0);
  });

  it('describes indicators in words', () => {
    expect(describeInfo({ task: 'open', workout: 'Pull', journal: true })).toBe('tasks to do, Pull workout, journal entry');
    expect(describeInfo(undefined)).toBe('');
  });
});
