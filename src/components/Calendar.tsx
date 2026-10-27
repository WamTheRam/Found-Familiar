import { useMemo, useRef } from 'react';
import { useApp } from '../state';
import {
  addDays, addMonths, formatLong, formatMonthYear, isSameMonth, monthGrid, parseDateStr, todayStr, weekDays,
} from '../lib/dates';
import { taskMarkers } from '../lib/tasks';
import type { DateStr } from '../types';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function DayButton({ date, muted, marker }: { date: DateStr; muted?: boolean; marker?: 'open' | 'done' }) {
  const { selectedDate, setSelectedDate } = useApp();
  const selected = date === selectedDate;
  const today = date === todayStr();
  return (
    <button
      type="button"
      className={`day${selected ? ' is-selected' : ''}${today ? ' is-today' : ''}${muted ? ' is-muted' : ''}`}
      aria-pressed={selected}
      aria-label={formatLong(date)}
      aria-current={today ? 'date' : undefined}
      onClick={() => setSelectedDate(date)}
    >
      {parseDateStr(date).d}
      {/* Stage 3-4 will add workout and journal indicators here */}
      <span className={`day-dots${marker ? ` has-${marker}` : ''}`} aria-hidden="true" />
    </button>
  );
}

export function Calendar() {
  const { selectedDate, setSelectedDate, monthOpen, setMonthOpen, tasks } = useApp();
  const visible = useMemo(() => (monthOpen ? monthGrid(selectedDate).flat() : weekDays(selectedDate)), [monthOpen, selectedDate]);
  const markers = useMemo(() => taskMarkers(tasks, visible), [tasks, visible]);
  const touchY = useRef<number | null>(null);
  const step = monthOpen ? (n: number) => addMonths(selectedDate, n) : (n: number) => addDays(selectedDate, 7 * n);

  return (
    <section
      className="calendar"
      aria-label="Calendar"
      onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        if (touchY.current === null) return;
        const dy = e.changedTouches[0].clientY - touchY.current;
        if (dy > 50) setMonthOpen(true);
        if (dy < -50) setMonthOpen(false);
        touchY.current = null;
      }}
    >
      <div className="cal-head">
        <button type="button" className="month-btn" onClick={() => setMonthOpen(!monthOpen)}
          aria-expanded={monthOpen} aria-label={monthOpen ? 'Show week view' : 'Show full month'}>
          {formatMonthYear(selectedDate)} <span aria-hidden="true">{monthOpen ? '▴' : '▾'}</span>
        </button>
        <div className="cal-nav">
          <button type="button" className="icon-btn" onClick={() => setSelectedDate(step(-1))}
            aria-label={monthOpen ? 'Previous month' : 'Previous week'}>‹</button>
          <button type="button" className="icon-btn" onClick={() => setSelectedDate(step(1))}
            aria-label={monthOpen ? 'Next month' : 'Next week'}>›</button>
        </div>
      </div>

      <div className="week-labels" aria-hidden="true">{LETTERS.map((l, i) => <span key={i}>{l}</span>)}</div>

      {monthOpen ? (
        <div className="month-grid">
          {monthGrid(selectedDate).flat().map((d) => (
            <DayButton key={d} date={d} muted={!isSameMonth(d, selectedDate)} marker={markers.get(d)} />
          ))}
        </div>
      ) : (
        <div className="week-row">{weekDays(selectedDate).map((d) => <DayButton key={d} date={d} marker={markers.get(d)} />)}</div>
      )}

      <div className="cal-foot">
        <span>{formatLong(selectedDate)}</span>
        <button type="button" className="link-btn" onClick={() => setSelectedDate(todayStr())}>Today</button>
      </div>
    </section>
  );
}
