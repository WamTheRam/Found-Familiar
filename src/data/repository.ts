import type { Task } from '../types';
import { openFamiliarDb, type Db } from './db';

export interface TaskRepository {
  listTasks(): Promise<Task[]>;
  /** Insert or update by id. */
  saveTask(task: Task): Promise<void>;
  deleteTask(id: string): Promise<void>;
}

/*
 * The UI only talks to this interface. Later stages add WorkoutRepository and
 * JournalRepository. A native (Capacitor) implementation can replace the
 * IndexedDB one without touching the UI.
 */
export interface AppRepository extends TaskRepository {
  /** Opens storage and reports which stores exist. Used as a startup check. */
  health(): Promise<{ ok: true; stores: string[] }>;
}

export function createIndexedDbRepository(name?: string): AppRepository {
  let dbPromise: Promise<Db> | undefined;
  const db = () => (dbPromise ??= openFamiliarDb(name));
  return {
    async health() {
      const d = await db();
      return { ok: true, stores: Array.from(d.objectStoreNames) };
    },
    async listTasks() {
      return (await db()).getAll('tasks');
    },
    async saveTask(task) {
      await (await db()).put('tasks', task);
    },
    async deleteTask(id) {
      await (await db()).delete('tasks', id);
    },
  };
}
