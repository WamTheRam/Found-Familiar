import { useEffect, useState } from 'react';
import { SetsCard, type CardStatus } from '../components/SetsCard';
import { SplitEditor } from '../components/SplitEditor';
import { addDays, formatLong, formatShort } from '../lib/dates';
import {
  loadWorkoutView, saveCatchUpProgress, saveExerciseProgress, type WorkoutView,
} from '../lib/workoutService';
import { useApp } from '../state';
import type { CatchUp, CatchUpStatus, ExerciseLog, ExerciseStatus } from '../types';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const logToCard = (s?: ExerciseStatus): CardStatus => (s === 'completed' ? 'completed' : s === 'skipped' ? 'skipped' : 'pending');
const cardToLog = (s: CardStatus): ExerciseStatus => (s === 'pending' ? 'unfinished' : s);
const catchToCard = (s: CatchUpStatus): CardStatus => (s === 'open' ? 'pending' : s);
const cardToCatch = (s: CardStatus): CatchUpStatus => (s === 'pending' ? 'open' : s);

export function HealthTab() {
  const { repo, selectedDate, setSelectedDate, refreshWorkout } = useApp();
  const [view, setView] = useState<WorkoutView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    loadWorkoutView(repo, selectedDate)
      .then((v) => { if (!cancelled) setView(v); })
      .catch(() => { if (!cancelled) setError('Could not load your workouts from this browser.'); });
    return () => { cancelled = true; };
  }, [repo, selectedDate, nonce]);

  const patchLog = (exerciseId: string, log: ExerciseLog) =>
    setView((v) => v && { ...v, items: v.items.map((i) => (i.def.id === exerciseId ? { ...i, log } : i)) });
  const patchCatchUp = (record: CatchUp) =>
    setView((v) => v && { ...v, catchUps: v.catchUps.map((c) => (c.record.id === record.id ? { ...c, record } : c)) });

  const ready = view && view.date === selectedDate;
  const plan = ready ? view.plan : null;

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Build your strength</h2>
          <p className="panel-sub">A steady rhythm, not a race.</p>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setEditing(true)} disabled={!ready}>
          {plan ? 'Edit split' : 'Set up split'}
        </button>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {!ready && !error && <p className="muted">Opening your training ledger…</p>}

      {ready && !plan && (
        <p className="empty-text">No workout split yet. Choose “Set up split” to create your workout days and schedule.</p>
      )}

      {ready && plan && (
        <>
          <div className="cycle-row">
            <span className="cycle-label">{plan.cycleWeeks === 1 ? 'Weekly cycle' : 'Fortnightly cycle'}</span>
            {plan.cycleWeeks === 2 && view.weekNumber !== null && (
              <div className="seg" role="group" aria-label="Week of the cycle">
                {[1, 2].map((n) => (
                  <button key={n} type="button" className={view.weekNumber === n ? 'is-on' : ''} aria-pressed={view.weekNumber === n}
                    onClick={() => { if (n !== view.weekNumber) setSelectedDate(addDays(selectedDate, n > (view.weekNumber ?? 1) ? 7 : -7)); }}>
                    Week {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="strip" role="group" aria-label="Workout days this week">
            {view.strip.map((d, i) => (
              <button key={d.date} type="button" className={`strip-day${d.date === selectedDate ? ' is-on' : ''}${d.isRest ? ' is-rest' : ''}`}
                aria-pressed={d.date === selectedDate} aria-label={`${formatLong(d.date)}: ${d.label}`} onClick={() => setSelectedDate(d.date)}>
                <span className="strip-letter">{LETTERS[i]}</span>
                <span className="strip-label">{d.label}</span>
              </button>
            ))}
          </div>

          {view.day ? (
            <div className="session-card">
              <span className="eyebrow">Today’s session</span>
              <h3>{view.day.name}{view.day.focus ? ` · ${view.day.focus}` : ''}</h3>
              <p className="muted">{formatLong(selectedDate)}</p>
            </div>
          ) : (
            <div className="session-card is-rest">
              <span className="eyebrow">Rest day</span>
              <h3>Rest &amp; recover</h3>
              <p className="muted">A walk counts, too.</p>
            </div>
          )}

          {view.day && view.items.length === 0 && <p className="empty-text">This workout has no exercises yet. Add some with “Edit split”.</p>}

          {view.catchUps.length > 0 && (
            <section className="task-section" aria-label="Catch-up work">
              <h3>Catch-up work <span className="count">{view.catchUps.length}</span></h3>
              <ul className="task-list">
                {view.catchUps.map(({ record, reference }) => (
                  <SetsCard key={`${nonce}:${record.id}`}
                    name={record.exerciseName}
                    detail={`${record.plannedSets} sets × ${record.targetReps} reps`}
                    badge={`Catch-up · skipped ${formatShort(record.originDate)}`}
                    status={catchToCard(record.status)} initialSets={record.sets} plannedSets={record.plannedSets} reference={reference}
                    onSave={async (sets, status) => { patchCatchUp(await saveCatchUpProgress(repo, record.id, sets, cardToCatch(status))); }} />
                ))}
              </ul>
            </section>
          )}

          {view.items.length > 0 && (
            <section className="task-section" aria-label="Workout log">
              <h3>Your workout log</h3>
              <ul className="task-list">
                {view.items.map(({ def, log, reference }) => (
                  <SetsCard key={`${nonce}:${view.date}:${def.id}`}
                    name={def.name}
                    detail={`${def.sets} sets × ${def.targetReps} reps`}
                    notes={def.notes}
                    status={logToCard(log?.status)} initialSets={log?.sets ?? []} plannedSets={def.sets} reference={reference}
                    onSave={async (sets, status) => { patchLog(def.id, await saveExerciseProgress(repo, view.date, def.id, sets, cardToLog(status))); }} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {editing && ready && (
        <SplitEditor plan={view.plan} days={view.days} onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); setNonce((n) => n + 1); void refreshWorkout(); }} />
      )}
    </div>
  );
}
