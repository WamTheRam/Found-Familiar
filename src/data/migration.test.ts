import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { openFamiliarDb } from './db';

describe('database upgrade v1 -> v2', () => {
  it('keeps existing tasks and adds the new indexes', async () => {
    const name = 'migration-test';
    const v1 = await openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore('tasks', { keyPath: 'id' }).createIndex('byDate', 'date');
        db.createObjectStore('journalEntries', { keyPath: 'date' });
        db.createObjectStore('journalPhotos', { keyPath: 'date' });
        db.createObjectStore('workoutConfig', { keyPath: 'id' });
        db.createObjectStore('workoutDays', { keyPath: 'id' });
        db.createObjectStore('workoutSessions', { keyPath: 'id' }).createIndex('byDate', 'date');
        db.createObjectStore('exerciseLogs', { keyPath: 'id' }).createIndex('bySession', 'sessionId');
        db.createObjectStore('catchUps', { keyPath: 'id' }).createIndex('byOrigin', 'originLogId', { unique: true });
      },
    });
    await v1.put('tasks', { id: 't1', title: 'Old task', date: '2026-10-14', status: 'todo', createdAt: 1, updatedAt: 1 });
    v1.close();

    const v2 = await openFamiliarDb(name);
    expect(await v2.get('tasks', 't1')).toMatchObject({ title: 'Old task' });
    const logs = v2.transaction('exerciseLogs').store;
    const catchUps = v2.transaction('catchUps').store;
    expect(Array.from(logs.indexNames)).toContain('byExercise');
    expect(Array.from(catchUps.indexNames)).toContain('byDue');
  });
});
