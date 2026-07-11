// A slim, always-visible strip of icon+number chips for treasury/population/
// food/industry/stability and the four raw resources — the HOI4-style
// "you can always see where you stand" bar, as opposed to the full Stats
// and Resources panels which are occasional lookups now (see App.tsx).
import "./ResourceTicker.css";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { CountryStats } from "../../domain/country/types";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { RESOURCE_TYPES, type ResourceBundle } from "../../domain/resources/types";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ResourceTickerProps {
  stats: CountryStats;
  resources: ResourceBundle;
  production: DailyProductionSummary;
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

function formatDelta(value: number): string {
  // `|| 0` normalizes a -0 result — otherwise it reads as "positive" for the
  // sign prefix while also printing its own literal minus sign, producing a
  // stray "+-0/d" (this runs even when the chip itself is hidden, since the
  // hover tooltip always shows it — see the Delta component's zero-guard).
  const rounded = Math.round(value) || 0;
  return `${rounded >= 0 ? "+" : ""}${rounded.toLocaleString()}/d`;
}

// A per-day rate riding alongside a chip's current total — see
// getDailyProductionSummary.ts for how it's computed. `undefined` skips the
// chip entirely (population/stability/popularity drift organically rather
// than being "produced," so they don't get one).
function Delta({ value }: { value: number | undefined }) {
  if (value === undefined || Math.round(value) === 0) return null;
  return <span className={`resource-ticker__delta ${value >= 0 ? "is-positive" : "is-negative"}`}>{formatDelta(value)}</span>;
}

export function ResourceTicker({ stats, resources, production }: ResourceTickerProps) {
  const statItems: Array<[StatIconType, string, string, number | undefined]> = [
    ["treasury", "Treasury", `${formatNumber(stats.treasury)} ${CURRENCY_SYMBOL}`, production.netTreasury],
    ["population", "Population", formatNumber(stats.population), undefined],
    ["food", "Food", formatNumber(stats.food), production.netFood],
    ["industry", "Industry", formatNumber(stats.industry), undefined],
    ["stability", "Stability", `${formatNumber(stats.stability)}/100`, undefined],
    ["popularity", "Popularity", `${formatNumber(stats.popularity)}%`, undefined],
  ];

  return (
    <div className="resource-ticker" data-tutorial="ticker">
      {statItems.map(([icon, label, value, delta]) => (
        <div
          className="resource-ticker__chip"
          key={label}
          title={delta !== undefined ? `${label}: ${value} (${formatDelta(delta)})` : label}
          aria-label={delta !== undefined ? `${label}: ${value}, ${formatDelta(delta)}` : `${label}: ${value}`}
        >
          <StatIcon type={icon} size={20} />
          <span>{value}</span>
          <Delta value={delta} />
        </div>
      ))}
      <div className="resource-ticker__divider" />
      {RESOURCE_TYPES.map((type) => (
        <div
          className="resource-ticker__chip"
          key={type}
          title={`${RESOURCE_LABELS[type]}: ${formatNumber(resources[type])} (${formatDelta(production.resourceProduction[type])})`}
          aria-label={`${RESOURCE_LABELS[type]}: ${formatNumber(resources[type])}, ${formatDelta(production.resourceProduction[type])}`}
        >
          <svg width={20} height={20} viewBox="-10 -10 20 20">
            <ResourceIcon type={type} size={8} />
          </svg>
          <span>{formatNumber(resources[type])}</span>
          <Delta value={production.resourceProduction[type]} />
        </div>
      ))}
    </div>
  );
}
