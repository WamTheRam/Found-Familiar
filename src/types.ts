/** Local calendar date in YYYY-MM-DD form. Never a timestamp. */
export type DateStr = string;

export type TaskStatus = 'todo' | 'working' | 'done';
export type TabId = 'todo' | 'health' | 'journal';

export interface Task {
  id: string;
  title: string;
  description?: string;
  tag?: string;
  dueTime?: string; // HH:mm
  date: DateStr;
  status: TaskStatus;
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
