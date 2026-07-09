import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { CountryStats } from "../../domain/country/types";

interface StatsPanelProps {
  stats: CountryStats;
  taxRate: number;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

export function StatsPanel({ stats, taxRate }: StatsPanelProps) {
  const rows: Array<[string, string]> = [
    ["Treasury", `${formatNumber(stats.treasury)} ${CURRENCY_SYMBOL}`],
    ["Population", formatNumber(stats.population)],
    ["Food", formatNumber(stats.food)],
    ["Industry", formatNumber(stats.industry)],
    ["Stability", `${formatNumber(stats.stability)}/100`],
    ["Army Strength", formatNumber(stats.armyStrength)],
    ["Research Points", formatNumber(stats.researchPoints)],
    ["Popularity", `${formatNumber(stats.popularity)}/100`],
    ["Tax Rate", `${Math.round(taxRate * 100)}%`],
  ];

  return (
    <section className="panel stats-panel">
      <h2>Country Stats</h2>
      <dl className="stats-panel__grid">
        {rows.map(([label, value]) => (
          <div className="stats-panel__row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
