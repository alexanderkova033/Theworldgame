import "./StatsPanel.css";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { CountryStats } from "../../domain/country/types";
import { StatIcon, type StatIconType } from "./StatIcon";

interface StatsPanelProps {
  stats: CountryStats;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

// Army/Research/Popularity/Tax Rate are hidden for now, alongside the
// Development/Military/Taxes actions that would let you affect them — see
// ActionsPanel.tsx. They come back together.
export function StatsPanel({ stats }: StatsPanelProps) {
  const rows: Array<[StatIconType, string, string]> = [
    ["treasury", "Treasury", `${formatNumber(stats.treasury)} ${CURRENCY_SYMBOL}`],
    ["population", "Population", formatNumber(stats.population)],
    ["food", "Food", formatNumber(stats.food)],
    ["industry", "Industry", formatNumber(stats.industry)],
    ["stability", "Stability", `${formatNumber(stats.stability)}/100`],
  ];

  return (
    <section className="panel stats-panel">
      <h2>Country Stats</h2>
      <div className="icon-tile-list">
        {rows.map(([icon, label, value]) => (
          <div className="icon-tile" key={label}>
            <div className="icon-tile__icon">
              <StatIcon type={icon} />
            </div>
            <div className="icon-tile__body">
              <span className="icon-tile__label">{label}</span>
              <span className="icon-tile__value">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
