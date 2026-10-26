import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { JournalEntry, JournalPhoto, Task } from '../types';

/*
 * Database schema, version 1. Workout stores are created now so later stages
 * only add repository code; their record types arrive in Stage 3.
 * To change the schema later, bump DB_VERSION and add an `if (oldVersion < N)` block.
 */
export const DB_NAME = 'found-familiar';
export const DB_VERSION = 1;

export interface FamiliarDB extends DBSchema {
  tasks: { key: string; value: Task; indexes: { byDate: string } };
  journalEntries: { key: string; value: JournalEntry };
  journalPhotos: { key: string; value: JournalPhoto };
  workoutConfig: { key: string; value: unknown };
  workoutDays: { key: string; value: unknown };
  workoutSessions: { key: string; value: unknown; indexes: { byDate: string } };
  exerciseLogs: { key: string; value: unknown; indexes: { bySession: string } };
  catchUps: { key: string; value: unknown; indexes: { byOrigin: string } };
}

export type Db = IDBPDatabase<FamiliarDB>;

export function openFamiliarDb(name: string = DB_NAME): Promise<Db> {
  return openDB<FamiliarDB>(name, DB_VERSION, {
    upgrade(db, oldVersion) {
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
    },
  });
}
