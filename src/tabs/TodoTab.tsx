import { useState } from 'react';
import { TaskDialog } from '../components/TaskDialog';
import { formatShort } from '../lib/dates';
import { carriedOver, countDone, describeRepeat, filterByStatus, sortTasks, STATUS_LABEL, tasksForDate, type StatusFilter } from '../lib/tasks';
import { useApp } from '../state';
import type { DateStr, Task, TaskStatus } from '../types';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'To do' },
  { id: 'working', label: 'Working on' },
  { id: 'done', label: 'Done' },
];

interface RowProps {
  task: Task;
  from?: DateStr;
  onEdit: () => void;
  onStatus: (s: TaskStatus) => void;
}

function TaskRow({ task, from, onEdit, onStatus }: RowProps) {
  const done = task.status === 'done';
  const working = task.status === 'working';
  const meta = [task.tag, task.repeat && describeRepeat(task.repeat), task.dueTime && `Due ${task.dueTime}`, from && `From ${formatShort(from)}`].filter(Boolean).join(' · ');
  return (
    <li className={`task${done ? ' is-done' : ''}`}>
      <button type="button" role="checkbox" aria-checked={done} className="check"
        aria-label={`${done ? 'Mark as not done' : 'Mark as done'}: ${task.title}`}
        onClick={() => onStatus(done ? 'todo' : 'done')}>{done ? '✓' : ''}</button>
      <button type="button" className="task-main" onClick={onEdit} aria-label={`Edit ${task.title}`}>
        <span className="task-title">{task.title}</span>
        {meta && <span className="task-meta">{meta}</span>}
      </button>
      {!done && (
        <button type="button" className={`flag${working ? ' is-on' : ''}`} aria-pressed={working}
          aria-label={working ? `Stop working on ${task.title}` : `Start working on ${task.title}`}
          onClick={() => onStatus(working ? 'todo' : 'working')}>⚑</button>
      )}
    </li>
  );
}

export function TodoTab() {
  const { selectedDate, tasks, tasksReady, tasksError, saveTask } = useApp();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [dialog, setDialog] = useState<{ task?: Task } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const dayTasks = sortTasks(tasksForDate(tasks, selectedDate));
  const carried = filterByStatus(carriedOver(tasks, selectedDate), filter);
  const visible = filterByStatus(dayTasks, filter);
  const done = countDone(dayTasks);

  async function setStatus(task: Task, status: TaskStatus) {
    setActionError(null);
    // Repeating tasks keep one status per day; one-off tasks keep a single status.
    const base = tasks.find((x) => x.id === task.id) ?? task;
    const next: Task = base.repeat
      ? { ...base, occurrenceStatus: { ...base.occurrenceStatus, [selectedDate]: status }, updatedAt: Date.now() }
      : { ...base, status, updatedAt: Date.now() };
    try { await saveTask(next); }
    catch { setActionError('Could not save that change. Your browser may be blocking local storage.'); }
  }

  const row = (t: Task, from?: DateStr) => (
    <TaskRow key={t.id} task={t} from={from} onEdit={() => setDialog({ task: tasks.find((x) => x.id === t.id) ?? t })} onStatus={(s) => setStatus(t, s)} />
  );
  const section = (key: TaskStatus) => {
    const list = visible.filter((t) => t.status === key);
    if (!list.length) return null;
    return (
      <section key={key} className="task-section" aria-label={STATUS_LABEL[key]}>
        <h3>{STATUS_LABEL[key]} <span className="count">{list.length}</span></h3>
        <ul className="task-list">{list.map((t) => row(t))}</ul>
      </section>
    );
  };

  return (
    <div className="panel">
      <h2 className="panel-title">Your daily pursuits</h2>
      <p className="panel-sub">A clear board. A little room for adventure.</p>

      {tasksError && <p className="form-error" role="alert">{tasksError}</p>}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}

      <div className="progress-card" aria-live="polite">
        <span>Small steps count.</span>
        <span className="progress-num">{done} of {dayTasks.length} done</span>
        <div className="bar" aria-hidden="true"><div style={{ width: dayTasks.length ? `${(done / dayTasks.length) * 100}%` : 0 }} /></div>
      </div>

      <div className="chips" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={`chip${filter === f.id ? ' is-on' : ''}`}
            aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      {!tasksReady && !tasksError ? <p className="muted">Opening the board…</p> : (
        <>
          {section('working')}
          {section('todo')}
          {dayTasks.length === 0 && <p className="empty-text">No tasks today.</p>}
          {dayTasks.length > 0 && visible.length === 0 && carried.length === 0 && (
            <p className="empty-text">No {STATUS_LABEL[filter as TaskStatus].toLowerCase()} tasks here.</p>
          )}
          {carried.length > 0 && (
            <section className="task-section" aria-label="Carried over">
              <h3>Carried over <span className="count">{carried.length}</span></h3>
              <ul className="task-list">{carried.map((t) => row(t, t.date))}</ul>
            </section>
          )}
          {section('done')}
        </>
      )}

      <button type="button" className="pin-btn" onClick={() => setDialog({})}>+ Pin a new task</button>
      <p className="hint">Unfinished tasks stay on their own day and show as “Carried over” on later days.</p>

      {dialog && <TaskDialog task={dialog.task} defaultDate={selectedDate} onClose={() => setDialog(null)} />}
    </div>
  );
}
