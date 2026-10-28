import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { excerpt } from '../lib/journal';
import { formatLong, isSameMonth, monthGrid, parseDateStr, todayStr } from '../lib/dates';
import { MOODS, moodFor, readableTextOn } from '../lib/mood';
import { useApp } from '../state';
import type { DateStr } from '../types';

/** Object URLs for the thumbnails of every photo between two dates. Revoked when replaced or unmounted. */
function useThumbs(from: DateStr, to: DateStr): Record<DateStr, string> {
  const { repo, photoRev } = useApp();
  const [urls, setUrls] = useState<Record<DateStr, string>>({});
  const created = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    repo.listJournalPhotos(from, to)
      .then((photos) => {
        if (cancelled) return;
        const next: Record<DateStr, string> = {};
        const fresh: string[] = [];
        for (const p of photos) {
          const u = URL.createObjectURL(p.thumb ?? p.blob);
          fresh.push(u);
          next[p.date] = u;
        }
        created.current.forEach((u) => URL.revokeObjectURL(u));
        created.current = fresh;
        setUrls(next);
      })
      .catch(() => { if (!cancelled) setUrls({}); });
    return () => { cancelled = true; };
  }, [repo, from, to, photoRev]);

  useEffect(() => () => { created.current.forEach((u) => URL.revokeObjectURL(u)); }, []);
  return urls;
}

export function JournalMonthGrid() {
  const { selectedDate, setSelectedDate, journal } = useApp();
  const days = monthGrid(selectedDate).flat();
  const thumbs = useThumbs(days[0], days[days.length - 1]);
  const [broken, setBroken] = useState<Record<DateStr, boolean>>({});
  const today = todayStr();

  return (
    <div className="month-grid jgrid">
      {days.map((d) => {
        const entry = journal[d];
        const mood = moodFor(entry?.mood);
        const thumb = thumbs[d] && !broken[d] ? thumbs[d] : null;
        const style: CSSProperties | undefined = mood ? { background: mood.color, color: readableTextOn(mood.color) } : undefined;
        const label = `${formatLong(d)}: ${
          entry ? `${mood ? `mood ${mood.value} of 10, ${mood.label}` : 'no mood'}${thumb ? ', has photo' : ''}` : 'no entry'}`;
        return (
          <button key={d} type="button" style={style} aria-label={label} aria-pressed={d === selectedDate}
            className={`jday${entry ? (mood ? ' has-mood' : ' has-entry') : ' is-empty'}${d === selectedDate ? ' is-selected' : ''}${d === today ? ' is-today' : ''}${isSameMonth(d, selectedDate) ? '' : ' is-muted'}`}
            onClick={() => setSelectedDate(d)}>
            <span className="jnum">{parseDateStr(d).d}</span>
            {thumb
              ? <img src={thumb} alt="" className="jthumb" onError={() => setBroken((b) => ({ ...b, [d]: true }))} />
              : <span className="jfill" aria-hidden="true">{entry ? '•' : '–'}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function MoodLegend() {
  return (
    <div className="legend" aria-label="Mood colours">
      <div className="legend-row">
        {MOODS.map((m) => (
          <span key={m.value} className="swatch" style={{ background: m.color, color: readableTextOn(m.color) }} title={`${m.value} · ${m.label}`}>{m.value}</span>
        ))}
      </div>
      <div className="legend-ends"><span>1 · Very low</span><span>10 · Excellent</span></div>
      <p className="legend-note"><span className="swatch swatch-empty">–</span> no entry · <span className="swatch swatch-entry">•</span> entry without a mood</p>
    </div>
  );
}

export function JournalSummary() {
  const { selectedDate, journal, setTab, setMonthOpen } = useApp();
  const entry = journal[selectedDate];
  const mood = moodFor(entry?.mood);
  const thumb = useThumbs(selectedDate, selectedDate)[selectedDate];
  const open = () => { setTab('journal'); setMonthOpen(false); };

  return (
    <div className="jsummary" aria-live="polite">
      {thumb && <img src={thumb} alt="" className="jsum-thumb" />}
      <div className="jsum-body">
        <span className="eyebrow">{formatLong(selectedDate)}</span>
        {entry ? (
          <>
            <strong className="jsum-title">{entry.title?.trim() || 'Untitled'}</strong>
            <span className="muted">{mood ? `${mood.value} / 10 · ${mood.label}` : 'No mood chosen'}</span>
            {entry.text.trim() && <p className="jsum-text">{excerpt(entry.text)}</p>}
          </>
        ) : (
          <span className="muted">No journal entry for this day.</span>
        )}
        <button type="button" className="link-btn" onClick={open}>{entry ? 'Open entry' : 'Write an entry'}</button>
      </div>
    </div>
  );
}
