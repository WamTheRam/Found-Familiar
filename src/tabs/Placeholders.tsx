import { formatLong } from '../lib/dates';
import { useApp } from '../state';

function Placeholder({ title, line, stage }: { title: string; line: string; stage: string }) {
  const { selectedDate } = useApp();
  return (
    <div className="panel">
      <h2 className="panel-title">{title}</h2>
      <p className="panel-sub">{line}</p>
      <div className="empty">
        <img src="/owl.svg" width={56} height={56} alt="" />
        <p>Selected: <strong>{formatLong(selectedDate)}</strong></p>
        <p className="muted">Arrives in {stage}.</p>
      </div>
    </div>
  );
}

export const TodoTab = () => <Placeholder title="Your daily pursuits" line="A clear board. A little room for adventure." stage="Stage 2" />;
export const HealthTab = () => <Placeholder title="Build your strength" line="A steady rhythm, not a race." stage="Stage 3" />;
export const JournalTab = () => <Placeholder title="A moment to reflect" line="No perfect words needed. Just yours." stage="Stage 4" />;
