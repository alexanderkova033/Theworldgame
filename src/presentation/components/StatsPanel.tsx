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
      <dl className="stats-panel__grid">
        {rows.map(([icon, label, value]) => (
          <div className="stats-panel__row" key={label}>
            <dt>
              <StatIcon type={icon} />
              {label}
            </dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
