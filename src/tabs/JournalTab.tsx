import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { formatLong } from '../lib/dates';
import { PhotoError, prepareJournalPhoto } from '../lib/image';
import { formatSavedTime, isEntryEmpty, type Draft } from '../lib/journal';
import { MOODS, moodFor, readableTextOn } from '../lib/mood';
import { useApp } from '../state';
import type { DateStr } from '../types';

/**
 * One editor per date (keyed by date in JournalTab). Everything it writes uses the
 * date it was created for, so switching days can never save into another day's entry.
 */
function JournalEditor({ date }: { date: DateStr }) {
  const { journal, repo, saveJournal, deleteJournal, setJournalPhoto, removeJournalPhoto } = useApp();
  const entry = journal[date];
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [title, setTitle] = useState(entry?.title ?? '');
  const [text, setText] = useState(entry?.text ?? '');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBroken, setPhotoBroken] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const draft = useRef<Draft>({ mood, title, text });
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const urlRef = useRef<string | null>(null);
  const alive = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const showBlob = useCallback((blob: Blob | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = blob ? URL.createObjectURL(blob) : null;
    setPhotoUrl(urlRef.current);
    setPhotoBroken(false);
  }, []);

  /** Saves the latest draft. Saves are queued, so they always land in order. */
  const persist = useCallback(() => {
    dirty.current = false;
    window.clearTimeout(timer.current);
    queue.current = queue.current.then(async () => {
      const d = draft.current;
      try {
        const photo = await repo.getJournalPhoto(date); // the database, not the screen, says whether a photo exists
        if (isEntryEmpty(d, !!photo)) await deleteJournal(date);
        else await saveJournal({ date, mood: d.mood, title: d.title, text: d.text, updatedAt: Date.now() });
        if (alive.current) setSaveError(null);
      } catch {
        if (alive.current) setSaveError('Could not save. Your browser may be blocking local storage.');
      }
    });
  }, [date, repo, saveJournal, deleteJournal]);

  const change = (patch: Partial<Draft>, immediate = false) => {
    draft.current = { ...draft.current, ...patch };
    dirty.current = true;
    window.clearTimeout(timer.current);
    if (immediate) persist();
    else timer.current = window.setTimeout(persist, 700);
  };

  // Save anything pending if the screen is left, the date changes, or the page is hidden/closed.
  useEffect(() => {
    alive.current = true;
    const flush = () => { if (dirty.current) persist(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
      alive.current = false;
    };
  }, [persist]);

  useEffect(() => {
    let cancelled = false;
    repo.getJournalPhoto(date)
      .then((p) => { if (!cancelled && p) showBlob(p.blob); })
      .catch(() => { if (!cancelled) setPhotoError('Could not load this day’s photo.'); });
    return () => {
      cancelled = true;
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
    };
  }, [repo, date, showBlob]);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const { blob, thumb } = await prepareJournalPhoto(file);
      await setJournalPhoto({ date, blob, thumb, updatedAt: Date.now() });
      if (alive.current) showBlob(blob);
    } catch (err) {
      if (alive.current) setPhotoError(err instanceof PhotoError ? err.message : 'Could not save that picture. Your browser may be blocking local storage.');
    } finally {
      if (alive.current) setPhotoBusy(false);
    }
  }

  async function onRemovePhoto() {
    setPhotoError(null);
    try {
      await removeJournalPhoto(date);
      showBlob(null);
      persist(); // drops the entry if nothing else is left in it
    } catch {
      setPhotoError('Could not remove the photo. Please try again.');
    }
  }

  function onDelete() {
    window.clearTimeout(timer.current);
    dirty.current = false;
    setConfirmDelete(false);
    queue.current = queue.current.then(async () => {
      try {
        await deleteJournal(date);
        draft.current = { mood: null, title: '', text: '' };
        if (alive.current) { setMood(null); setTitle(''); setText(''); showBlob(null); setPhotoError(null); setSaveError(null); }
      } catch {
        if (alive.current) setSaveError('Could not delete the entry. Please try again.');
      }
    });
  }

  const current = moodFor(mood);
  const hasPhoto = photoUrl !== null;
  const hasContent = !!entry || !isEntryEmpty({ mood, title, text }, hasPhoto);

  return (
    <>
      <section className="card" aria-label="Mood">
        <div className="card-head">
          <span className="card-title">How are you feeling?</span>
          <span className="mood-badge" style={current ? { background: current.color, color: readableTextOn(current.color) } : undefined}>
            {current ? `${current.value} / 10 · ${current.label}` : 'Not set'}
          </span>
        </div>
        <div className="mood-row" role="radiogroup" aria-label="Mood from 1 (very low) to 10 (excellent)">
          {MOODS.map((m) => (
            <button key={m.value} type="button" role="radio" aria-checked={mood === m.value}
              aria-label={`${m.value}, ${m.label}`} className={`mood-btn${mood === m.value ? ' is-on' : ''}`}
              style={{ background: m.color, color: readableTextOn(m.color) }}
              onClick={() => { setMood(m.value); change({ mood: m.value }, true); }}>
              {mood === m.value ? '✓' : m.value}
            </button>
          ))}
        </div>
        <div className="mood-ends">
          <span>1 · Very low</span>
          {mood !== null && <button type="button" className="link-btn" onClick={() => { setMood(null); change({ mood: null }, true); }}>Clear</button>}
          <span>10 · Excellent</span>
        </div>
      </section>

      <section className="card" aria-label="Photo of the day">
        <div className="card-head">
          <span className="eyebrow">Today’s photo</span>
          <button type="button" className="btn btn-sm" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
            {photoBusy ? 'Saving…' : hasPhoto ? 'Change photo' : 'Add photo'}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        {hasPhoto && !photoBroken && (
          <img className="photo" src={photoUrl!} alt={`Photo for ${formatLong(date)}`} onError={() => setPhotoBroken(true)} />
        )}
        {hasPhoto && photoBroken && <p className="empty-text">This photo can’t be displayed. You can replace or remove it.</p>}
        {!hasPhoto && <p className="muted small">No photo yet. One photo per day.</p>}
        {photoError && <p className="form-error" role="alert">{photoError}</p>}
        <div className="btn-row">
          <p className="small muted photo-note">Also shown in the month’s Journal view. Photos are stored only on this device.</p>
          {hasPhoto && <button type="button" className="btn btn-sm btn-quiet-danger" onClick={onRemovePhoto}>Remove photo</button>}
        </div>
      </section>

      <section className="card" aria-label="Journal entry">
        <div className="card-head">
          <span className="eyebrow">{formatLong(date)}</span>
        </div>
        <input className="j-title" aria-label="Entry title" placeholder="Give today a title" value={title} maxLength={80}
          onChange={(e) => { setTitle(e.target.value); change({ title: e.target.value }); }}
          onBlur={() => { if (dirty.current) persist(); }} />
        <textarea className="j-text" aria-label="Journal entry" placeholder="What stood out today?" rows={7} value={text}
          onChange={(e) => { setText(e.target.value); change({ text: e.target.value }); }}
          onBlur={() => { if (dirty.current) persist(); }} />
        {saveError && <p className="form-error" role="alert">{saveError}</p>}
        <div className="btn-row j-foot">
          <span className="small muted">{entry ? `Last saved at ${formatSavedTime(entry.updatedAt)}` : 'Saves automatically'}</span>
          <span className="spacer" />
          {hasContent && !confirmDelete && (
            <button type="button" className="btn btn-sm btn-quiet-danger" onClick={() => setConfirmDelete(true)}>Delete entry</button>
          )}
        </div>
        {confirmDelete && (
          <div className="confirm" role="alertdialog" aria-label="Confirm delete">
            <p>Delete this day’s mood, text and photo? This cannot be undone.</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>Keep entry</button>
              <button type="button" className="btn btn-danger" onClick={onDelete}>Delete entry</button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export function JournalTab() {
  const { selectedDate, journalReady, journalError } = useApp();
  return (
    <div className="panel">
      <h2 className="panel-title">A moment to reflect</h2>
      <p className="panel-sub">No perfect words needed. Just yours.</p>
      {journalError && <p className="form-error" role="alert">{journalError}</p>}
      {!journalReady && !journalError && <p className="muted">Opening your journal…</p>}
      {journalReady && <JournalEditor key={selectedDate} date={selectedDate} />}
    </div>
  );
}
