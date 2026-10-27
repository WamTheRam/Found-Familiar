import type { DateStr, Task, TaskStatus } from '../types';

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

export const tasksForDate = (tasks: Task[], date: DateStr) => tasks.filter((t) => t.date === date);

/**
 * Unfinished tasks assigned to an earlier date than the one being viewed.
 * Stored dates are never changed; this is purely a view.
 */
export function carriedOver(tasks: Task[], date: DateStr): Task[] {
  return tasks
    .filter((t) => t.status !== 'done' && t.date < date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

export const filterByStatus = (list: Task[], f: StatusFilter) =>
  f === 'all' ? list : list.filter((t) => t.status === f);

export const countDone = (list: Task[]) => list.filter((t) => t.status === 'done').length;

/** Per-date marker for calendar dots: 'open' if anything is unfinished, else 'done'. */
export function taskMarkers(tasks: Task[]): Map<DateStr, 'open' | 'done'> {
  const map = new Map<DateStr, 'open' | 'done'>();
  for (const t of tasks) {
    if (t.status !== 'done') map.set(t.date, 'open');
    else if (!map.has(t.date)) map.set(t.date, 'done');
  }
  return map;
}
