// The always-visible strip under the nation's name: only the five numbers
// that decide whether the government survives — treasury, people and
// homes, food, stability (with its unrest stage) and support — plus debt
// and heating when they matter. The raw resources sit behind one Stores
// button; a resource that's actually running short (building materials a
// project is about to stall on) comes back out onto the bar with a "!".
// Political power and research have their own tabs (Politics/Laws,
// Research), where they're spent.
import "./ResourceTicker.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ADVISOR_WINTER_PREP_DAYS, CURRENCY_SYMBOL } from "../../domain/constants";
import type { CountryStats } from "../../domain/country/types";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import type { HeatingOutlook } from "../../application/getHeatingOutlook";
import type { MaterialShortage } from "../../application/getMaterialShortages";
import { isDebtDangerous } from "../../domain/loans/loanRules";
import { formatCompact } from "../formatNumber";
import { RESOURCE_TYPES, type ResourceBundle, type ResourceType } from "../../domain/resources/types";
import type { UnrestStage } from "../../domain/unrest/types";
import { UNREST_INFO } from "../unrestStages";
import { FlameIcon, UnrestStageIcon } from "./CauseIcon";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";

interface ResourceTickerProps {
  stats: CountryStats;
  unrestStage: UnrestStage;
  resources: ResourceBundle;
  production: DailyProductionSummary;
  heating: HeatingOutlook;
  debt: number;
  shortages: MaterialShortage[];
}

const RESOURCE_LABELS: Record<ResourceType, string> = {
  wood: "Wood",
  ore: "Ore",
  coal: "Coal",
  grain: "Grain",
  fish: "Fish",
};

function formatExact(value: number): string {
  return Math.round(value).toLocaleString();
}

// Small rates (well under 1/day) keep one decimal so they don't round away.
function roundRate(value: number): number {
  // `|| 0` normalizes a -0 result, which would otherwise print as "+-0/d".
  return (Math.abs(value) < 10 ? Math.round(value * 10) / 10 : Math.round(value)) || 0;
}

function formatDelta(value: number): string {
  const rounded = roundRate(value);
  return `${rounded >= 0 ? "+" : ""}${rounded.toLocaleString()}/d`;
}

// A per-day rate riding alongside a chip's current total — see
// getDailyProductionSummary.ts.
function Delta({ value }: { value: number | undefined }) {
  if (value === undefined || roundRate(value) === 0) return null;
  return <span className={`resource-ticker__delta ${value >= 0 ? "is-positive" : "is-negative"}`}>{formatDelta(value)}</span>;
}

function Alert() {
  return (
    <span className="resource-ticker__alert" aria-hidden="true">
      !
    </span>
  );
}

function Chip({ label, danger, warn, children }: { label: string; danger?: boolean; warn?: boolean; children: ReactNode }) {
  return (
    <div className={`resource-ticker__chip ${danger ? "is-danger" : warn ? "is-warn" : ""}`} title={label} aria-label={label}>
      {children}
    </div>
  );
}

function ResourceGlyph({ type, size = 20 }: { type: ResourceType; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" aria-hidden="true">
      <ResourceIcon type={type} size={8} />
    </svg>
  );
}

function CrateIcon() {
  return (
    <svg width={20} height={20} viewBox="-10 -10 20 20" aria-hidden="true">
      <rect x={-8} y={-6} width={16} height={13} rx={1} fill="#a9773f" stroke="#5a3a1a" strokeWidth={0.9} />
      <line x1={-8} y1={0.5} x2={8} y2={0.5} stroke="#5a3a1a" strokeWidth={0.9} />
      <line x1={-8} y1={-6} x2={8} y2={7} stroke="#6e4a26" strokeWidth={0.9} />
      <rect x={-9} y={-8} width={18} height={2.6} rx={0.8} fill="#c9a24a" stroke="#5a3a1a" strokeWidth={0.7} />
    </svg>
  );
}

// Every resource in stock and its daily rate, behind one button.
function Stores({ resources, production, shortages }: { resources: ResourceBundle; production: DailyProductionSummary; shortages: MaterialShortage[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Clicking anywhere else, or Escape, closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="resource-ticker__stores" ref={ref}>
      <button
        type="button"
        className={`resource-ticker__chip resource-ticker__stores-button ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        title="Wood, ore, coal, grain and fish in stock"
      >
        <CrateIcon />
        <span>Stores</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="resource-ticker__stores-panel" role="dialog" aria-label="Stores">
          {RESOURCE_TYPES.map((type) => {
            const short = shortages.find((s) => s.type === type);
            return (
              <div key={type} className={`resource-ticker__store-row ${short ? "is-short" : ""}`}>
                <ResourceGlyph type={type} />
                <span className="resource-ticker__store-name">{RESOURCE_LABELS[type]}</span>
                <span className="resource-ticker__store-amount">{formatExact(resources[type])}</span>
                <Delta value={production.resourceProduction[type]} />
                {short && <Alert />}
              </div>
            );
          })}
          <p className="resource-ticker__store-hint">Buy and sell on the Trade tab.</p>
        </div>
      )}
    </div>
  );
}

export function ResourceTicker({ stats, unrestStage, resources, production, heating, debt, shortages }: ResourceTickerProps) {
  const homesTrouble = production.homeless >= 1 || production.unheatedShare > 0;
  const stage = UNREST_INFO[unrestStage];
  const stageUrgent = unrestStage === "strikes" || unrestStage === "riots";
  // Heating: all winter, and in the run-up to it while the stock won't last.
  const winterSoon = !heating.isWinter && heating.daysUntilWinter <= ADVISOR_WINTER_PREP_DAYS && heating.fuel < heating.fuelNeeded;
  const showHeating = (heating.isWinter && heating.fuelPerDay > 0) || winterSoon;
  const heatingDanger = heating.isWinter ? heating.daysOfFuel < 10 : heating.daysUntilWinter <= 15;

  return (
    <div className="resource-ticker">
      <Chip label={`Treasury: ${formatExact(stats.treasury)} ${CURRENCY_SYMBOL} (${formatDelta(production.totalIncome)})`} danger={stats.treasury < 0}>
        <StatIcon type="treasury" size={20} />
        <span>
          {formatCompact(stats.treasury)} {CURRENCY_SYMBOL}
        </span>
        <Delta value={production.totalIncome} />
      </Chip>

      <Chip
        label={`People: ${formatExact(stats.population)}, homes for ${formatExact(production.housingCapacity)}${production.homeless > 0 ? ` — ${formatExact(production.homeless)} without a home` : ""}`}
        danger={homesTrouble}
      >
        <StatIcon type="population" size={20} />
        <span>
          {formatCompact(stats.population)} / {formatCompact(production.housingCapacity)}
        </span>
        {homesTrouble && <Alert />}
      </Chip>

      <Chip label={`Food: ${formatExact(stats.food)} (${formatDelta(production.netFood)})`}>
        <StatIcon type="food" size={20} />
        <span>{formatCompact(stats.food)}</span>
        <Delta value={production.netFood} />
      </Chip>

      {/* Stability carries its unrest stage: the shape always, the name
          once it's more than calm (see domain/unrest). */}
      <Chip
        label={`Stability: ${formatExact(stats.stability)}/100 — ${stage.name} (${stage.range}): ${stage.effect}${unrestStage === "calm" ? "" : " A crackdown on the Politics tab pulls the country back a stage."}`}
        danger={stageUrgent}
        warn={unrestStage === "discontent"}
      >
        <StatIcon type="stability" size={20} />
        <span>{formatExact(stats.stability)}</span>
        <UnrestStageIcon stage={unrestStage} size={18} />
        {unrestStage !== "calm" && <span>{stage.name}</span>}
        {stageUrgent && <Alert />}
      </Chip>

      <Chip label={`Support: ${formatExact(stats.popularity)}% — elections need 50%`} danger={stats.popularity < 50}>
        <StatIcon type="popularity" size={20} />
        <span>{formatExact(stats.popularity)}%</span>
        {stats.popularity < 50 && <Alert />}
      </Chip>

      {debt > 0 && (
        <Chip
          label={`Debt: ${formatExact(debt)} ${CURRENCY_SYMBOL}${isDebtDangerous(debt) ? " — dangerous, hurting stability & support" : ""}`}
          danger={isDebtDangerous(debt)}
        >
          <StatIcon type="treasury" size={20} />
          <span>{formatCompact(debt)} owed</span>
          {isDebtDangerous(debt) && <Alert />}
        </Chip>
      )}

      {showHeating && (
        <Chip
          label={
            heating.isWinter
              ? `Heating: ${Math.floor(heating.fuel)} coal + wood in stock, homes burn ${heating.fuelPerDay.toFixed(1)} a day — lasts ${Math.floor(heating.daysOfFuel)} days`
              : `Winter in ${heating.daysUntilWinter} days: ${Math.floor(heating.fuel)} of the ${Math.ceil(heating.fuelNeeded)} coal and wood the homes will burn`
          }
          danger={heatingDanger}
          warn={!heatingDanger}
        >
          <FlameIcon size={20} />
          <span>{heating.isWinter ? `${Math.floor(heating.daysOfFuel)}d` : `${Math.round((heating.fuel / Math.max(1, heating.fuelNeeded)) * 100)}%`}</span>
          {heatingDanger && <Alert />}
        </Chip>
      )}

      {/* Building materials a project is about to stall on. */}
      {shortages.map((short) => (
        <Chip
          key={short.type}
          label={`${RESOURCE_LABELS[short.type]}: ${formatExact(short.stock)} left — building draws ${short.perDay.toFixed(1)} a day, about ${Math.floor(short.daysLeft)} days`}
          danger
        >
          <ResourceGlyph type={short.type} />
          <span>{formatCompact(short.stock)}</span>
          <Alert />
        </Chip>
      ))}

      <div className="resource-ticker__divider" />
      <Stores resources={resources} production={production} shortages={shortages} />
    </div>
  );
}
