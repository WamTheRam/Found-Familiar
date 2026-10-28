import type { KeyboardEvent } from 'react';
import { useApp } from '../state';
import type { TabId } from '../types';

const TABS: { id: TabId; label: string }[] = [
  { id: 'todo', label: 'To-do' },
  { id: 'health', label: 'Health' },
  { id: 'journal', label: 'Journal' },
];

export function Tabs() {
  const { tab, setTab } = useApp();

  function onKeyDown(e: KeyboardEvent) {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i + TABS.length - 1) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next].id);
    document.getElementById(`tab-${TABS[next].id}`)?.focus();
  }

  return (
    <div className="tabs" role="tablist" aria-label="Sections" onKeyDown={onKeyDown}>
      {TABS.map((t) => (
        <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id}
          tabIndex={tab === t.id ? 0 : -1} aria-controls="tab-panel"
          className={`tab${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Shown instead of the tab content while the full month is open: pick a tab to return to it. */
export function TabShortcuts() {
  const { tab, setTab, setMonthOpen } = useApp();
  return (
    <nav className="shortcuts" aria-label="Open a section">
      {TABS.map((t) => (
        <button key={t.id} type="button" className={`shortcut${tab === t.id ? ' is-current' : ''}`}
          aria-label={`Open ${t.label}`} onClick={() => { setTab(t.id); setMonthOpen(false); }}>
          {t.label} <span aria-hidden="true">▴</span>
        </button>
      ))}
    </nav>
  );
}
