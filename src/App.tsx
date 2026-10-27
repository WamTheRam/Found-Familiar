import { useEffect, useState } from 'react';
import { Calendar } from './components/Calendar';
import { Logo } from './components/Logo';
import { Tabs } from './components/Tabs';
import { HealthTab, JournalTab } from './tabs/Placeholders';
import { TodoTab } from './tabs/TodoTab';
import { useApp } from './state';

export function App() {
  const { tab, repo } = useApp();
  const [storage, setStorage] = useState('Checking local storage…');

  useEffect(() => {
    repo.health()
      .then((h) => setStorage(`Local storage ready (${h.stores.length} stores)`))
      .catch(() => setStorage('Local storage unavailable. Changes cannot be saved in this browser.'));
  }, [repo]);

  return (
    <div className="app">
      <header className="app-head">
        <Logo />
        <h1 className="brand">familiar</h1>
      </header>
      <Calendar />
      <Tabs />
      <main id="tab-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="content">
        {tab === 'todo' && <TodoTab />}
        {tab === 'health' && <HealthTab />}
        {tab === 'journal' && <JournalTab />}
      </main>
      <footer className="app-foot">
        <span>A little progress, every day.</span>
        <small>{storage}</small>
      </footer>
    </div>
  );
}
