import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DateStr, JournalEntry, JournalPhoto, TabId, Task, WorkoutDay, WorkoutPlan } from './types';
import { todayStr } from './lib/dates';
import { createIndexedDbRepository, type AppRepository } from './data/repository';

interface AppState {
  selectedDate: DateStr;
  setSelectedDate: (d: DateStr) => void;
  tab: TabId;
  setTab: (t: TabId) => void;
  monthOpen: boolean;
  setMonthOpen: (open: boolean) => void;
  repo: AppRepository;
  tasks: Task[];
  tasksReady: boolean;
  tasksError: string | null;
  /** Writes to storage first, then updates the screen. Rejects if saving fails. */
  saveTask: (t: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  /** All journal entries by date (small text records; photos are loaded on demand). */
  journal: Record<DateStr, JournalEntry>;
  journalReady: boolean;
  journalError: string | null;
  saveJournal: (e: JournalEntry) => Promise<void>;
  /** Deletes the entry and its photo. */
  deleteJournal: (date: DateStr) => Promise<void>;
  setJournalPhoto: (p: JournalPhoto) => Promise<void>;
  removeJournalPhoto: (date: DateStr) => Promise<void>;
  /** Increments whenever any photo changes, so month thumbnails refresh. */
  photoRev: number;
  /** Month calendar shows moods and photo thumbnails instead of plain dates. */
  journalView: boolean;
  setJournalView: (on: boolean) => void;

  /** Current workout split, kept here so the calendar can show scheduled workouts. */
  workoutPlan: WorkoutPlan | null;
  workoutDays: WorkoutDay[];
  refreshWorkout: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<DateStr>(() => todayStr());
  const [tab, setTab] = useState<TabId>('todo');
  const [monthOpen, setMonthOpen] = useState(false);
  const [journalView, setJournalView] = useState(false);
  const repo = useMemo(() => createIndexedDbRepository(), []);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksReady, setTasksReady] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    repo.listTasks()
      .then((list) => { if (!cancelled) { setTasks(list); setTasksReady(true); } })
      .catch(() => { if (!cancelled) setTasksError('Could not load saved tasks from this browser.'); });
    return () => { cancelled = true; };
  }, [repo]);

  const saveTask = useCallback(async (t: Task) => {
    await repo.saveTask(t);
    setTasks((prev) => [...prev.filter((x) => x.id !== t.id), t]);
  }, [repo]);

  const deleteTask = useCallback(async (id: string) => {
    await repo.deleteTask(id);
    setTasks((prev) => prev.filter((x) => x.id !== id));
  }, [repo]);

  const [journal, setJournal] = useState<Record<DateStr, JournalEntry>>({});
  const [journalReady, setJournalReady] = useState(false);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [photoRev, setPhotoRev] = useState(0);

  useEffect(() => {
    let cancelled = false;
    repo.listJournalEntries()
      .then((list) => {
        if (cancelled) return;
        setJournal(Object.fromEntries(list.map((e) => [e.date, e])));
        setJournalReady(true);
      })
      .catch(() => { if (!cancelled) setJournalError('Could not load your journal from this browser.'); });
    return () => { cancelled = true; };
  }, [repo]);

  const saveJournal = useCallback(async (e: JournalEntry) => {
    await repo.saveJournalEntry(e);
    setJournal((p) => ({ ...p, [e.date]: e }));
  }, [repo]);

  const deleteJournal = useCallback(async (date: DateStr) => {
    await repo.deleteJournalEntry(date);
    setJournal((p) => { const next = { ...p }; delete next[date]; return next; });
    setPhotoRev((r) => r + 1);
  }, [repo]);

  const setJournalPhoto = useCallback(async (photo: JournalPhoto) => {
    const entry = await repo.saveJournalPhoto(photo);
    setJournal((p) => ({ ...p, [photo.date]: p[photo.date] ?? entry }));
    setPhotoRev((r) => r + 1);
  }, [repo]);

  const removeJournalPhoto = useCallback(async (date: DateStr) => {
    await repo.deleteJournalPhoto(date);
    setPhotoRev((r) => r + 1);
  }, [repo]);

  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const refreshWorkout = useCallback(async () => {
    try {
      const [plan, days] = await Promise.all([repo.getPlan(), repo.listDays()]);
      setWorkoutPlan(plan ?? null);
      setWorkoutDays(days);
    } catch { /* calendar simply shows no workout indicators */ }
  }, [repo]);
  useEffect(() => { void refreshWorkout(); }, [refreshWorkout]);

  const value: AppState = {
    selectedDate, setSelectedDate, tab, setTab, monthOpen, setMonthOpen,
    repo, tasks, tasksReady, tasksError, saveTask, deleteTask,
    journal, journalReady, journalError, saveJournal, deleteJournal, setJournalPhoto, removeJournalPhoto,
    photoRev, journalView, setJournalView,
    workoutPlan, workoutDays, refreshWorkout,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
