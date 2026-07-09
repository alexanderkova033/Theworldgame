import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { CountryStats } from "../../domain/country/types";
import { StatIcon, type StatIconType } from "./StatIcon";

interface StatsPanelProps {
  stats: CountryStats;
  taxRate: number;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

export function StatsPanel({ stats, taxRate }: StatsPanelProps) {
  const rows: Array<[StatIconType | null, string, string]> = [
    ["treasury", "Treasury", `${formatNumber(stats.treasury)} ${CURRENCY_SYMBOL}`],
    ["population", "Population", formatNumber(stats.population)],
    ["food", "Food", formatNumber(stats.food)],
    ["industry", "Industry", formatNumber(stats.industry)],
    ["stability", "Stability", `${formatNumber(stats.stability)}/100`],
    ["army", "Army Strength", formatNumber(stats.armyStrength)],
    ["research", "Research Points", formatNumber(stats.researchPoints)],
    ["popularity", "Popularity", `${formatNumber(stats.popularity)}/100`],
    [null, "Tax Rate", `${Math.round(taxRate * 100)}%`],
  ];

  return (
    <section className="panel stats-panel">
      <h2>Country Stats</h2>
      <dl className="stats-panel__grid">
        {rows.map(([icon, label, value]) => (
          <div className="stats-panel__row" key={label}>
            <dt>
              {icon && <StatIcon type={icon} />}
              {label}
            </dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
