import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../state';
import { newId } from '../lib/id';
import { STATUS_LABEL } from '../lib/tasks';
import type { DateStr, Task, TaskStatus } from '../types';

interface Props {
  task?: Task;
  defaultDate: DateStr;
  onClose: () => void;
}

export function TaskDialog({ task, defaultDate, onClose }: Props) {
  const { tasks, saveTask, deleteTask } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [tag, setTag] = useState(task?.tag ?? '');
  const [dueTime, setDueTime] = useState(task?.dueTime ?? '');
  const [date, setDate] = useState<DateStr>(task?.date ?? defaultDate);
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const knownTags = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.tag).filter((t): t is string => !!t))).sort(),
    [tasks],
  );

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Give the task a title.'); return; }
    if (!date) { setError('Choose a date.'); return; }
    const now = Date.now();
    const next: Task = {
      id: task?.id ?? newId(),
      title: title.trim(),
      description: description.trim() || undefined,
      tag: tag.trim() || undefined,
      dueTime: dueTime || undefined,
      date,
      status,
      createdAt: task?.createdAt ?? now,
      updatedAt: now,
    };
    setBusy(true);
    try { await saveTask(next); onClose(); }
    catch { setError('Could not save. Your browser may be blocking local storage.'); setBusy(false); }
  }

  async function remove() {
    if (!task) return;
    setBusy(true);
    try { await deleteTask(task.id); onClose(); }
    catch { setError('Could not delete. Please try again.'); setBusy(false); }
  }

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="task-dialog-title"
      onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <form onSubmit={submit} className="sheet-body">
        <h2 id="task-dialog-title" className="sheet-title">{task ? 'Edit task' : 'Pin a new task'}</h2>

        <label className="field">Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={120} />
        </label>
        <label className="field">Notes (optional)
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} />
        </label>
        <div className="field-row">
          <label className="field">Tag (optional)
            <input value={tag} onChange={(e) => setTag(e.target.value)} list="known-tags" maxLength={24} />
            <datalist id="known-tags">{knownTags.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
          <label className="field">Due time (optional)
            <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </label>
        </div>
        <div className="field-row">
          <label className="field">Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">Status
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </label>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        {confirming ? (
          <div className="confirm" role="alertdialog" aria-label="Confirm delete">
            <p>Delete “{task?.title}”? This cannot be undone.</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setConfirming(false)} disabled={busy}>Keep task</button>
              <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>Delete task</button>
            </div>
          </div>
        ) : (
          <div className="btn-row">
            {task && <button type="button" className="btn btn-quiet-danger" onClick={() => setConfirming(true)} disabled={busy}>Delete</button>}
            <span className="spacer" />
            <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{task ? 'Save changes' : 'Pin task'}</button>
          </div>
        )}
      </form>
    </dialog>
  );
}
