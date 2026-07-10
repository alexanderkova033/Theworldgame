import "./EventLog.css";
import { formatDate } from "../../domain/country/calendar";
import type { GameEvent } from "../../domain/country/types";

interface EventLogProps {
  events: GameEvent[];
}

const SEVERITY_GLYPH: Record<string, string> = {
  info: "i",
  warning: "!",
  danger: "!",
};

export function EventLog({ events }: EventLogProps) {
  return (
    <section className="panel event-log">
      <h2>Event Log</h2>
      <ul className="event-log__list">
        {events.map((event) => (
          <li key={event.id} className={`event-log__item event-log__item--${event.severity}`}>
            <span className={`event-log__badge event-log__badge--${event.severity}`} aria-hidden="true">
              {SEVERITY_GLYPH[event.severity] ?? "i"}
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
