import { openFamiliarDb, type Db } from './db';

/*
 * The UI only talks to this interface. Stage 2+ adds TaskRepository,
 * WorkoutRepository and JournalRepository members here. A native (Capacitor)
 * implementation can later replace the IndexedDB one without touching the UI.
 */
export interface AppRepository {
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
  };
}
