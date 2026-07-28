import "./ReportsPanel.css";
import { formatMonthYear } from "../../domain/country/calendar";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { MonthlyReport } from "../../domain/country/types";
import { formatCompact } from "../formatNumber";
import { NavIcon } from "./NavIcon";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ReportsPanelProps {
  reports: MonthlyReport[];
}

function formatSigned(value: number): string {
  const rounded = Math.round(value) || 0;
  return `${rounded >= 0 ? "+" : ""}${formatCompact(rounded)}`;
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

// One month, one row: three icon+figure cells instead of five labeled
// sentences. The old labels were the same three words repeated down the
// whole panel — the glyph says it in the width of a character.
function Metric({ icon, value, suffix = "", title }: { icon: StatIconType; value: number; suffix?: string; title: string }) {
  const rounded = Math.round(value) || 0;
  return (
    <span className="reports-panel__metric" title={`${title}: ${formatSigned(value)}${suffix}`}>
      <StatIcon type={icon} size={17} />
      <span className={`reports-panel__metric-value ${rounded > 0 ? "is-gain" : rounded < 0 ? "is-loss" : ""}`}>
        {formatSigned(value)}
        {suffix}
      </span>
    </span>
  );
}

export function ReportsPanel({ reports }: ReportsPanelProps) {
  const recent = reports.slice(0, 6);
  const chronological = [...recent].reverse();

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
          <TrendSparkline icon="treasury" label={`${chronological.length} mo.`} values={chronological.map((r) => r.totalIncome)} />
          <TrendSparkline icon="population" label={`${chronological.length} mo.`} values={chronological.map((r) => r.populationChange)} />
        </div>
      )}

      <ul className="reports-panel__list">
        {recent.map((report) => (
          <li key={report.id} className="reports-panel__item">
            <span className="reports-panel__month">{formatMonthYear(report.date)}</span>
            <Metric icon="treasury" value={report.totalIncome} suffix={` ${CURRENCY_SYMBOL}`} title="Income" />
            <Metric icon="population" value={report.populationChange} title="Population" />
            <Metric icon="stability" value={report.stabilityChange} title="Stability" />
          </li>
        ))}
      </ul>
    </section>
  );
}
