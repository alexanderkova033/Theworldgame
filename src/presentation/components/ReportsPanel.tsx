import "./ReportsPanel.css";
import { formatMonthYear } from "../../domain/country/calendar";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { MonthlyReport } from "../../domain/country/types";
import { NavIcon } from "./NavIcon";
import { StatIcon } from "./StatIcon";

interface ReportsPanelProps {
  reports: MonthlyReport[];
}

function formatSigned(value: number): string {
  const rounded = Math.round(value);
  return rounded >= 0 ? `+${rounded}` : `${rounded}`;
}

// A tiny bar sparkline, not a line — these are per-month net changes that
// swing around zero, and a smoothed line would blur exactly the swings the
// player wants to see. Bars use the app's existing success/danger status
// tokens (same green/red already used for law benefit/cost), since the
// series' meaning is "gain vs loss," not an arbitrary series identity.
function TrendSparkline({ label, values }: { label: string; values: number[] }) {
  const width = 132;
  const height = 36;
  const baseline = height / 2;
  const gap = 3;
  const barWidth = values.length > 0 ? (width - gap * (values.length - 1)) / values.length : width;
  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
  const scale = (height / 2 - 3) / maxAbs;

  return (
    <div className="reports-panel__sparkline">
      <span className="reports-panel__sparkline-label">{label}</span>
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
          <p>No reports yet — check back after the first month.</p>
        </div>
      )}

      {recent.length > 1 && (
        <div className="reports-panel__trends">
          <TrendSparkline label={`Treasury (last ${chronological.length} mo.)`} values={chronological.map((r) => r.netTreasuryChange)} />
          <TrendSparkline label={`Population (last ${chronological.length} mo.)`} values={chronological.map((r) => r.populationChange)} />
        </div>
      )}

      <ul className="reports-panel__list">
        {recent.map((report) => (
          <li key={report.id} className="reports-panel__item">
            <div className="reports-panel__item-header">{formatMonthYear(report.date)}</div>
            <div className="reports-panel__item-row">
              <span className="reports-panel__row-label">
                <StatIcon type="treasury" size={18} /> Income
              </span>
              <span>+{Math.round(report.totalIncome)} {CURRENCY_SYMBOL}</span>
            </div>
            <div className="reports-panel__item-row">
              <span className="reports-panel__row-label">
                <StatIcon type="treasury" size={18} /> Expenses
              </span>
              <span>-{Math.round(report.totalExpenses)} {CURRENCY_SYMBOL}</span>
            </div>
            <div className="reports-panel__item-row">
              <span className="reports-panel__row-label">
                <StatIcon type="treasury" size={18} /> Net Treasury
              </span>
              <span>{formatSigned(report.netTreasuryChange)}</span>
            </div>
            <div className="reports-panel__item-row">
              <span className="reports-panel__row-label">
                <StatIcon type="population" size={18} /> Population
              </span>
              <span>{formatSigned(report.populationChange)}</span>
            </div>
            <div className="reports-panel__item-row">
              <span className="reports-panel__row-label">
                <StatIcon type="stability" size={18} /> Stability
              </span>
              <span>{formatSigned(report.stabilityChange)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
