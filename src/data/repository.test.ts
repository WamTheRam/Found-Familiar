import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createIndexedDbRepository } from './repository';

describe('IndexedDB repository', () => {
  it('creates every store on first open', async () => {
    const repo = createIndexedDbRepository('test-db-health');
    const { stores } = await repo.health();
    expect(stores).toEqual(expect.arrayContaining([
      'tasks', 'journalEntries', 'journalPhotos', 'workoutConfig',
      'workoutDays', 'workoutSessions', 'exerciseLogs', 'catchUps',
    ]));
  });
});
