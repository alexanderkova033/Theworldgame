// The monthly report, set out to be read at a glance: one month at a time,
// its five numbers big and labelled at the head (what moved, which way, by
// how much), then why each one moved, then every recent month as a table
// with named columns — click a row to read that month.
import "./ReportsPanel.css";
import { useState } from "react";
import { formatMonthYear, getReportedMonth } from "../../domain/country/calendar";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { MonthlyReport } from "../../domain/country/types";
import { getLedgerTotal, LEDGER_METRICS } from "../../domain/ledger/ledgerRules";
import type { LedgerMetric } from "../../domain/ledger/types";
import { formatChange, METRIC_ICONS, METRIC_LABELS } from "../causes";
import { CauseBreakdown } from "./CauseBreakdown";
import { NavIcon } from "./NavIcon";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ReportsPanelProps {
  reports: MonthlyReport[];
}

type Column = LedgerMetric | "population";

const COLUMNS: Array<{ key: Column; label: string; icon: StatIconType; unit: string }> = [
  { key: "treasury", label: METRIC_LABELS.treasury, icon: METRIC_ICONS.treasury, unit: CURRENCY_SYMBOL },
  { key: "food", label: METRIC_LABELS.food, icon: METRIC_ICONS.food, unit: "food" },
  { key: "support", label: METRIC_LABELS.support, icon: METRIC_ICONS.support, unit: "points" },
  { key: "stability", label: METRIC_LABELS.stability, icon: METRIC_ICONS.stability, unit: "points" },
  { key: "population", label: "People", icon: "population", unit: "people" },
];

function reportValue(report: MonthlyReport, column: Column): number | null {
  if (column === "population") return report.populationChange;
  if (report.ledger) return getLedgerTotal(report.ledger, column);
  // Reports from before causes were tracked only knew income and stability.
  if (column === "treasury") return report.totalIncome;
  if (column === "stability") return report.stabilityChange;
  return null;
}

function tone(text: string): "is-gain" | "is-loss" | "is-flat" {
  return text.startsWith("+") ? "is-gain" : text.startsWith("−") || text.startsWith("-") ? "is-loss" : "is-flat";
}

// An up or down arrow beside a change — the direction as a shape, not only
// as a colour.
function Arrow({ direction }: { direction: "is-gain" | "is-loss" | "is-flat" }) {
  if (direction === "is-flat") return null;
  return (
    <svg className="report-arrow" viewBox="-6 -6 12 12" width={14} height={14} aria-hidden="true">
      <path d={direction === "is-gain" ? "M0,-5 L5,3 L-5,3 Z" : "M0,5 L5,-3 L-5,-3 Z"} fill="currentColor" />
    </svg>
  );
}

function Tile({ report, column }: { report: MonthlyReport; column: (typeof COLUMNS)[number] }) {
  const value = reportValue(report, column.key);
  const text = value === null ? "–" : formatChange(column.key, value);
  const direction = value === null ? "is-flat" : tone(text);
  return (
    <div className={`report-tile ${direction}`}>
      <span className="report-tile__label">
        <StatIcon type={column.icon} size={18} />
        {column.label}
      </span>
      <strong className="report-tile__value">
        <Arrow direction={direction} />
        {text}
      </strong>
      <span className="report-tile__unit">{column.unit} this month</span>
    </div>
  );
}

export function ReportsPanel({ reports }: ReportsPanelProps) {
  const recent = reports.slice(0, 6);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = recent.find((r) => r.id === selectedId) ?? recent[0];

  if (!selected) {
    return (
      <section className="panel reports-panel">
        <h2>Monthly Report</h2>
        <div className="reports-panel__empty">
          <span aria-hidden="true">
            <NavIcon type="reports" size={32} />
          </span>
          <p>Nothing yet. The first report lands on the 1st of next month.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel reports-panel">
      <h2>Monthly Report</h2>

      <p className="report-head">
        <span className="report-head__month">{formatMonthYear(getReportedMonth(selected.date))}</span>
        <span className="report-head__note">{selected.id === recent[0].id ? "The month just ended" : "An earlier month"}</span>
      </p>

      <div className="report-tiles">
        {COLUMNS.map((column) => (
          <Tile key={column.key} report={selected} column={column} />
        ))}
      </div>

      {selected.ledger && (
        <>
          <h3 className="report-section-title">Why it changed</h3>
          <div className="report-causes">
            {LEDGER_METRICS.map((metric) => (
              <CauseBreakdown key={metric} ledger={selected.ledger!} metric={metric} />
            ))}
          </div>
        </>
      )}

      {recent.length > 1 && (
        <>
          <h3 className="report-section-title">Month by month</h3>
          <table className="report-history">
            <thead>
              <tr>
                <th scope="col">Month</th>
                {COLUMNS.map((column) => (
                  <th scope="col" key={column.key}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((report) => {
                const isSelected = report.id === selected.id;
                return (
                  <tr key={report.id} className={isSelected ? "is-selected" : ""} onClick={() => setSelectedId(report.id)}>
                    <th scope="row">
                      <button type="button" className="report-history__month" aria-pressed={isSelected} onClick={() => setSelectedId(report.id)}>
                        {formatMonthYear(getReportedMonth(report.date))}
                      </button>
                    </th>
                    {COLUMNS.map((column) => {
                      const value = reportValue(report, column.key);
                      const text = value === null ? "–" : formatChange(column.key, value);
                      return (
                        <td key={column.key} className={value === null ? "is-flat" : tone(text)}>
                          {text}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
