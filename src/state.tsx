import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DateStr, TabId } from './types';
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
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<DateStr>(() => todayStr());
  const [tab, setTab] = useState<TabId>('todo');
  const [monthOpen, setMonthOpen] = useState(false);
  const repo = useMemo(() => createIndexedDbRepository(), []);
  const value: AppState = { selectedDate, setSelectedDate, tab, setTab, monthOpen, setMonthOpen, repo };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
