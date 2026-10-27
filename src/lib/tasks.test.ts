import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { carriedOver, countDone, filterByStatus, sortTasks, taskMarkers, tasksForDate } from './tasks';

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
