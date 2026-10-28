import { describe, expect, it } from 'vitest';
import { excerpt, isEntryEmpty } from './journal';

describe('journal helpers', () => {
  it('treats entries with nothing in them as empty', () => {
    expect(isEntryEmpty({ mood: null, title: ' ', text: '\n', }, false)).toBe(true);
    expect(isEntryEmpty({ mood: 3, title: '', text: '' }, false)).toBe(false);
    expect(isEntryEmpty({ mood: null, title: '', text: '' }, true)).toBe(false);
  });
  it('shortens long text without cutting the start', () => {
    expect(excerpt('Short note')).toBe('Short note');
    const long = 'word '.repeat(100);
    const e = excerpt(long, 50);
    expect(e.length).toBeLessThanOrEqual(50);
    expect(e.endsWith('…')).toBe(true);
  });
});
