// A slim, always-visible strip of icon+number chips for treasury/population/
// food/industry/stability and the four raw resources — the HOI4-style
// "you can always see where you stand" bar, as opposed to the full Stats
// and Resources panels which are occasional lookups now (see App.tsx).
import "./ResourceTicker.css";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { CountryStats } from "../../domain/country/types";
import { RESOURCE_TYPES, type ResourceBundle } from "../../domain/resources/types";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ResourceTickerProps {
  stats: CountryStats;
  resources: ResourceBundle;
}

const RESOURCE_LABELS: Record<string, string> = {
  wood: "Wood",
  ore: "Ore",
  grain: "Grain",
  fish: "Fish",
};

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

export function ResourceTicker({ stats, resources }: ResourceTickerProps) {
  const statItems: Array<[StatIconType, string, string]> = [
    ["treasury", "Treasury", `${formatNumber(stats.treasury)} ${CURRENCY_SYMBOL}`],
    ["population", "Population", formatNumber(stats.population)],
    ["food", "Food", formatNumber(stats.food)],
    ["industry", "Industry", formatNumber(stats.industry)],
    ["stability", "Stability", `${formatNumber(stats.stability)}/100`],
    ["popularity", "Popularity", `${formatNumber(stats.popularity)}%`],
  ];

  return (
    <div className="resource-ticker">
      {statItems.map(([icon, label, value]) => (
        <div className="resource-ticker__chip" key={label} title={label} aria-label={`${label}: ${value}`}>
          <StatIcon type={icon} size={20} />
          <span>{value}</span>
        </div>
      ))}
      <div className="resource-ticker__divider" />
      {RESOURCE_TYPES.map((type) => (
        <div
          className="resource-ticker__chip"
          key={type}
          title={RESOURCE_LABELS[type]}
          aria-label={`${RESOURCE_LABELS[type]}: ${formatNumber(resources[type])}`}
        >
          <svg width={20} height={20} viewBox="-10 -10 20 20">
            <ResourceIcon type={type} size={8} />
          </svg>
          <span>{formatNumber(resources[type])}</span>
        </div>
      ))}
    </div>
  );
}
