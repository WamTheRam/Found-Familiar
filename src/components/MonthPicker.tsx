import { useEffect, useRef, useState } from 'react';
import { parseDateStr, setMonthYear } from '../lib/dates';
import { useApp } from '../state';

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, i, 1))));
const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

export function MonthPicker({ onClose }: { onClose: () => void }) {
  const { selectedDate, setSelectedDate } = useApp();
  const { y, m } = parseDateStr(selectedDate);
  const [year, setYear] = useState(y);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);

  const clamp = (n: number) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, n));
  const choose = (month: number) => { setSelectedDate(setMonthYear(selectedDate, year, month)); onClose(); };

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="picker-title" onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="sheet-body">
        <h2 id="picker-title" className="sheet-title">Go to month</h2>
        <div className="year-row">
          <button type="button" className="icon-btn" aria-label="Previous year" onClick={() => setYear((v) => clamp(v - 1))}>‹</button>
          <input type="number" aria-label="Year" min={MIN_YEAR} max={MAX_YEAR} value={year}
            onChange={(e) => { const n = Number(e.target.value); if (Number.isInteger(n)) setYear(n); }}
            onBlur={() => setYear((v) => clamp(v))} />
          <button type="button" className="icon-btn" aria-label="Next year" onClick={() => setYear((v) => clamp(v + 1))}>›</button>
        </div>
        <div className="month-pick">
          {MONTHS.map((name, i) => (
            <button key={name} type="button" className={`mp${year === y && i + 1 === m ? ' is-current' : ''}`}
              disabled={year < MIN_YEAR || year > MAX_YEAR} onClick={() => choose(i + 1)}>{name}</button>
          ))}
        </div>
        <div className="btn-row"><span className="spacer" /><button type="button" className="btn" onClick={onClose}>Cancel</button></div>
      </div>
    </dialog>
  );
}
