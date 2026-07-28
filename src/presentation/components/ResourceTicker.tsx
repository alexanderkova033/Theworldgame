// A slim, always-visible strip of icon+number chips for treasury/population/
// food/industry/stability and the four raw resources — the HOI4-style
// "you can always see where you stand" bar, as opposed to the full Stats
// and Resources panels which are occasional lookups now (see App.tsx).
import "./ResourceTicker.css";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { CountryStats } from "../../domain/country/types";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { isDebtDangerous } from "../../domain/loans/loanRules";
import { formatCompact } from "../formatNumber";
import { RESOURCE_TYPES, type ResourceBundle } from "../../domain/resources/types";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ResourceTickerProps {
  stats: CountryStats;
  resources: ResourceBundle;
  production: DailyProductionSummary;
  debt: number;
}

const RESOURCE_LABELS: Record<string, string> = {
  wood: "Wood",
  ore: "Ore",
  grain: "Grain",
  fish: "Fish",
};

function formatExact(value: number): string {
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

export function ResourceTicker({ stats, resources, production, debt }: ResourceTickerProps) {
  // Compact ("215k") in the chip itself so a big food stockpile doesn't turn
  // into an unreadable wall of digits; the exact figure is still one hover
  // away via the title/aria-label.
  const statItems: Array<[StatIconType, string, string, string, number | undefined]> = [
    ["treasury", "Treasury", `${formatCompact(stats.treasury)} ${CURRENCY_SYMBOL}`, `${formatExact(stats.treasury)} ${CURRENCY_SYMBOL}`, production.totalIncome],
    ["population", "Population", formatCompact(stats.population), formatExact(stats.population), undefined],
    ["food", "Food", formatCompact(stats.food), formatExact(stats.food), production.netFood],
    ["industry", "Industry", formatCompact(stats.industry), formatExact(stats.industry), undefined],
    ["stability", "Stability", `${formatExact(stats.stability)}/100`, `${formatExact(stats.stability)}/100`, undefined],
    ["popularity", "Popularity", `${formatExact(stats.popularity)}%`, `${formatExact(stats.popularity)}%`, undefined],
  ];

  return (
    <div className="resource-ticker" data-tutorial="ticker">
      {statItems.map(([icon, label, displayValue, exactValue, delta]) => (
        <div
          className="resource-ticker__chip"
          key={label}
          title={delta !== undefined ? `${label}: ${exactValue} (${formatDelta(delta)})` : `${label}: ${exactValue}`}
          aria-label={delta !== undefined ? `${label}: ${exactValue}, ${formatDelta(delta)}` : `${label}: ${exactValue}`}
        >
          <StatIcon type={icon} size={20} />
          <span>{displayValue}</span>
          <Delta value={delta} />
        </div>
      ))}
      {debt > 0 && (
        <div
          className={`resource-ticker__chip ${isDebtDangerous(debt) ? "is-danger" : ""}`}
          title={`Debt: ${formatExact(debt)} ${CURRENCY_SYMBOL}${isDebtDangerous(debt) ? " — dangerous, hurting stability & popularity" : ""}`}
          aria-label={`Debt: ${formatExact(debt)} ${CURRENCY_SYMBOL}`}
        >
          <StatIcon type="treasury" size={20} />
          <span>{formatCompact(debt)} owed</span>
        </div>
      )}
      <div className="resource-ticker__divider" />
      {RESOURCE_TYPES.map((type) => (
        <div
          className="resource-ticker__chip"
          key={type}
          title={`${RESOURCE_LABELS[type]}: ${formatExact(resources[type])} (${formatDelta(production.resourceProduction[type])})`}
          aria-label={`${RESOURCE_LABELS[type]}: ${formatExact(resources[type])}, ${formatDelta(production.resourceProduction[type])}`}
        >
          <svg width={20} height={20} viewBox="-10 -10 20 20">
            <ResourceIcon type={type} size={8} />
          </svg>
          <span>{formatCompact(resources[type])}</span>
          <Delta value={production.resourceProduction[type]} />
        </div>
      ))}
    </div>
  );
}
