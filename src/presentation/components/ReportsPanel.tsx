import "./ReportsPanel.css";
import { useState } from "react";
import { formatMonthYear, getReportedMonth } from "../../domain/country/calendar";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { MonthlyReport } from "../../domain/country/types";
import { getLedgerTotal, getRankedCauses, LEDGER_METRICS, type RankedCause } from "../../domain/ledger/ledgerRules";
import type { Ledger, LedgerMetric } from "../../domain/ledger/types";
import { formatSignedChange } from "../formatNumber";
import { getCauseInfo, METRIC_ICONS, METRIC_LABELS } from "../causes";
import { NavIcon } from "./NavIcon";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ReportsPanelProps {
  reports: MonthlyReport[];
}

// How many causes each number lists before the rest fold into "Other".
const MAX_CAUSES = 5;

// Crowns and food are big round numbers; support and stability are points
// where a tenth still matters.
function formatChange(metric: LedgerMetric | "population", value: number): string {
  return formatSignedChange(value, metric === "support" || metric === "stability");
}

function reportTotal(report: MonthlyReport, metric: LedgerMetric): number | null {
  if (report.ledger) return getLedgerTotal(report.ledger, metric);
  // Reports from before causes were tracked only knew income and stability.
  if (metric === "treasury") return report.totalIncome;
  if (metric === "stability") return report.stabilityChange;
  return null;
}

// A tiny bar sparkline, not a line — these are per-month net changes that
// swing around zero, and a smoothed line would blur exactly the swings the
// player wants to see. Bars use the app's existing success/danger status
// tokens (same green/red already used for law benefit/cost), since the
// series' meaning is "gain vs loss," not an arbitrary series identity.
function TrendSparkline({ icon, label, values }: { icon: StatIconType; label: string; values: number[] }) {
  const width = 132;
  const height = 36;
  const baseline = height / 2;
  const gap = 3;
  const barWidth = values.length > 0 ? (width - gap * (values.length - 1)) / values.length : width;
  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
  const scale = (height / 2 - 3) / maxAbs;

  return (
    <div className="reports-panel__sparkline">
      <span className="reports-panel__sparkline-label">
        <StatIcon type={icon} size={15} />
        {label}
      </span>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} trend, last ${values.length} months`}>
        <line x1={0} y1={baseline} x2={width} y2={baseline} className="reports-panel__sparkline-baseline" />
        {values.map((value, i) => {
          const barHeight = value === 0 ? 0 : Math.max(Math.abs(value) * scale, 1.5);
          const x = i * (barWidth + gap);
          const y = value >= 0 ? baseline - barHeight : baseline;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={Math.min(1.5, barWidth / 2)}
              className={value >= 0 ? "reports-panel__sparkline-bar--gain" : "reports-panel__sparkline-bar--loss"}
            />
          );
        })}
      </svg>
    </div>
  );
}

// One number in a month's summary row: its icon and signed change.
function Metric({ icon, value, label, metric }: { icon: StatIconType; value: number; label: string; metric: LedgerMetric | "population" }) {
  const text = formatChange(metric, value);
  const tone = text.startsWith("+") ? "is-gain" : text.startsWith("−") ? "is-loss" : "";
  return (
    <span className="reports-panel__metric" title={`${label}: ${text}${metric === "treasury" ? ` ${CURRENCY_SYMBOL}` : ""}`}>
      <StatIcon type={icon} size={17} />
      <span className={`reports-panel__metric-value ${tone}`}>{text}</span>
    </span>
  );
}

// The causes behind one number, biggest first, each as a bar growing left
// (a loss) or right (a gain) from the middle line — the side carries the
// sign as well as the colour and the +/− in the figure.
function CauseBreakdown({ ledger, metric }: { ledger: Ledger; metric: LedgerMetric }) {
  const total = getLedgerTotal(ledger, metric);
  const ranked = getRankedCauses(ledger, metric).filter((c) => formatChange(metric, c.value) !== "0");
  const shown: RankedCause[] = ranked.slice(0, MAX_CAUSES);
  const rest = ranked.slice(MAX_CAUSES).reduce((sum, c) => sum + c.value, 0);
  if (rest !== 0 && formatChange(metric, rest) !== "0") shown.push({ cause: "other", value: rest });
  const maxAbs = Math.max(...shown.map((c) => Math.abs(c.value)), 1e-9);

  return (
    <section className="reports-cause" aria-label={`${METRIC_LABELS[metric]}: why it changed`}>
      <header className="reports-cause__head">
        <StatIcon type={METRIC_ICONS[metric]} size={18} />
        <span className="reports-cause__title">{METRIC_LABELS[metric]}</span>
        <strong className={`reports-cause__total ${total > 0 ? "is-gain" : total < 0 ? "is-loss" : ""}`}>
          {formatChange(metric, total)}
        </strong>
      </header>
      {shown.length === 0 ? (
        <p className="reports-cause__empty">No change</p>
      ) : (
        <ul className="reports-cause__list">
          {shown.map(({ cause, value }) => {
            const info = getCauseInfo(metric, cause);
            const width = `${(Math.abs(value) / maxAbs) * 50}%`;
            return (
              <li key={cause} className="reports-cause__row" title={info.hint || undefined}>
                <span className="reports-cause__icon">{info.icon(16)}</span>
                <span className="reports-cause__label">{info.label}</span>
                <span className="reports-cause__bar" aria-hidden="true">
                  <span className={`reports-cause__fill ${value >= 0 ? "is-gain" : "is-loss"}`} style={{ width }} />
                </span>
                <span className={`reports-cause__value ${value >= 0 ? "is-gain" : "is-loss"}`}>{formatChange(metric, value)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ReportRow({ report, expanded, onToggle }: { report: MonthlyReport; expanded: boolean; onToggle: () => void }) {
  const canExpand = report.ledger !== undefined;
  const summary = (
    <>
      <span className="reports-panel__month">{formatMonthYear(getReportedMonth(report.date))}</span>
      {LEDGER_METRICS.map((metric) => {
        const value = reportTotal(report, metric);
        return value === null ? (
          <span key={metric} />
        ) : (
          <Metric key={metric} icon={METRIC_ICONS[metric]} value={value} label={METRIC_LABELS[metric]} metric={metric} />
        );
      })}
      <Metric icon="population" value={report.populationChange} label="Population" metric="population" />
      <span className="reports-panel__chevron" aria-hidden="true">
        {canExpand ? (expanded ? "▾" : "▸") : ""}
      </span>
    </>
  );

  return (
    <li className={`reports-panel__item ${expanded ? "is-expanded" : ""}`}>
      {canExpand ? (
        <button type="button" className="reports-panel__summary" aria-expanded={expanded} onClick={onToggle}>
          {summary}
        </button>
      ) : (
        <div className="reports-panel__summary">{summary}</div>
      )}
      {expanded && report.ledger && (
        <div className="reports-panel__causes">
          {LEDGER_METRICS.map((metric) => (
            <CauseBreakdown key={metric} ledger={report.ledger!} metric={metric} />
          ))}
        </div>
      )}
    </li>
  );
}

export function ReportsPanel({ reports }: ReportsPanelProps) {
  const recent = reports.slice(0, 6);
  const chronological = [...recent].reverse();
  // The latest month opens with its causes showing; older ones on a click.
  const [openId, setOpenId] = useState<string | null>(recent[0]?.id ?? null);

  return (
    <section className="panel reports-panel">
      <h2>Monthly Reports</h2>
      {recent.length === 0 && (
        <div className="reports-panel__empty">
          <span aria-hidden="true">
            <NavIcon type="reports" size={28} />
          </span>
          <p>Nothing yet — the first report lands next month.</p>
        </div>
      )}

      {recent.length > 1 && (
        <div className="reports-panel__trends">
          <TrendSparkline icon="treasury" label={`${chronological.length} mo.`} values={chronological.map((r) => reportTotal(r, "treasury") ?? 0)} />
          <TrendSparkline icon="population" label={`${chronological.length} mo.`} values={chronological.map((r) => r.populationChange)} />
        </div>
      )}

      <ul className="reports-panel__list">
        {recent.map((report) => (
          <ReportRow
            key={report.id}
            report={report}
            expanded={openId === report.id}
            onToggle={() => setOpenId((current) => (current === report.id ? null : report.id))}
          />
        ))}
      </ul>
    </section>
  );
}
