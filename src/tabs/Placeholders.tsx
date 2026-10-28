import { formatLong } from '../lib/dates';
import { useApp } from '../state';

function Placeholder({ title, line, stage }: { title: string; line: string; stage: string }) {
  const { selectedDate } = useApp();
  return (
    <div className="panel">
      <h2 className="panel-title">{title}</h2>
      <p className="panel-sub">{line}</p>
      <div className="empty">
        <img src="/owl.png" width={56} height={56} alt="" className="logo-img" />
        <p>Selected: <strong>{formatLong(selectedDate)}</strong></p>
        <p className="muted">Arrives in {stage}.</p>
      </div>
    </div>
  );
}

export const JournalTab = () => <Placeholder title="A moment to reflect" line="No perfect words needed. Just yours." stage="Stage 4" />;
