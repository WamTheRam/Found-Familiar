import type { DateStr, Repeat, Task, TaskStatus } from '../types';
import { weekdayIndex } from './dates';

export type StatusFilter = TaskStatus | 'all';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To do',
  working: 'Working on',
  done: 'Done',
};

/** Time-of-day first (untimed last), then oldest created first. */
export function sortTasks(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    const at = a.dueTime ?? '99:99';
    const bt = b.dueTime ?? '99:99';
    return at.localeCompare(bt) || a.createdAt - b.createdAt;
  });
}

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Does this task (or repeating series) have an occurrence on `date`? Series never occur before their start date. */
export function occursOn(t: Task, date: DateStr): boolean {
  if (!t.repeat) return t.date === date;
  if (date < t.date) return false;
  return t.repeat.type === 'daily' || t.repeat.days.includes(weekdayIndex(date));
}

export function describeRepeat(r: Repeat): string {
  if (r.type === 'daily' || r.days.length === 7) return 'Repeats daily';
  return `Repeats ${r.days.map((d) => WEEKDAY_SHORT[d]).join(', ')}`;
}

/**
 * Tasks to show on a date. A repeating task yields a per-day copy whose status
 * comes from its own occurrence record, so days never affect each other.
 */
export function tasksForDate(tasks: Task[], date: DateStr): Task[] {
  const out: Task[] = [];
  for (const t of tasks) {
    if (!occursOn(t, date)) continue;
    out.push(t.repeat ? { ...t, date, status: t.occurrenceStatus?.[date] ?? 'todo' } : t);
  }
  return out;
}

/**
 * Unfinished one-off tasks assigned to an earlier date than the one being viewed.
 * Stored dates are never changed; this is purely a view. Repeating tasks are
 * never carried over (a missed day simply stays missed).
 */
export function carriedOver(tasks: Task[], date: DateStr): Task[] {
  return tasks
    .filter((t) => !t.repeat && t.status !== 'done' && t.date < date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

export const filterByStatus = (list: Task[], f: StatusFilter) =>
  f === 'all' ? list : list.filter((t) => t.status === f);

export const countDone = (list: Task[]) => list.filter((t) => t.status === 'done').length;

/**
 * Per-date marker for calendar dots: 'open' if anything is unfinished, else 'done'.
 * Repeating tasks only count on the dates in `range` (the dates currently visible).
 */
export function taskMarkers(tasks: Task[], range: DateStr[] = []): Map<DateStr, 'open' | 'done'> {
  const map = new Map<DateStr, 'open' | 'done'>();
  const mark = (date: DateStr, status: TaskStatus) => {
    if (status !== 'done') map.set(date, 'open');
    else if (!map.has(date)) map.set(date, 'done');
  };
  for (const t of tasks) {
    if (!t.repeat) mark(t.date, t.status);
    else for (const d of range) if (occursOn(t, d)) mark(d, t.occurrenceStatus?.[d] ?? 'todo');
  }
  return map;
}