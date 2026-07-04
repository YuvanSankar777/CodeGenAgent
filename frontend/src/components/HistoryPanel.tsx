import type { HistoryItem } from "../api";

interface Props {
  items: HistoryItem[];
  dbAvailable: boolean;
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: number) => void;
}

export default function HistoryPanel({
  items,
  dbAvailable,
  onSelect,
  onDelete,
}: Props) {
  return (
    <aside className="card history">
      <h3>History</h3>
      {!dbAvailable && (
        <p className="muted">
          Database offline — history is disabled for this session.
        </p>
      )}
      {dbAvailable && items.length === 0 && (
        <p className="muted">No generations yet.</p>
      )}
      <ul>
        {items.map((it) => (
          <li key={it.id} className="history-item">
            <button className="history-select" onClick={() => onSelect(it)}>
              <span className="history-lang">{it.language}</span>
              <span className="history-req">{it.requirement}</span>
            </button>
            <button
              className="history-del"
              title="Delete"
              onClick={() => onDelete(it.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
