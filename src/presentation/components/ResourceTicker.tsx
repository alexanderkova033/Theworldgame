// A slim, always-visible strip of icon+number chips for treasury/population/
// food/industry/stability and the four raw resources — the HOI4-style
// "you can always see where you stand" bar, as opposed to the full Stats
// and Resources panels which are occasional lookups now (see App.tsx).
import "./ResourceTicker.css";
import { Fragment } from "react";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { CountryStats } from "../../domain/country/types";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import type { HeatingOutlook } from "../../application/getHeatingOutlook";
import { isDebtDangerous } from "../../domain/loans/loanRules";
import { calculateDailyPoliticalPower } from "../../domain/politics/politicsRules";
import { formatCompact } from "../formatNumber";
import { RESOURCE_TYPES, type ResourceBundle } from "../../domain/resources/types";
import type { UnrestStage } from "../../domain/unrest/types";
import { UNREST_INFO } from "../unrestStages";
import { UnrestStageIcon } from "./CauseIcon";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ResourceTickerProps {
  stats: CountryStats;
  unrestStage: UnrestStage;
  resources: ResourceBundle;
  production: DailyProductionSummary;
  heating: HeatingOutlook;
  debt: number;
}

const RESOURCE_LABELS: Record<string, string> = {
  wood: "Wood",
  ore: "Ore",
  coal: "Coal",
  grain: "Grain",
  fish: "Fish",
};

function formatExact(value: number): string {
  return Math.round(value).toLocaleString();
}

// Small rates (research points, political power: well under 1/day) keep one
// decimal so they don't round away to nothing.
function roundRate(value: number): number {
  // `|| 0` normalizes a -0 result — otherwise it reads as "positive" for the
  // sign prefix while also printing its own literal minus sign, producing a
  // stray "+-0/d".
  return (Math.abs(value) < 10 ? Math.round(value * 10) / 10 : Math.round(value)) || 0;
}

function formatDelta(value: number): string {
  const rounded = roundRate(value);
  return `${rounded >= 0 ? "+" : ""}${rounded.toLocaleString()}/d`;
}

// A per-day rate riding alongside a chip's current total — see
// getDailyProductionSummary.ts for how it's computed. `undefined` skips the
// chip entirely (population/stability/popularity drift organically rather
// than being "produced," so they don't get one).
function Delta({ value }: { value: number | undefined }) {
  if (value === undefined || roundRate(value) === 0) return null;
  return <span className={`resource-ticker__delta ${value >= 0 ? "is-positive" : "is-negative"}`}>{formatDelta(value)}</span>;
}

function UnrestChip({ stage }: { stage: UnrestStage }) {
  const info = UNREST_INFO[stage];
  const urgent = stage === "strikes" || stage === "riots";
  const tip = `Unrest: ${info.name} (${info.range}) — ${info.effect}${stage === "calm" ? "" : " A crackdown on the Politics tab pulls the country back a stage."}`;
  return (
    <div className={`resource-ticker__chip resource-ticker__unrest is-${stage} ${urgent ? "is-danger" : ""}`} title={tip} aria-label={tip}>
      <UnrestStageIcon stage={stage} size={20} />
      <span>{info.name}</span>
      {urgent && (
        <span className="resource-ticker__alert" aria-hidden="true">
          !
        </span>
      )}
    </div>
  );
}

export function ResourceTicker({ stats, unrestStage, resources, production, heating, debt }: ResourceTickerProps) {
  // Compact ("215k") in the chip itself so a big food stockpile doesn't turn
  // into an unreadable wall of digits; the exact figure is still one hover
  // away via the title/aria-label.
  const statItems: Array<[StatIconType, string, string, string, number | undefined]> = [
    ["treasury", "Treasury", `${formatCompact(stats.treasury)} ${CURRENCY_SYMBOL}`, `${formatExact(stats.treasury)} ${CURRENCY_SYMBOL}`, production.totalIncome],
    [
      "population",
      "Population / homes for",
      `${formatCompact(stats.population)} / ${formatCompact(production.housingCapacity)}`,
      `${formatExact(stats.population)} of ${formatExact(production.housingCapacity)} housed${stats.population > production.housingCapacity ? ` — ${formatExact(stats.population - production.housingCapacity)} without a home` : ""}`,
      undefined,
    ],
    ["food", "Food", formatCompact(stats.food), formatExact(stats.food), production.netFood],
    ["industry", "Industry", formatCompact(stats.industry), formatExact(stats.industry), undefined],
    ["stability", "Stability", `${formatExact(stats.stability)}/100`, `${formatExact(stats.stability)}/100`, undefined],
    ["popularity", "Popularity", `${formatExact(stats.popularity)}%`, `${formatExact(stats.popularity)}%`, undefined],
    ["research", "Research (all areas)", `${production.researchPerDay.toFixed(1)}/d`, `${production.researchPerDay.toFixed(2)} per day`, undefined],
    ["politicalPower", "Political power", formatExact(Math.floor(stats.politicalPower)), stats.politicalPower.toFixed(1), calculateDailyPoliticalPower(stats.popularity)],
  ];

  return (
    <div className="resource-ticker">
      {statItems.map(([icon, label, displayValue, exactValue, delta]) => (
        <Fragment key={label}>
          <div
            className={`resource-ticker__chip ${icon === "population" && (stats.population > production.housingCapacity || production.unheatedShare > 0) ? "is-danger" : ""}`}
            title={delta !== undefined ? `${label}: ${exactValue} (${formatDelta(delta)})` : `${label}: ${exactValue}`}
            aria-label={delta !== undefined ? `${label}: ${exactValue}, ${formatDelta(delta)}` : `${label}: ${exactValue}`}
          >
            <StatIcon type={icon} size={20} />
            <span>{displayValue}</span>
            {icon === "population" && (stats.population > production.housingCapacity || production.unheatedShare > 0) && (
              <span className="resource-ticker__alert" aria-hidden="true">
                !
              </span>
            )}
            <Delta value={delta} />
          </div>
          {/* Beside stability: how far its fall has escalated (see domain/unrest). */}
          {icon === "stability" && <UnrestChip stage={unrestStage} />}
        </Fragment>
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
      {/* All winter: how many days the coal and wood in stock keep homes warm. */}
      {heating.isWinter && heating.fuelPerDay > 0 && (
        <div
          className={`resource-ticker__chip ${heating.daysOfFuel < 10 ? "is-danger" : ""}`}
          title={`Heating: ${Math.floor(heating.fuel)} coal + wood in stock, homes burn ${heating.fuelPerDay.toFixed(1)} a day — lasts ${Math.floor(heating.daysOfFuel)} days`}
        >
          <svg width={20} height={20} viewBox="-10 -10 20 20" aria-hidden="true">
            <path d="M0,-9 C4,-4 7,-1 7,3 C7,7 4,9.5 0,9.5 C-4,9.5 -7,7 -7,3 C-7,-1 -3,-2 -2,-6 C-1,-3 1,-2 0,-9 Z" fill="#e0703a" />
            <path d="M0,-1 C2.5,2 3.5,3.5 3.5,5.5 C3.5,7.6 2,9 0,9 C-2,9 -3.5,7.6 -3.5,5.5 C-3.5,3.5 -1.5,2.5 0,-1 Z" fill="#f0c869" />
          </svg>
          <span>{Math.floor(heating.daysOfFuel)}d</span>
          {heating.daysOfFuel < 10 && (
            <span className="resource-ticker__alert" aria-hidden="true">
              !
            </span>
          )}
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
