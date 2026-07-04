import type { HistoryItem } from "../api";
import { IconHistory, IconTrash, IconInbox, IconAlert } from "../icons";

interface Props {
  items: HistoryItem[];
  dbAvailable: boolean;
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: number) => void;
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso.endsWith("Z") ? iso : iso + "Z").getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function HistoryPanel({
  items,
  dbAvailable,
  onSelect,
  onDelete,
}: Props) {
  return (
    <aside className="card history">
      <div className="history-head">
        <h3>
          <IconHistory />
          History
        </h3>
        {dbAvailable && items.length > 0 && (
          <span className="count-badge">{items.length}</span>
        )}
      </div>

      {!dbAvailable && (
        <div className="offline-note">
          <IconAlert />
          <span>Database offline — history is disabled for this session.</span>
        </div>
      )}

      {dbAvailable && items.length === 0 && (
        <div className="empty">
          <IconInbox />
          <p>No generations yet</p>
          <span className="hint">Your generated code will appear here.</span>
        </div>
      )}

      {dbAvailable && items.length > 0 && (
        <ul>
          {items.map((it) => (
            <li key={it.id} className="history-item">
              <button className="history-select" onClick={() => onSelect(it)}>
                <span className="history-meta">
                  <span className="history-lang">{it.language}</span>
                  <span className="history-time">{relativeTime(it.created_at)}</span>
                </span>
                <span className="history-req">{it.requirement}</span>
              </button>
              <button
                className="history-del"
                title="Delete"
                onClick={() => onDelete(it.id)}
              >
                <IconTrash />
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
