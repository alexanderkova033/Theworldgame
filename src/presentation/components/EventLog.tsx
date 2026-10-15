// The event log as a timeline: newest first, grouped by month, with runs of
// repetitive events folded into one line ("4 breakdowns", "12 days of food
// shortage") that opens to show them all. Every line that has somewhere to
// go carries the same "Go" button its toast had (see eventKinds.ts).
import "./EventLog.css";
import { useState } from "react";
import { formatDate, formatMonthYear } from "../../domain/country/calendar";
import type { EventSeverity, GameEvent } from "../../domain/country/types";
import { getEventKind, type EventAction } from "../eventKinds";
import type { OpenPanel } from "./TopBar";

interface EventLogProps {
  events: GameEvent[]; // newest first
  onOpenPanel: OpenPanel;
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

const SEVERITY_RANK: Record<EventSeverity, number> = { info: 0, warning: 1, danger: 2 };

// One line in the timeline: a single event, or a run of the same kind.
interface Entry {
  key: string;
  events: GameEvent[]; // newest first
  plural: string;
  action?: EventAction;
}

interface MonthGroup {
  key: string;
  label: string;
  entries: Entry[];
}

function groupEvents(events: GameEvent[]): MonthGroup[] {
  const months: MonthGroup[] = [];
  for (const event of events) {
    const monthKey = `${event.date.year}-${event.date.month}`;
    let month = months[months.length - 1];
    if (!month || month.key !== monthKey) {
      month = { key: monthKey, label: formatMonthYear(event.date), entries: [] };
      months.push(month);
    }
    // Repeats of the same kind fold into one line per month, placed where
    // the newest of them falls.
    const kind = getEventKind(event);
    const run = kind.foldable ? month.entries.find((e) => getEventKind(e.events[0]).kind === kind.kind) : undefined;
    if (run) {
      run.events.push(event);
    } else {
      month.entries.push({ key: event.id, events: [event], plural: kind.plural, action: kind.action });
    }
  }
  return months;
}

// "— repair it from the Economy tab." says what the button beside it does.
function tidy(message: string, action?: EventAction): string {
  return action ? message.replace(/ Repair it from the Economy tab\.$/, "") : message;
}

function GoButton({ action, onOpenPanel }: { action?: EventAction; onOpenPanel: OpenPanel }) {
  if (!action) return null;
  return (
    <button type="button" className="event-log__go" onClick={() => onOpenPanel(action.panel, action.section)}>
      {action.label}
    </button>
  );
}

function EventLine({ event, action, onOpenPanel, count }: { event: GameEvent; action?: EventAction; onOpenPanel: OpenPanel; count?: number }) {
  return (
    <>
      <span className={`event-log__badge event-log__badge--${event.severity}`} aria-hidden="true">
        <SeverityIcon severity={event.severity} />
      </span>
      <span className="event-log__body">
        <span className="event-log__date">{formatDate(event.date)}</span>
        <span>{tidy(event.message, action)}</span>
      </span>
      {count !== undefined && <span className="event-log__count">×{count}</span>}
      <GoButton action={action} onOpenPanel={onOpenPanel} />
    </>
  );
}

export function EventLog({ events, onOpenPanel }: EventLogProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const months = groupEvents(events);
  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section className="panel event-log">
      <h2>Event Log</h2>
      <div className="event-log__list">
        {months.map((month) => (
          <section key={month.key} className="event-log__month" aria-label={month.label}>
            <h3 className="event-log__month-title">{month.label}</h3>
            <ul>
              {month.entries.map((entry) => {
                const newest = entry.events[0];
                if (entry.events.length === 1) {
                  return (
                    <li key={entry.key} className={`event-log__item event-log__item--${newest.severity}`}>
                      <EventLine event={newest} action={entry.action} onOpenPanel={onOpenPanel} />
                    </li>
                  );
                }
                // A run: shown at its worst severity, newest message, and a count.
                const worst = entry.events.reduce((a, b) => (SEVERITY_RANK[b.severity] > SEVERITY_RANK[a.severity] ? b : a));
                const isOpen = open.has(entry.key);
                return (
                  <li key={entry.key} className={`event-log__item event-log__item--${worst.severity} event-log__item--run`}>
                    <div className="event-log__run-head">
                      <EventLine event={{ ...newest, severity: worst.severity }} action={entry.action} onOpenPanel={onOpenPanel} count={entry.events.length} />
                    </div>
                    <button
                      type="button"
                      className="event-log__run-toggle"
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Hide" : "Show"} all ${entry.events.length} ${entry.plural}`}
                      onClick={() => toggle(entry.key)}
                    >
                      {isOpen ? "▾ Hide" : `▸ Show all ${entry.events.length}`}
                    </button>
                    {isOpen && (
                      <ul className="event-log__run">
                        {entry.events.map((event) => (
                          <li key={event.id}>
                            <span className="event-log__date">{formatDate(event.date)}</span> {event.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
