import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DateStr, TabId, Task } from './types';
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
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<DateStr>(() => todayStr());
  const [tab, setTab] = useState<TabId>('todo');
  const [monthOpen, setMonthOpen] = useState(false);
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

  const value: AppState = {
    selectedDate, setSelectedDate, tab, setTab, monthOpen, setMonthOpen,
    repo, tasks, tasksReady, tasksError, saveTask, deleteTask,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
