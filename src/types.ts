/** Local calendar date in YYYY-MM-DD form. Never a timestamp. */
export type DateStr = string;

export type TaskStatus = 'todo' | 'working' | 'done';
export type TabId = 'todo' | 'health' | 'journal';

/** Weekdays are 0 = Monday ... 6 = Sunday. */
export type Repeat = { type: 'daily' } | { type: 'weekly'; days: number[] };

export interface Task {
  id: string;
  title: string;
  description?: string;
  tag?: string;
  dueTime?: string; // HH:mm
  date: DateStr;
  /** For repeating tasks: `date` is the start date and `status` is unused. */
  status: TaskStatus;
  repeat?: Repeat;
  /** For repeating tasks: status of each individual day, keyed by YYYY-MM-DD. */
  occurrenceStatus?: Record<DateStr, TaskStatus>;
  createdAt: number;
  updatedAt: number;
}

export interface JournalEntry {
  date: DateStr; // one entry per date
  mood: number | null; // 1..10
  text: string;
  updatedAt: number;
}

export interface JournalPhoto {
  date: DateStr;
  blob: Blob;
  updatedAt: number;
}