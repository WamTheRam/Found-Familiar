import { useRef, useState } from 'react';
import { formatShort } from '../lib/dates';
import { canComplete, formatSet, isValidReps, isValidWeight } from '../lib/sets';
import type { SetLog } from '../types';
import type { Reference } from '../lib/workoutService';

export type CardStatus = 'pending' | 'completed' | 'skipped';
type Row = { w: string; r: string };

interface Props {
  name: string;
  detail: string;
  notes?: string;
  badge?: string;
  status: CardStatus;
  initialSets: SetLog[];
  plannedSets: number;
  reference: Reference | null;
  onSave: (sets: SetLog[], status: CardStatus) => Promise<void>;
}

const blank = (): Row => ({ w: '', r: '' });
const toRows = (sets: SetLog[], planned: number): Row[] =>
  sets.length
    ? sets.map((s) => ({ w: s.weightKg === null ? '' : String(s.weightKg), r: s.reps === null ? '' : String(s.reps) }))
    : Array.from({ length: Math.max(planned, 1) }, blank);

function parseRows(rows: Row[]): { sets?: SetLog[]; error?: string } {
  const sets: SetLog[] = [];
  for (let i = 0; i < rows.length; i++) {
    const w = rows[i].w.trim().replace(',', '.');
    const r = rows[i].r.trim();
    const weightKg = w === '' ? null : Number(w);
    const reps = r === '' ? null : Number(r);
    if (weightKg !== null && !isValidWeight(weightKg)) return { error: `Set ${i + 1}: weight must be in kg, in steps of 0.5.` };
    if (reps !== null && !isValidReps(reps)) return { error: `Set ${i + 1}: reps must be a whole number.` };
    sets.push({ weightKg, reps });
  }
  return { sets };
}

export function SetsCard({ name, detail, notes, badge, status, initialSets, plannedSets, reference, onSave }: Props) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initialSets, plannedSets));
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(JSON.stringify(rows));
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  /** Saves are queued so a blur-save and a button press can never land out of order. */
  function save(next: CardStatus, useRows: Row[] = rows) {
    const parsed = parseRows(useRows);
    if (!parsed.sets) { setError(parsed.error ?? 'Check the values.'); return; }
    if (next === 'completed' && !canComplete(parsed.sets)) {
      setError('Enter weight and reps for at least one set first.');
      return;
    }
    const sets = parsed.sets;
    setError(null);
    queue.current = queue.current.then(async () => {
      try { await onSave(sets, next); saved.current = JSON.stringify(useRows); }
      catch { setError('Could not save. Your browser may be blocking local storage.'); }
    });
  }

  const setCell = (i: number, key: 'w' | 'r', value: string) =>
    setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  const onBlur = () => { if (JSON.stringify(rows) !== saved.current) save(status); };
  const removeSet = () => {
    if (rows.length <= 1) return;
    const next = rows.slice(0, -1);
    setRows(next);
    if (JSON.stringify(next) !== saved.current) save(status, next);
  };

  const refSets = reference?.sets.map(formatSet).filter((s): s is string => s !== null) ?? [];

  return (
    <li className={`ex-card is-${status}`}>
      <div className="ex-head">
        <div>
          <h4 className="ex-name">{name}</h4>
          <p className="ex-detail">{detail}</p>
        </div>
        <div className="ex-tags">
          {badge && <span className="badge">{badge}</span>}
          {status !== 'pending' && <span className={`pill pill-${status}`}>{status === 'completed' ? 'Completed' : 'Skipped'}</span>}
        </div>
      </div>
      {notes && <p className="ex-notes">{notes}</p>}

      <p className="ref">
        {reference
          ? <>Last time · {formatShort(reference.date)}: {refSets.length ? refSets.join(' · ') : '—'}</>
          : 'No previous completed session yet.'}
      </p>

      <div className="set-grid">
        <span className="set-h">Set</span><span className="set-h">Weight (kg)</span><span className="set-h">Reps</span>
        {rows.map((row, i) => (
          <div className="set-row" key={i}>
            <span className="set-n">{i + 1}</span>
            <input type="number" inputMode="decimal" step={0.5} min={0} value={row.w}
              placeholder={reference?.sets[i]?.weightKg != null ? String(reference.sets[i].weightKg) : ''}
              aria-label={`${name}, set ${i + 1} weight in kilograms`}
              onChange={(e) => setCell(i, 'w', e.target.value)} onBlur={onBlur} />
            <input type="number" inputMode="numeric" step={1} min={0} value={row.r}
              placeholder={reference?.sets[i]?.reps != null ? String(reference.sets[i].reps) : ''}
              aria-label={`${name}, set ${i + 1} repetitions`}
              onChange={(e) => setCell(i, 'r', e.target.value)} onBlur={onBlur} />
          </div>
        ))}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="btn-row ex-actions">
        <button type="button" className="btn btn-sm" onClick={() => setRows((p) => [...p, blank()])}>+ Set</button>
        <button type="button" className="btn btn-sm" onClick={removeSet} disabled={rows.length <= 1}>− Set</button>
        <span className="spacer" />
        {status === 'pending' ? (
          <>
            <button type="button" className="btn btn-sm" onClick={() => save('skipped')}>Skip</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => save('completed')}>Complete</button>
          </>
        ) : (
          <button type="button" className="btn btn-sm" onClick={() => save('pending')}>Reopen</button>
        )}
      </div>
    </li>
  );
}
