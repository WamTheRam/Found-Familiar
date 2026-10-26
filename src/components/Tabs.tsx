import { useApp } from '../state';
import type { TabId } from '../types';

const TABS: { id: TabId; label: string }[] = [
  { id: 'todo', label: 'To-do' },
  { id: 'health', label: 'Health' },
  { id: 'journal', label: 'Journal' },
];

export function Tabs() {
  const { tab, setTab } = useApp();
  return (
    <div className="tabs" role="tablist" aria-label="Sections">
      {TABS.map((t) => (
        <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id}
          aria-controls="tab-panel" className={`tab${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
