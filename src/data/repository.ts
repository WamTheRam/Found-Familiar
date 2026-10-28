import type {
  CatchUp, DateStr, ExerciseLog, JournalEntry, JournalPhoto, Task, WorkoutDay, WorkoutPlan, WorkoutSession,
} from '../types';
import { openFamiliarDb, type Db } from './db';

export interface TaskRepository {
  listTasks(): Promise<Task[]>;
  /** Insert or update by id. */
  saveTask(task: Task): Promise<void>;
  deleteTask(id: string): Promise<void>;
}

export interface WorkoutRepository {
  getPlan(): Promise<WorkoutPlan | undefined>;
  /** Includes archived days. */
  listDays(): Promise<WorkoutDay[]>;
  /** Saves the plan and every given day in one transaction. */
  saveSplit(plan: WorkoutPlan, days: WorkoutDay[]): Promise<void>;
  getSession(date: DateStr): Promise<WorkoutSession | undefined>;
  saveSession(session: WorkoutSession): Promise<void>;
  getLog(id: string): Promise<ExerciseLog | undefined>;
  saveLog(log: ExerciseLog): Promise<void>;
  listLogsByExercise(exerciseId: string): Promise<ExerciseLog[]>;
  getCatchUp(id: string): Promise<CatchUp | undefined>;
  /** Atomic: returns the existing record (untouched) if one already exists for the origin log. */
  createCatchUpIfAbsent(catchUp: CatchUp): Promise<CatchUp>;
  saveCatchUp(catchUp: CatchUp): Promise<void>;
  listCatchUpsDue(date: DateStr): Promise<CatchUp[]>;
}

export interface JournalRepository {
  listJournalEntries(): Promise<JournalEntry[]>;
  /** Insert or update the entry for its date. Does not touch the photo. */
  saveJournalEntry(entry: JournalEntry): Promise<void>;
  /** Removes the entry and its photo together, atomically. */
  deleteJournalEntry(date: DateStr): Promise<void>;
  getJournalPhoto(date: DateStr): Promise<JournalPhoto | undefined>;
  /**
   * Stores or replaces the photo for its date and, in the same transaction,
   * creates a blank entry for that date if none exists. Returns the entry.
   */
  saveJournalPhoto(photo: JournalPhoto): Promise<JournalEntry>;
  deleteJournalPhoto(date: DateStr): Promise<void>;
  /** Photos for dates from..to inclusive (used for month thumbnails). */
  listJournalPhotos(from: DateStr, to: DateStr): Promise<JournalPhoto[]>;
}

/*
 * The UI only talks to this interface. A native (Capacitor) implementation can
 * replace the IndexedDB one without touching the UI.
 */
export interface AppRepository extends TaskRepository, WorkoutRepository, JournalRepository {
  /** Opens storage and reports which stores exist. Used as a startup check. */
  health(): Promise<{ ok: true; stores: string[] }>;
}

export const sessionIdFor = (date: DateStr) => `session:${date}`;

export function createIndexedDbRepository(name?: string): AppRepository {
  let dbPromise: Promise<Db> | undefined;
  const db = () => (dbPromise ??= openFamiliarDb(name));
  return {
    async health() {
      const d = await db();
      return { ok: true, stores: Array.from(d.objectStoreNames) };
    },

    async listTasks() { return (await db()).getAll('tasks'); },
    async saveTask(task) { await (await db()).put('tasks', task); },
    async deleteTask(id) { await (await db()).delete('tasks', id); },

    async getPlan() { return (await db()).get('workoutConfig', 'plan'); },
    async listDays() { return (await db()).getAll('workoutDays'); },
    async saveSplit(plan, days) {
      const tx = (await db()).transaction(['workoutConfig', 'workoutDays'], 'readwrite');
      await Promise.all([
        tx.objectStore('workoutConfig').put(plan),
        ...days.map((d) => tx.objectStore('workoutDays').put(d)),
        tx.done,
      ]);
    },
    async getSession(date) { return (await db()).get('workoutSessions', sessionIdFor(date)); },
    async saveSession(session) { await (await db()).put('workoutSessions', session); },
    async getLog(id) { return (await db()).get('exerciseLogs', id); },
    async saveLog(log) { await (await db()).put('exerciseLogs', log); },
    async listLogsByExercise(exerciseId) {
      return (await db()).getAllFromIndex('exerciseLogs', 'byExercise', exerciseId);
    },
    async getCatchUp(id) { return (await db()).get('catchUps', id); },
    async createCatchUpIfAbsent(catchUp) {
      const tx = (await db()).transaction('catchUps', 'readwrite');
      const store = tx.objectStore('catchUps');
      const existing = await store.get(catchUp.id);
      if (existing) { await tx.done; return existing; }
      await store.add(catchUp);
      await tx.done;
      return catchUp;
    },
    async saveCatchUp(catchUp) { await (await db()).put('catchUps', catchUp); },
    async listCatchUpsDue(date) { return (await db()).getAllFromIndex('catchUps', 'byDue', date); },

    async listJournalEntries() { return (await db()).getAll('journalEntries'); },
    async saveJournalEntry(entry) { await (await db()).put('journalEntries', entry); },
    async deleteJournalEntry(date) {
      const tx = (await db()).transaction(['journalEntries', 'journalPhotos'], 'readwrite');
      await Promise.all([
        tx.objectStore('journalEntries').delete(date),
        tx.objectStore('journalPhotos').delete(date),
        tx.done,
      ]);
    },
    async getJournalPhoto(date) { return (await db()).get('journalPhotos', date); },
    async saveJournalPhoto(photo) {
      const tx = (await db()).transaction(['journalEntries', 'journalPhotos'], 'readwrite');
      const entries = tx.objectStore('journalEntries');
      const existing = await entries.get(photo.date);
      const entry: JournalEntry = existing ?? { date: photo.date, mood: null, text: '', updatedAt: Date.now() };
      if (!existing) await entries.put(entry);
      await tx.objectStore('journalPhotos').put(photo);
      await tx.done;
      return entry;
    },
    async deleteJournalPhoto(date) { await (await db()).delete('journalPhotos', date); },
    async listJournalPhotos(from, to) {
      return (await db()).getAll('journalPhotos', IDBKeyRange.bound(from, to));
    },
  };
}
