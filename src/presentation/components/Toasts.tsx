// Pop-up notices in the corner of the map for everything that happens: a
// new monthly report, a building breaking down, and every other entry that
// lands in the event log. Each one has a button straight to the
// tab that deals with it, and fades out on its own after a few seconds.
//
// A notice repeated while it's still showing (e.g. "stability is critically
// low", which fires daily) is folded into the one already up, not stacked.
import "./Toasts.css";
import { useEffect, useRef, useState } from "react";
import type { GameEvent, MonthlyReport } from "../../domain/country/types";
import { formatMonthYear, getReportedMonth } from "../../domain/country/calendar";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import { getLedgerHeadline } from "../../domain/ledger/ledgerRules";
import { formatSignedChange } from "../formatNumber";
import { getCauseInfo, METRIC_LABELS } from "../causes";
import { getEventKind } from "../eventKinds";
import { WrenchIcon } from "./RepairsPanel";
import type { EconomySection } from "../../application/getAdvisorOutlook";
import type { OpenPanel, PanelKey } from "./TopBar";

const TOAST_LIFETIME_MS = 8000;
const MAX_TOASTS = 4;

interface Toast {
  key: string;
  kind: "report" | "breakdown" | "info" | "warning" | "danger";
  title: string;
  message: string;
  action: { label: string; panel: PanelKey; section?: EconomySection };
}

// Every toast's button goes where the event's problem is dealt with (see
// eventKinds.ts) — the event log otherwise.
function toastFromEvent(event: GameEvent): Toast | null {
  const { kind, action } = getEventKind(event);
  if (kind === "breakdown") {
    return {
      key: event.id,
      kind: "breakdown",
      title: "Breakdown",
      message: event.message.replace(" Repair it from the Economy tab.", ""),
      action: action ?? { label: "Repair", panel: "economy", section: "build" },
    };
  }
  return {
    key: event.id,
    kind: event.severity,
    title: event.severity === "danger" ? "Danger" : event.severity === "warning" ? "Warning" : "News",
    message: event.message,
    action: action ?? { label: "Reports", panel: "reports" },
  };
}

// One line: the number that moved most last month, and what moved it —
// "Treasury −320: wages and building".
function reportHeadline(report: MonthlyReport): string {
  const headline = report.ledger ? getLedgerHeadline(report.ledger) : null;
  if (!headline) {
    const signed = (n: number) => formatSignedChange(n);
    return `Treasury ${signed(report.totalIncome)} ${CURRENCY_SYMBOL}, population ${signed(report.populationChange)}, stability ${signed(report.stabilityChange)}.`;
  }
  const { metric, total, causes } = headline;
  const amount = formatSignedChange(total, metric === "support" || metric === "stability");
  const why = causes.map((c) => getCauseInfo(metric, c.cause).label.toLowerCase()).join(" and ");
  return `${METRIC_LABELS[metric]} ${amount}${metric === "treasury" ? ` ${CURRENCY_SYMBOL}` : ""}${why ? `: ${why}` : ""}`;
}

function toastFromReport(report: MonthlyReport): Toast {
  return {
    key: report.id,
    kind: "report",
    title: `Report for ${formatMonthYear(getReportedMonth(report.date))}`,
    message: reportHeadline(report),
    action: { label: "Why?", panel: "reports" },
  };
}

function ToastIcon({ kind }: { kind: Toast["kind"] }) {
  if (kind === "breakdown") return <WrenchIcon size={18} />;
  if (kind === "report") {
    return (
      <svg viewBox="-10 -10 20 20" width={18} height={18} aria-hidden="true">
        <rect x={-6.5} y={-8} width={13} height={16} rx={1.5} fill="none" stroke="currentColor" strokeWidth={1.6} />
        <line x1={-3.5} y1={-3.5} x2={3.5} y2={-3.5} stroke="currentColor" strokeWidth={1.4} />
        <line x1={-3.5} y1={0} x2={3.5} y2={0} stroke="currentColor" strokeWidth={1.4} />
        <line x1={-3.5} y1={3.5} x2={1.5} y2={3.5} stroke="currentColor" strokeWidth={1.4} />
      </svg>
    );
  }
  return (
    <svg viewBox="-10 -10 20 20" width={18} height={18} aria-hidden="true">
      <path d="M0,-8.5 L8.5,7.5 L-8.5,7.5 Z" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
      <line x1={0} y1={-2.5} x2={0} y2={2.5} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <circle cx={0} cy={5} r={1} fill="currentColor" />
    </svg>
  );
}

interface ToastsProps {
  events: GameEvent[];
  monthlyReports: MonthlyReport[];
  isPaused: boolean;
  onOpenPanel: OpenPanel;
}

export function Toasts({ events, monthlyReports, isPaused, onOpenPanel }: ToastsProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // What's already been seen, so loading a save or re-rendering never pops
  // up the whole history — only what arrives from here on.
  const lastEventId = useRef<string | null>(events[0]?.id ?? null);
  const lastReportId = useRef<string | null>(monthlyReports[0]?.id ?? null);

  useEffect(() => {
    const fresh: Toast[] = [];
    for (const event of events) {
      if (event.id === lastEventId.current) break;
      const toast = toastFromEvent(event);
      if (toast) fresh.push(toast);
    }
    lastEventId.current = events[0]?.id ?? null;

    const report = monthlyReports[0];
    if (report && report.id !== lastReportId.current) {
      fresh.unshift(toastFromReport(report));
      lastReportId.current = report.id;
    }
    if (fresh.length === 0) return;

    setToasts((current) => {
      const merged = [...fresh.filter((t) => !current.some((c) => c.message === t.message)), ...current];
      return merged.slice(0, MAX_TOASTS);
    });
  }, [events, monthlyReports]);

  // Each toast leaves on its own after a while — but not while the game is
  // paused: time has stopped, and a pause's reason mustn't vanish unread.
  useEffect(() => {
    if (toasts.length === 0 || isPaused) return;
    const oldest = toasts[toasts.length - 1];
    const id = setTimeout(() => setToasts((current) => current.filter((t) => t.key !== oldest.key)), TOAST_LIFETIME_MS);
    return () => clearTimeout(id);
  }, [toasts, isPaused]);

  if (toasts.length === 0) return null;

  return (
    <div className="toasts surface-leather" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.key} className={`toast toast--${toast.kind}`}>
          <span className="toast__icon">
            <ToastIcon kind={toast.kind} />
          </span>
          <div className="toast__body">
            <strong className="toast__title">{toast.title}</strong>
            <span className="toast__message">{toast.message}</span>
          </div>
          <div className="toast__actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onOpenPanel(toast.action.panel, toast.action.section);
                setToasts((current) => current.filter((t) => t.key !== toast.key));
              }}
            >
              {toast.action.label}
            </button>
            <button
              type="button"
              className="toast__close"
              aria-label="Dismiss"
              onClick={() => setToasts((current) => current.filter((t) => t.key !== toast.key))}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
