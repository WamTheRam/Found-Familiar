import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { JournalEntry, JournalPhoto } from '../types';
import { createIndexedDbRepository } from './repository';

const entry = (date: string, over: Partial<JournalEntry> = {}): JournalEntry =>
  ({ date, mood: 8, title: 'Finding my own pace', text: 'Long way home.', updatedAt: 1, ...over });
const photo = (date: string, bytes = 'abc'): JournalPhoto =>
  ({ date, blob: new Blob([bytes], { type: 'image/jpeg' }), thumb: new Blob([bytes], { type: 'image/jpeg' }), updatedAt: 1 });
const textOf = (b: Blob) => b.text();

describe('journal repository', () => {
  it('stores one entry per date and keeps entries separate', async () => {
    const repo = createIndexedDbRepository('j-entries');
    await repo.saveJournalEntry(entry('2026-10-13', { mood: 4, text: 'Tired.' }));
    await repo.saveJournalEntry(entry('2026-10-14'));
    await repo.saveJournalEntry(entry('2026-10-14', { mood: 9, text: 'Better.' })); // update, not duplicate
    const all = (await repo.listJournalEntries()).sort((a, b) => a.date.localeCompare(b.date));
    expect(all.map((e) => [e.date, e.mood, e.text])).toEqual([['2026-10-13', 4, 'Tired.'], ['2026-10-14', 9, 'Better.']]);
  });

  it('persists entries and photos across a reload (new connection)', async () => {
    const first = createIndexedDbRepository('j-reload');
    await first.saveJournalEntry(entry('2026-10-14'));
    await first.saveJournalPhoto(photo('2026-10-14', 'pixels'));
    const reopened = createIndexedDbRepository('j-reload');
    expect((await reopened.listJournalEntries())[0].mood).toBe(8);
    const p = await reopened.getJournalPhoto('2026-10-14');
    expect(p?.date).toBe('2026-10-14');
    expect(await textOf(p!.blob)).toBe('pixels');
  });

  it('creates a blank entry when a photo is added first, without touching an existing entry', async () => {
    const repo = createIndexedDbRepository('j-photo-first');
    const created = await repo.saveJournalPhoto(photo('2026-10-15'));
    expect(created).toMatchObject({ date: '2026-10-15', mood: null, text: '' });
    await repo.saveJournalEntry(entry('2026-10-16', { text: 'Keep me' }));
    await repo.saveJournalPhoto(photo('2026-10-16'));
    expect((await repo.listJournalEntries()).find((e) => e.date === '2026-10-16')?.text).toBe('Keep me');
  });

  it('replaces a photo for the same date only', async () => {
    const repo = createIndexedDbRepository('j-replace');
    await repo.saveJournalPhoto(photo('2026-10-14', 'old'));
    await repo.saveJournalPhoto(photo('2026-10-15', 'other'));
    await repo.saveJournalPhoto(photo('2026-10-14', 'new'));
    expect(await textOf((await repo.getJournalPhoto('2026-10-14'))!.blob)).toBe('new');
    expect(await textOf((await repo.getJournalPhoto('2026-10-15'))!.blob)).toBe('other');
  });

  it('removing a photo keeps the entry; deleting the entry removes both', async () => {
    const repo = createIndexedDbRepository('j-delete');
    await repo.saveJournalEntry(entry('2026-10-14'));
    await repo.saveJournalPhoto(photo('2026-10-14'));
    await repo.saveJournalEntry(entry('2026-10-15'));
    await repo.saveJournalPhoto(photo('2026-10-15'));

    await repo.deleteJournalPhoto('2026-10-14');
    expect(await repo.getJournalPhoto('2026-10-14')).toBeUndefined();
    expect((await repo.listJournalEntries()).map((e) => e.date)).toContain('2026-10-14');

    await repo.deleteJournalEntry('2026-10-15');
    expect(await repo.getJournalPhoto('2026-10-15')).toBeUndefined();
    expect((await repo.listJournalEntries()).map((e) => e.date)).toEqual(['2026-10-14']);
  });

  it('lists photos for a date range, including month and year boundaries', async () => {
    const repo = createIndexedDbRepository('j-range');
    for (const d of ['2026-09-30', '2026-10-01', '2026-10-31', '2026-11-01', '2027-01-01']) await repo.saveJournalPhoto(photo(d));
    expect((await repo.listJournalPhotos('2026-09-28', '2026-11-01')).map((p) => p.date)).toEqual(['2026-09-30', '2026-10-01', '2026-10-31', '2026-11-01']);
    expect((await repo.listJournalPhotos('2026-12-28', '2027-01-03')).map((p) => p.date)).toEqual(['2027-01-01']);
  });
});
