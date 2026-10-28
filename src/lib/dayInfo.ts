import type { DateStr, JournalEntry, Task, WorkoutDay, WorkoutPlan } from '../types';
import { taskMarkers } from './tasks';
import { scheduleFor } from './workoutService';

/** What to show as calendar indicators for one date. */
export interface DayInfo {
  task?: 'open' | 'done';
  /** Name of the workout scheduled that day. */
  workout?: string;
  journal?: boolean;
}

interface Data {
  tasks: Task[];
  plan: WorkoutPlan | null;
  days: WorkoutDay[];
  journal: Record<DateStr, JournalEntry>;
}

/** Builds indicators for the given (visible) dates from the same records every tab uses. */
export function buildDayInfo(dates: DateStr[], data: Data): Map<DateStr, DayInfo> {
  const markers = taskMarkers(data.tasks, dates);
  const byId = new Map(data.days.map((d) => [d.id, d]));
  const out = new Map<DateStr, DayInfo>();
  for (const date of dates) {
    const info: DayInfo = {};
    const t = markers.get(date);
    if (t) info.task = t;
    const workout = data.plan ? scheduleFor(data.plan, byId, date).day : null;
    if (workout) info.workout = workout.name;
    if (data.journal[date]) info.journal = true;
    if (info.task || info.workout || info.journal) out.set(date, info);
  }
  return out;
}

/** Text version of the indicators, for screen readers. */
export function describeInfo(info?: DayInfo): string {
  if (!info) return '';
  const parts: string[] = [];
  if (info.task) parts.push(info.task === 'open' ? 'tasks to do' : 'tasks done');
  if (info.workout) parts.push(`${info.workout} workout`);
  if (info.journal) parts.push('journal entry');
  return parts.join(', ');
}
