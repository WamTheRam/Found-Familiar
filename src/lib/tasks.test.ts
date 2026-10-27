import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { carriedOver, countDone, describeRepeat, filterByStatus, occursOn, sortTasks, taskMarkers, tasksForDate } from './tasks';

let n = 0;
const mk = (over: Partial<Task>): Task => ({
  id: `t${++n}`, title: 'x', date: '2026-10-14', status: 'todo', createdAt: n, updatedAt: n, ...over,
});

describe('task views', () => {
  it('filters tasks to the selected date', () => {
    const a = mk({ date: '2026-10-14' });
    const b = mk({ date: '2026-10-15' });
    expect(tasksForDate([a, b], '2026-10-14')).toEqual([a]);
  });

  it('carries over only unfinished tasks from earlier dates', () => {
    const old = mk({ date: '2026-10-12', status: 'todo' });
    const oldWorking = mk({ date: '2026-10-13', status: 'working' });
    const oldDone = mk({ date: '2026-10-12', status: 'done' });
    const same = mk({ date: '2026-10-14' });
    const future = mk({ date: '2026-10-20' });
    const result = carriedOver([future, same, oldDone, oldWorking, old], '2026-10-14');
    expect(result).toEqual([old, oldWorking]);
  });

  it('carries over across month and year boundaries without altering stored dates', () => {
    const t = mk({ date: '2026-12-30' });
    expect(carriedOver([t], '2027-01-02')).toEqual([t]);
    expect(t.date).toBe('2026-12-30');
  });

  it('filters by status and counts done', () => {
    const list = [mk({ status: 'todo' }), mk({ status: 'working' }), mk({ status: 'done' })];
    expect(filterByStatus(list, 'working')).toHaveLength(1);
    expect(filterByStatus(list, 'all')).toHaveLength(3);
    expect(countDone(list)).toBe(1);
  });

  it('sorts timed tasks first, then by creation order', () => {
    const late = mk({ dueTime: '15:00' });
    const early = mk({ dueTime: '09:30' });
    const none1 = mk({});
    const none2 = mk({});
    expect(sortTasks([none2, late, none1, early])).toEqual([early, late, none1, none2]);
  });

  it('marks dates as open when anything is unfinished', () => {
    const m = taskMarkers([
      mk({ date: '2026-10-14', status: 'done' }),
      mk({ date: '2026-10-14', status: 'todo' }),
      mk({ date: '2026-10-15', status: 'done' }),
    ]);
    expect(m.get('2026-10-14')).toBe('open');
    expect(m.get('2026-10-15')).toBe('done');
    expect(m.get('2026-10-16')).toBeUndefined();
  });
});

describe('recurring tasks', () => {
  it('repeats daily from the start date, never before it', () => {
    const t = mk({ date: '2026-10-14', repeat: { type: 'daily' } });
    expect(occursOn(t, '2026-10-13')).toBe(false);
    expect(occursOn(t, '2026-10-14')).toBe(true);
    expect(occursOn(t, '2027-01-01')).toBe(true);
  });

  it('repeats weekly on the chosen weekdays (0 = Monday)', () => {
    const t = mk({ date: '2026-10-12', repeat: { type: 'weekly', days: [0, 2] } });
    expect(occursOn(t, '2026-10-12')).toBe(true); // Mon
    expect(occursOn(t, '2026-10-13')).toBe(false); // Tue
    expect(occursOn(t, '2026-10-14')).toBe(true); // Wed
    expect(occursOn(t, '2026-10-19')).toBe(true); // next Mon
    expect(occursOn(t, '2026-10-05')).toBe(false); // before start
  });

  it('starts on the next matching weekday when the start date does not match', () => {
    const t = mk({ date: '2026-10-14', repeat: { type: 'weekly', days: [0] } }); // starts Wed, every Mon
    expect(occursOn(t, '2026-10-14')).toBe(false);
    expect(occursOn(t, '2026-10-19')).toBe(true);
  });

  it('tracks completion separately for each day', () => {
    const t = mk({ date: '2026-10-12', repeat: { type: 'daily' }, occurrenceStatus: { '2026-10-14': 'done' } });
    expect(tasksForDate([t], '2026-10-14')[0].status).toBe('done');
    expect(tasksForDate([t], '2026-10-15')[0].status).toBe('todo');
    expect(tasksForDate([t], '2026-10-13')[0].status).toBe('todo');
    expect(tasksForDate([t], '2026-10-15')[0].date).toBe('2026-10-15');
  });

  it('never carries repeating tasks over', () => {
    const t = mk({ date: '2026-10-12', repeat: { type: 'daily' } });
    expect(carriedOver([t], '2026-10-20')).toEqual([]);
  });

  it('marks calendar dates per occurrence within the visible range', () => {
    const t = mk({ date: '2026-10-12', repeat: { type: 'daily' }, occurrenceStatus: { '2026-10-13': 'done' } });
    const m = taskMarkers([t], ['2026-10-11', '2026-10-12', '2026-10-13']);
    expect(m.get('2026-10-11')).toBeUndefined();
    expect(m.get('2026-10-12')).toBe('open');
    expect(m.get('2026-10-13')).toBe('done');
  });

  it('describes repeats', () => {
    expect(describeRepeat({ type: 'daily' })).toBe('Repeats daily');
    expect(describeRepeat({ type: 'weekly', days: [0, 4] })).toBe('Repeats Mon, Fri');
  });
});