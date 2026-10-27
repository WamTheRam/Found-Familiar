import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { createIndexedDbRepository } from './repository';

const task = (over: Partial<Task> = {}): Task => ({
  id: 'a', title: 'Book a campsite', date: '2026-10-14', status: 'todo', createdAt: 1, updatedAt: 1, ...over,
});

describe('IndexedDB repository', () => {
  it('creates every store on first open', async () => {
    const repo = createIndexedDbRepository('test-db-health');
    const { stores } = await repo.health();
    expect(stores).toEqual(expect.arrayContaining([
      'tasks', 'journalEntries', 'journalPhotos', 'workoutConfig',
      'workoutDays', 'workoutSessions', 'exerciseLogs', 'catchUps',
    ]));
  });

  it('saves, updates and deletes tasks', async () => {
    const repo = createIndexedDbRepository('test-db-tasks');
    await repo.saveTask(task());
    await repo.saveTask(task({ id: 'b', title: 'Pick up groceries' }));
    await repo.saveTask(task({ status: 'done', updatedAt: 2 }));
    const all = await repo.listTasks();
    expect(all).toHaveLength(2);
    expect(all.find((t) => t.id === 'a')?.status).toBe('done');
    await repo.deleteTask('a');
    expect((await repo.listTasks()).map((t) => t.id)).toEqual(['b']);
  });

  it('keeps tasks when the app is reopened (new repository instance)', async () => {
    await createIndexedDbRepository('test-db-reopen').saveTask(task({ id: 'keep', status: 'working' }));
    const reopened = await createIndexedDbRepository('test-db-reopen').listTasks();
    expect(reopened).toEqual([expect.objectContaining({ id: 'keep', status: 'working' })]);
  });
});
