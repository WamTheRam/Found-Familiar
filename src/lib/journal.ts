export interface Draft { mood: number | null; title: string; text: string }

/** An entry with no mood, title, text or photo is not worth keeping. */
export const isEntryEmpty = (d: Draft, hasPhoto: boolean) =>
  d.mood === null && !d.title.trim() && !d.text.trim() && !hasPhoto;

export function excerpt(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export const formatSavedTime = (ts: number) =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
