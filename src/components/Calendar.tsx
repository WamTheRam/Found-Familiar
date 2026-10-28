import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useApp } from '../state';
import {
  addDays, addMonths, formatLong, formatMonthYear, isSameMonth, monthGrid, parseDateStr, todayStr, weekDays,
} from '../lib/dates';
import { buildDayInfo, describeInfo, type DayInfo } from '../lib/dayInfo';
import type { DateStr } from '../types';
import { DaySummary } from './DaySummary';
import { JournalMonthGrid, JournalSummary, MoodLegend } from './JournalMonth';
import { MonthPicker } from './MonthPicker';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Short press = onClick. Press and hold (about half a second) = onLong. */
function useLongPress(onClick: () => void, onLong: () => void, ms = 500) {
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);
  const clear = () => window.clearTimeout(timer.current);
  return {
    onPointerDown: () => { fired.current = false; clear(); timer.current = window.setTimeout(() => { fired.current = true; onLong(); }, ms); },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClick: () => { if (fired.current) { fired.current = false; return; } onClick(); },
    onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
  };
}

function DayButton({ date, muted, info }: { date: DateStr; muted?: boolean; info?: DayInfo }) {
  const { selectedDate, setSelectedDate } = useApp();
  const selected = date === selectedDate;
  const today = date === todayStr();
  const extra = describeInfo(info);
  return (
    <button
      type="button"
      className={`day${selected ? ' is-selected' : ''}${today ? ' is-today' : ''}${muted ? ' is-muted' : ''}`}
      aria-pressed={selected}
      aria-label={extra ? `${formatLong(date)}: ${extra}` : formatLong(date)}
      aria-current={today ? 'date' : undefined}
      onClick={() => setSelectedDate(date)}
    >
      {parseDateStr(date).d}
      <span className="day-dots" aria-hidden="true">
        {info?.task && <i className={`dot dot-task ${info.task}`} />}
        {info?.workout && <i className="dot dot-work" />}
        {info?.journal && <i className="dot dot-journal" />}
      </span>
    </button>
  );
}

export function Calendar() {
  const {
    selectedDate, setSelectedDate, monthOpen, setMonthOpen, tasks, journal, workoutPlan, workoutDays,
    journalView, setJournalView,
  } = useApp();
  const [picker, setPicker] = useState(false);
  const visible = useMemo(() => (monthOpen ? monthGrid(selectedDate).flat() : weekDays(selectedDate)), [monthOpen, selectedDate]);
  const info = useMemo(
    () => buildDayInfo(visible, { tasks, plan: workoutPlan, days: workoutDays, journal }),
    [visible, tasks, workoutPlan, workoutDays, journal],
  );
  const touchY = useRef<number | null>(null);
  const step = monthOpen ? (n: number) => addMonths(selectedDate, n) : (n: number) => addDays(selectedDate, 7 * n);
  const prev = useLongPress(() => setSelectedDate(step(-1)), () => setPicker(true));
  const next = useLongPress(() => setSelectedDate(step(1)), () => setPicker(true));
  const showJournal = monthOpen && journalView;

  return (
    <section className="calendar" aria-label="Calendar">
      <div className="cal-head">
        <button type="button" className="month-btn" onClick={() => setMonthOpen(!monthOpen)}
          aria-expanded={monthOpen} aria-label={monthOpen ? 'Show week view' : 'Show full month'}>
          {formatMonthYear(selectedDate)} <span aria-hidden="true">{monthOpen ? '▴' : '▾'}</span>
        </button>
        <div className="cal-nav">
          <button type="button" className="icon-btn" {...prev} aria-label={monthOpen ? 'Previous month' : 'Previous week'}>‹</button>
          <button type="button" className="icon-btn" {...next} aria-label={monthOpen ? 'Next month' : 'Next week'}>›</button>
        </div>
      </div>

      {monthOpen && (
        <div className="jtoggle">
          <span>Journal view<small>Photos &amp; moods, day by day</small></span>
          <button type="button" role="switch" aria-checked={journalView} aria-label="Journal view"
            className={`switch${journalView ? ' is-on' : ''}`} onClick={() => setJournalView(!journalView)}>
            <span className="switch-knob" />
          </button>
        </div>
      )}

      <div
        className="cal-body"
        onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => {
          if (touchY.current === null) return;
          const dy = e.changedTouches[0].clientY - touchY.current;
          if (dy > 50) setMonthOpen(true);
          if (dy < -50) setMonthOpen(false);
          touchY.current = null;
        }}
      >
        <div className="week-labels" aria-hidden="true">{LETTERS.map((l, i) => <span key={i}>{l}</span>)}</div>
        {showJournal ? (
          <JournalMonthGrid />
        ) : monthOpen ? (
          <div className="month-grid">
            {visible.map((d) => <DayButton key={d} date={d} muted={!isSameMonth(d, selectedDate)} info={info.get(d)} />)}
          </div>
        ) : (
          <div className="week-row">{visible.map((d) => <DayButton key={d} date={d} info={info.get(d)} />)}</div>
        )}
      </div>

      {monthOpen && (showJournal ? (<><JournalSummary /><MoodLegend /></>) : <DaySummary />)}

      <div className="cal-foot">
        <span>{formatLong(selectedDate)}</span>
        <span className="cal-foot-actions">
          <button type="button" className="link-btn" onClick={() => setPicker(true)}>Go to month…</button>
          <button type="button" className="link-btn" onClick={() => setSelectedDate(todayStr())}>Today</button>
        </span>
      </div>
      {!monthOpen && (
        <p className="dot-key" aria-hidden="true"><i className="dot dot-task open" /> tasks <i className="dot dot-work" /> workout <i className="dot dot-journal" /> journal</p>
      )}

      {picker && <MonthPicker onClose={() => setPicker(false)} />}
    </section>
  );
}
