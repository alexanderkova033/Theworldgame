import "./EventLog.css";
import { formatDate } from "../../domain/country/calendar";
import type { EventSeverity, GameEvent } from "../../domain/country/types";

interface EventLogProps {
  events: GameEvent[];
}

// A drawn glyph per severity rather than the letters "i" and "!" — at 20px
// in a colored disc, a real bell/warning triangle reads instantly where a
// font-rendered character reads as a typo.
function SeverityIcon({ severity }: { severity: EventSeverity }) {
  if (severity === "info") {
    return (
      <svg viewBox="-10 -10 20 20" width={12} height={12} aria-hidden="true">
        <circle cx={0} cy={-4.6} r={1.5} fill="currentColor" />
        <rect x={-1.4} y={-1.6} width={2.8} height={7.6} rx={1.2} fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="-10 -10 20 20" width={13} height={13} aria-hidden="true">
      <path d="M0,-7.6 L8.2,6.6 L-8.2,6.6 Z" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
      <rect x={-1} y={-3.4} width={2} height={5.4} rx={0.9} fill="currentColor" />
      <circle cx={0} cy={4.1} r={1.1} fill="currentColor" />
    </svg>
  );
}

export function EventLog({ events }: EventLogProps) {
  return (
    <section className="panel event-log">
      <h2>Event Log</h2>
      <ul className="event-log__list">
        {events.map((event) => (
          <li key={event.id} className={`event-log__item event-log__item--${event.severity}`}>
            <span className={`event-log__badge event-log__badge--${event.severity}`} aria-hidden="true">
              <SeverityIcon severity={event.severity} />
            </span>
            <span className="event-log__body">
              <span className="event-log__date">{formatDate(event.date)}</span>
              <span>{event.message}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
