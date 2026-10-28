import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  CatchUp, ExerciseLog, JournalEntry, JournalPhoto, Task, WorkoutDay, WorkoutPlan, WorkoutSession,
} from '../types';

/*
 * Database schema.
 *  v1: all stores.
 *  v2: lookup indexes for workout history (logs by exercise, catch-ups by due date).
 * To change the schema later, bump DB_VERSION and add an `if (oldVersion < N)` block.
 */
export const DB_NAME = 'found-familiar';
export const DB_VERSION = 2;

export interface FamiliarDB extends DBSchema {
  tasks: { key: string; value: Task; indexes: { byDate: string } };
  journalEntries: { key: string; value: JournalEntry };
  journalPhotos: { key: string; value: JournalPhoto };
  workoutConfig: { key: string; value: WorkoutPlan };
  workoutDays: { key: string; value: WorkoutDay };
  workoutSessions: { key: string; value: WorkoutSession; indexes: { byDate: string } };
  exerciseLogs: { key: string; value: ExerciseLog; indexes: { bySession: string; byExercise: string } };
  catchUps: { key: string; value: CatchUp; indexes: { byOrigin: string; byDue: string } };
}

export type Db = IDBPDatabase<FamiliarDB>;

export function openFamiliarDb(name: string = DB_NAME): Promise<Db> {
  return openDB<FamiliarDB>(name, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        db.createObjectStore('tasks', { keyPath: 'id' }).createIndex('byDate', 'date');
        db.createObjectStore('journalEntries', { keyPath: 'date' });
        db.createObjectStore('journalPhotos', { keyPath: 'date' });
        db.createObjectStore('workoutConfig', { keyPath: 'id' });
        db.createObjectStore('workoutDays', { keyPath: 'id' });
        db.createObjectStore('workoutSessions', { keyPath: 'id' }).createIndex('byDate', 'date');
        db.createObjectStore('exerciseLogs', { keyPath: 'id' }).createIndex('bySession', 'sessionId');
        db.createObjectStore('catchUps', { keyPath: 'id' }).createIndex('byOrigin', 'originLogId', { unique: true });
      }
      if (oldVersion < 2) {
        tx.objectStore('exerciseLogs').createIndex('byExercise', 'exerciseId');
        tx.objectStore('catchUps').createIndex('byDue', 'dueDate');
      }
    },
  });
}
