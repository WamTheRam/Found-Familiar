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
  title?: string;
  text: string;
  updatedAt: number;
}

export interface JournalPhoto {
  date: DateStr;
  /** Display-size image (downscaled JPEG). */
  blob: Blob;
  /** Small image for the month calendar. */
  thumb?: Blob;
  updatedAt: number;
}

/* ---------- Health / workouts ---------- */

export type ExerciseStatus = 'completed' | 'skipped' | 'unfinished';
export type CatchUpStatus = 'open' | 'completed' | 'skipped';

export interface SetLog {
  weightKg: number | null;
  reps: number | null;
}

export interface ExerciseDef {
  id: string; // stable across renames
  name: string;
  sets: number;
  targetReps: number;
  notes?: string;
}

export interface WorkoutDay {
  id: string;
  name: string;
  focus?: string;
  exercises: ExerciseDef[];
  /** Removed days are archived, never deleted, so history keeps working. */
  archived?: boolean;
}

export interface WorkoutPlan {
  id: 'plan';
  cycleWeeks: 1 | 2;
  /** A Monday that starts Week 1 (or any Week-1 Monday). */
  anchorDate: DateStr;
  /** One entry per weekday slot (7 or 14): a WorkoutDay id, or null for rest. */
  slots: (string | null)[];
  updatedAt: number;
}

/** One per calendar date, created the first time something is logged. */
export interface WorkoutSession {
  id: string; // session:<date>
  date: DateStr;
  slotIndex: number;
  cycleWeeks: 1 | 2;
  dayId: string;
  dayName: string; // snapshot
  createdAt: number;
}

export interface ExerciseLog {
  id: string; // <sessionId>:<exerciseId>
  sessionId: string;
  sessionDate: DateStr;
  exerciseId: string;
  exerciseName: string; // snapshot
  plannedSets: number;
  targetReps: number;
  status: ExerciseStatus;
  sets: SetLog[];
  updatedAt: number;
}

/** Make-up work for an exercise explicitly skipped last time. Kept apart from normal logs. */
export interface CatchUp {
  id: string; // catchup:<originLogId>
  originLogId: string; // unique
  originDate: DateStr;
  dueDate: DateStr; // the next occurrence of the same slot
  dayId: string;
  dayName: string;
  slotIndex: number;
  exerciseId: string;
  exerciseName: string;
  plannedSets: number;
  targetReps: number;
  status: CatchUpStatus;
  sets: SetLog[];
  updatedAt: number;
}
