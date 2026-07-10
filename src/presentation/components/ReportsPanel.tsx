import "./ReportsPanel.css";
import { formatMonthYear } from "../../domain/country/calendar";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { MonthlyReport } from "../../domain/country/types";
import { StatIcon } from "./StatIcon";

interface ReportsPanelProps {
  reports: MonthlyReport[];
}

function formatSigned(value: number): string {
  const rounded = Math.round(value);
  return rounded >= 0 ? `+${rounded}` : `${rounded}`;
}

export function ReportsPanel({ reports }: ReportsPanelProps) {
  const recent = reports.slice(0, 6);

  return (
    <section className="panel reports-panel">
      <h2>Monthly Reports</h2>
      {recent.length === 0 && <p className="reports-panel__empty">No reports yet — check back after the first month.</p>}
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
