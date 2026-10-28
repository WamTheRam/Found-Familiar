import { useEffect, useRef, useState } from 'react';
import { anchorForWeekNumber, weekNumberFor } from '../lib/cycle';
import { todayStr } from '../lib/dates';
import { newId } from '../lib/id';
import { WEEKDAY_FULL } from '../lib/tasks';
import { useApp } from '../state';
import type { ExerciseDef, WorkoutDay, WorkoutPlan } from '../types';

interface Props {
  plan: WorkoutPlan | null;
  days: WorkoutDay[]; // every day, including archived ones
  onClose: () => void;
  onSaved: () => void;
}

const cloneDay = (d: WorkoutDay): WorkoutDay => ({ ...d, exercises: d.exercises.map((e) => ({ ...e })) });

export function SplitEditor({ plan, days, onClose, onSaved }: Props) {
  const { repo } = useApp();
  const today = todayStr();
  const ref = useRef<HTMLDialogElement>(null);
  const [cycleWeeks, setCycleWeeks] = useState<1 | 2>(plan?.cycleWeeks ?? 1);
  const [thisWeek, setThisWeek] = useState<number>(plan ? weekNumberFor(plan, today) : 1);
  const [slots, setSlots] = useState<(string | null)[]>(() => (plan ? [...plan.slots] : Array.from({ length: 7 }, () => null)));
  const [draft, setDraft] = useState<WorkoutDay[]>(() => days.filter((d) => !d.archived).map(cloneDay));
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);

  function changeCycle(n: 1 | 2) {
    setCycleWeeks(n);
    setSlots((prev) => (n === 1 ? prev.slice(0, 7) : [...prev, ...Array.from({ length: 14 - prev.length }, () => null)]));
  }
  const patchDay = (id: string, patch: Partial<WorkoutDay>) =>
    setDraft((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const patchEx = (dayId: string, exId: string, patch: Partial<ExerciseDef>) =>
    setDraft((p) => p.map((d) => (d.id !== dayId ? d : { ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) })));
  const addEx = (dayId: string) =>
    setDraft((p) => p.map((d) => (d.id !== dayId ? d : { ...d, exercises: [...d.exercises, { id: newId(), name: '', sets: 3, targetReps: 10 }] })));
  const removeEx = (dayId: string, exId: string) =>
    setDraft((p) => p.map((d) => (d.id !== dayId ? d : { ...d, exercises: d.exercises.filter((e) => e.id !== exId) })));
  const moveEx = (dayId: string, i: number, dir: -1 | 1) =>
    setDraft((p) => p.map((d) => {
      if (d.id !== dayId) return d;
      const ex = [...d.exercises];
      const j = i + dir;
      if (j < 0 || j >= ex.length) return d;
      [ex[i], ex[j]] = [ex[j], ex[i]];
      return { ...d, exercises: ex };
    }));
  function removeDay(id: string) {
    setDraft((p) => p.filter((d) => d.id !== id));
    setSlots((p) => p.map((s) => (s === id ? null : s)));
    setConfirmRemove(null);
  }

  async function save() {
    for (const d of draft) {
      if (!d.name.trim()) { setError('Every workout day needs a name.'); return; }
      for (const e of d.exercises) {
        if (!e.name.trim()) { setError(`Every exercise in “${d.name}” needs a name.`); return; }
        if (!Number.isInteger(e.sets) || e.sets < 1 || e.sets > 20) { setError(`“${e.name}”: sets must be 1–20.`); return; }
        if (!Number.isInteger(e.targetReps) || e.targetReps < 1 || e.targetReps > 100) { setError(`“${e.name}”: reps must be 1–100.`); return; }
      }
    }
    const ids = new Set(draft.map((d) => d.id));
    const cleaned: WorkoutDay[] = draft.map((d) => ({
      ...d,
      name: d.name.trim(),
      focus: d.focus?.trim() || undefined,
      exercises: d.exercises.map((e) => ({ ...e, name: e.name.trim(), notes: e.notes?.trim() || undefined })),
    }));
    // Removed days are archived, not deleted, so past sessions still make sense.
    const archived = days.filter((d) => !d.archived && !ids.has(d.id)).map((d) => ({ ...d, archived: true }));
    const nextPlan: WorkoutPlan = {
      id: 'plan',
      cycleWeeks,
      anchorDate: anchorForWeekNumber(today, cycleWeeks === 2 ? thisWeek : 1),
      slots: Array.from({ length: cycleWeeks * 7 }, (_, i) => (slots[i] && ids.has(slots[i]!) ? slots[i] : null)),
      updatedAt: Date.now(),
    };
    setBusy(true);
    try { await repo.saveSplit(nextPlan, [...cleaned, ...archived]); onSaved(); }
    catch { setError('Could not save your split. Your browser may be blocking local storage.'); setBusy(false); }
  }

  return (
    <dialog ref={ref} className="sheet sheet-wide" aria-labelledby="split-title" onClose={onClose}>
      <div className="sheet-body">
        <h2 id="split-title" className="sheet-title">Edit your split</h2>
        <div className="sheet-scroll">
          <section className="editor-block">
            <h3>Cycle</h3>
            <div className="seg" role="group" aria-label="Cycle length">
              <button type="button" aria-pressed={cycleWeeks === 1} className={cycleWeeks === 1 ? 'is-on' : ''} onClick={() => changeCycle(1)}>Weekly</button>
              <button type="button" aria-pressed={cycleWeeks === 2} className={cycleWeeks === 2 ? 'is-on' : ''} onClick={() => changeCycle(2)}>Fortnightly</button>
            </div>
            {cycleWeeks === 2 && (
              <div className="field">This week is
                <div className="seg" role="group" aria-label="Which week of the cycle this is">
                  {[1, 2].map((n) => (
                    <button key={n} type="button" aria-pressed={thisWeek === n} className={thisWeek === n ? 'is-on' : ''} onClick={() => setThisWeek(n)}>Week {n}</button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="editor-block">
            <h3>Workout days</h3>
            {draft.length === 0 && <p className="muted">No workout days yet. Add one, such as Push, Pull or Legs.</p>}
            {draft.map((d) => (
              <fieldset key={d.id} className="day-box">
                <legend>{d.name || 'New workout day'}</legend>
                <div className="field-row">
                  <label className="field">Name
                    <input value={d.name} maxLength={24} onChange={(e) => patchDay(d.id, { name: e.target.value })} />
                  </label>
                  <label className="field">Focus (optional)
                    <input value={d.focus ?? ''} maxLength={40} placeholder="back & biceps" onChange={(e) => patchDay(d.id, { focus: e.target.value })} />
                  </label>
                </div>
                {d.exercises.map((ex, i) => (
                  <div key={ex.id} className="ex-edit">
                    <input aria-label="Exercise name" placeholder="Exercise name" value={ex.name} maxLength={50}
                      onChange={(e) => patchEx(d.id, ex.id, { name: e.target.value })} />
                    <div className="ex-edit-nums">
                      <label>Sets
                        <input type="number" inputMode="numeric" min={1} max={20} value={ex.sets}
                          onChange={(e) => patchEx(d.id, ex.id, { sets: Number(e.target.value) })} />
                      </label>
                      <label>Target reps
                        <input type="number" inputMode="numeric" min={1} max={100} value={ex.targetReps}
                          onChange={(e) => patchEx(d.id, ex.id, { targetReps: Number(e.target.value) })} />
                      </label>
                    </div>
                    <input aria-label="Notes (optional)" placeholder="Notes (optional), e.g. per hand" value={ex.notes ?? ''} maxLength={80}
                      onChange={(e) => patchEx(d.id, ex.id, { notes: e.target.value })} />
                    <div className="btn-row">
                      <button type="button" className="btn btn-sm" disabled={i === 0} aria-label={`Move ${ex.name || 'exercise'} up`} onClick={() => moveEx(d.id, i, -1)}>↑ Up</button>
                      <button type="button" className="btn btn-sm" disabled={i === d.exercises.length - 1} aria-label={`Move ${ex.name || 'exercise'} down`} onClick={() => moveEx(d.id, i, 1)}>↓ Down</button>
                      <span className="spacer" />
                      <button type="button" className="btn btn-sm btn-quiet-danger" onClick={() => removeEx(d.id, ex.id)}>Remove</button>
                    </div>
                  </div>
                ))}
                <div className="btn-row">
                  <button type="button" className="btn btn-sm" onClick={() => addEx(d.id)}>+ Add exercise</button>
                  <span className="spacer" />
                  {confirmRemove === d.id ? (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => setConfirmRemove(null)}>Keep</button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => removeDay(d.id)}>Remove day</button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-sm btn-quiet-danger" onClick={() => setConfirmRemove(d.id)}>Remove day</button>
                  )}
                </div>
                {confirmRemove === d.id && <p className="hint-left">Its schedule slots become rest days. Past sessions keep their records.</p>}
              </fieldset>
            ))}
            <button type="button" className="btn" onClick={() => setDraft((p) => [...p, { id: newId(), name: '', exercises: [] }])}>+ Add workout day</button>
          </section>

          <section className="editor-block">
            <h3>Schedule</h3>
            {Array.from({ length: cycleWeeks }, (_, w) => (
              <div key={w} className="sched-week">
                {cycleWeeks === 2 && <h4>Week {w + 1}</h4>}
                {WEEKDAY_FULL.map((label, i) => (
                  <label key={label} className="sched-row">{label}
                    <select value={slots[w * 7 + i] ?? ''} onChange={(e) => setSlots((p) => p.map((s, idx) => (idx === w * 7 + i ? e.target.value || null : s)))}>
                      <option value="">Rest</option>
                      {draft.map((d) => <option key={d.id} value={d.id}>{d.name || 'Unnamed day'}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            ))}
          </section>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="btn-row">
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>Save split</button>
        </div>
      </div>
    </dialog>
  );
}
