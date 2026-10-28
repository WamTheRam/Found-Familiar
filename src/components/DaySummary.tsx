import { formatLong, todayStr } from '../lib/dates';
import { excerpt } from '../lib/journal';
import { moodFor, readableTextOn } from '../lib/mood';
import { carriedOver, sortTasks, tasksForDate } from '../lib/tasks';
import { scheduleFor } from '../lib/workoutService';
import { useApp } from '../state';
import type { TabId, TaskStatus } from '../types';

const ICON: Record<TaskStatus, string> = { todo: '○', working: '⚑', done: '✓' };
const STATUS_WORD: Record<TaskStatus, string> = { todo: 'to do', working: 'working on', done: 'done' };
const MAX_TASKS = 5;

/** Selected-day overview under the standard month calendar, with shortcuts into each tab. */
export function DaySummary() {
  const { selectedDate, tasks, workoutPlan, workoutDays, journal, setTab, setMonthOpen } = useApp();
  const go = (t: TabId) => { setTab(t); setMonthOpen(false); };

  const dayTasks = sortTasks(tasksForDate(tasks, selectedDate));
  const done = dayTasks.filter((t) => t.status === 'done').length;
  const carried = carriedOver(tasks, selectedDate).length;

  const byId = new Map(workoutDays.map((d) => [d.id, d]));
  const workout = workoutPlan ? scheduleFor(workoutPlan, byId, selectedDate).day : null;

  const entry = journal[selectedDate];
  const mood = moodFor(entry?.mood);

  return (
    <div className="dsum" aria-live="polite">
      <div className="dsum-head">
        <strong>{formatLong(selectedDate)}</strong>
        {selectedDate === todayStr() && <span className="today-tag">Today</span>}
      </div>

      <section className="dsum-block" aria-label="Tasks">
        <div className="dsum-row">
          <h4>Tasks</h4>
          <span className="muted small">{dayTasks.length ? `${done} of ${dayTasks.length} done` : ''}</span>
        </div>
        {dayTasks.length === 0 ? <p className="muted small">No tasks.</p> : (
          <ul className="dsum-list">
            {dayTasks.slice(0, MAX_TASKS).map((t) => (
              <li key={t.id} className={t.status === 'done' ? 'is-done' : ''}>
                <span aria-label={STATUS_WORD[t.status]}>{ICON[t.status]}</span> {t.title}
              </li>
            ))}
          </ul>
        )}
        {dayTasks.length > MAX_TASKS && <p className="muted small">+ {dayTasks.length - MAX_TASKS} more</p>}
        {carried > 0 && <p className="muted small">{carried} carried over from earlier days</p>}
        <button type="button" className="link-btn" onClick={() => go('todo')}>Open To-do ›</button>
      </section>

      <section className="dsum-block" aria-label="Workout">
        <h4>Workout</h4>
        <p className="small">
          {!workoutPlan ? <span className="muted">No workout split set up yet.</span>
            : workout ? <>{workout.name}{workout.focus ? ` · ${workout.focus}` : ''} <span className="muted">· {workout.exercises.length} exercises</span></>
            : <span className="muted">Rest day</span>}
        </p>
        <button type="button" className="link-btn" onClick={() => go('health')}>Open Health ›</button>
      </section>

      <section className="dsum-block" aria-label="Journal">
        <h4>Journal</h4>
        {entry ? (
          <>
            <p className="small">
              <strong>{entry.title?.trim() || 'Untitled'}</strong>
              {mood && <span className="mood-badge mood-inline" style={{ background: mood.color, color: readableTextOn(mood.color) }}>{mood.value} / 10 · {mood.label}</span>}
            </p>
            {entry.text.trim() && <p className="small muted">{excerpt(entry.text, 120)}</p>}
          </>
        ) : <p className="muted small">No entry yet.</p>}
        <button type="button" className="link-btn" onClick={() => go('journal')}>{entry ? 'Open Journal ›' : 'Write an entry ›'}</button>
      </section>
    </div>
  );
}
