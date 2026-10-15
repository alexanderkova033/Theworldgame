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
import type { Forecasts, RunOut } from "../../application/getForecasts";
import type { MaterialShortage } from "../../application/getMaterialShortages";
import { formatDate } from "../../domain/country/calendar";
import { isDebtDangerous } from "../../domain/loans/loanRules";
import { formatCompact } from "../formatNumber";
import { RESOURCE_TYPES, type ResourceBundle, type ResourceType } from "../../domain/resources/types";
import type { UnrestStage } from "../../domain/unrest/types";
import { UNREST_INFO } from "../unrestStages";
import { getLedgerTotal } from "../../domain/ledger/ledgerRules";
import type { Ledger, LedgerMetric } from "../../domain/ledger/types";
import { formatChange, METRIC_LABELS } from "../causes";
import { CauseBreakdown } from "./CauseBreakdown";
import { FlameIcon, HourglassIcon, UnrestStageIcon } from "./CauseIcon";
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
  lastDayLedger: Ledger; // what moved the numbers yesterday — see GameState.lastDayLedger
  monthLedger: Ledger; // the same, for the month so far
  forecasts: Forecasts; // when food and money run out if nothing changes
  onOpenReports: () => void;
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
// A chip's dropdown: open on click, closed by clicking anywhere else or
// pressing Escape (so opening one chip's closes another's).
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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
  return { open, setOpen, ref };
}

// One of the four numbers the ledger explains, as a button: click it for
// what moved it over the last day (the same signed bars as the monthly
// report) and where it stands for the month so far.
function WhyChip({
  label,
  metric,
  danger,
  warn,
  lastDay,
  month,
  onOpenReports,
  runOut,
  children,
}: {
  label: string;
  metric: LedgerMetric;
  runOut?: RunOut | null;
  danger?: boolean;
  warn?: boolean;
  lastDay: Ledger;
  month: Ledger;
  onOpenReports: () => void;
  children: ReactNode;
}) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="resource-ticker__why" ref={ref}>
      <button
        type="button"
        className={`resource-ticker__chip resource-ticker__why-button ${danger ? "is-danger" : warn ? "is-warn" : ""} ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${label}${runOut ? `. Runs out in ${runOut.days} days if nothing changes` : ""}. Show why it changed.`}
        title={`${label}${runOut ? `. Runs out around ${formatDate(runOut.date)} if nothing changes` : ""}. Click to see why it's moving.`}
        onClick={() => setOpen((v) => !v)}
      >
        {children}
        {/* Runs out within the forecast window: an hourglass and the days left. */}
        {runOut && (
          <span className={`resource-ticker__runout ${runOut.days < 30 ? "is-soon" : ""}`} aria-hidden="true">
            <HourglassIcon size={13} />
            {runOut.days}d
          </span>
        )}
      </button>
      {open && (
        <div className="resource-ticker__popover resource-ticker__why-panel" role="dialog" aria-label={`Why ${METRIC_LABELS[metric].toLowerCase()} changed`}>
          <CauseBreakdown ledger={lastDay} metric={metric} title={`${METRIC_LABELS[metric]}, last day`} perDay />
          {runOut && (
            <p className="resource-ticker__runout-line">
              <span className="resource-ticker__alert" aria-hidden="true">
                !
              </span>
              Runs out around <strong>{formatDate(runOut.date)}</strong> ({runOut.days} days) if nothing changes, counting the lean winter harvests.
            </p>
          )}
          <div className="resource-ticker__why-month">
            <span>
              This month so far: <strong>{formatChange(metric, getLedgerTotal(month, metric))}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenReports();
              }}
            >
              Monthly reports
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Whether the stores are pinned open in the bar — a per-player preference,
// kept in this browser. Storage can be missing or refuse (a private window),
// so both ways fall back quietly to "folded".
const STORES_PINNED_KEY = "theworldgame-stores-pinned";

function readStoresPinned(): boolean {
  try {
    return localStorage.getItem(STORES_PINNED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStoresPinned(pinned: boolean) {
  try {
    localStorage.setItem(STORES_PINNED_KEY, pinned ? "1" : "0");
  } catch {
    // Not remembered — it still works for this session.
  }
}

function PinIcon({ pinned }: { pinned: boolean }) {
  return (
    <svg viewBox="-10 -10 20 20" width={14} height={14} aria-hidden="true">
      <g transform={pinned ? undefined : "rotate(35)"}>
        <path d="M-4,-8 L4,-8 L3,-2 L6,2 L-6,2 L-3,-2 Z" fill="currentColor" />
        <line x1={0} y1={2} x2={0} y2={9} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      </g>
    </svg>
  );
}

// Every resource in stock and its daily rate: folded behind one button, or
// pinned open as a row of cells in the strip.
function Stores({
  resources,
  production,
  shortages,
  pinned,
  onPin,
}: {
  resources: ResourceBundle;
  production: DailyProductionSummary;
  shortages: MaterialShortage[];
  pinned: boolean;
  onPin: (pinned: boolean) => void;
}) {
  const { open, setOpen, ref } = usePopover();

  if (pinned) {
    return (
      <div className="resource-ticker__stores-row" role="group" aria-label="Stores">
        <span className="resource-ticker__chip resource-ticker__stores-label">
          <CrateIcon />
          Stores
        </span>
        {RESOURCE_TYPES.map((type) => {
          const short = shortages.find((s) => s.type === type);
          return (
            <div
              key={type}
              className={`resource-ticker__chip resource-ticker__store-cell ${short ? "is-danger" : ""}`}
              title={`${RESOURCE_LABELS[type]}: ${formatExact(resources[type])} in stock (${formatDelta(production.resourceProduction[type])} a day)${short ? ". Building will run out soon" : ""}`}
            >
              <ResourceGlyph type={type} />
              <span className="resource-ticker__store-cell-name">{RESOURCE_LABELS[type]}</span>
              <span>{formatCompact(resources[type])}</span>
              <Delta value={production.resourceProduction[type]} />
              {short && <Alert />}
            </div>
          );
        })}
        <button
          type="button"
          className="resource-ticker__chip resource-ticker__pin-toggle"
          onClick={() => onPin(false)}
          aria-label="Unpin the stores and fold them back into one button"
          title="Fold the stores back into one button"
        >
          <PinIcon pinned />
        </button>
      </div>
    );
  }

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
        <div className="resource-ticker__popover" role="dialog" aria-label="Stores">
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
          <div className="resource-ticker__store-foot">
            <p className="resource-ticker__store-hint">Buy and sell on the Trade tab.</p>
            <button
              type="button"
              className="resource-ticker__pin-button"
              onClick={() => {
                setOpen(false);
                onPin(true);
              }}
            >
              <PinIcon pinned={false} />
              Keep in the bar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ResourceTicker({ stats, unrestStage, resources, production, heating, debt, shortages, lastDayLedger, monthLedger, forecasts, onOpenReports }: ResourceTickerProps) {
  const why = { lastDay: lastDayLedger, month: monthLedger, onOpenReports };
  const [storesPinned, setStoresPinned] = useState(readStoresPinned);
  const pinStores = (pinned: boolean) => {
    setStoresPinned(pinned);
    writeStoresPinned(pinned);
  };
  const homesTrouble = production.homeless >= 1 || production.unheatedShare > 0;
  const stage = UNREST_INFO[unrestStage];
  const stageUrgent = unrestStage === "strikes" || unrestStage === "riots";
  // Heating: all winter, and in the run-up to it while the stock won't last.
  const winterSoon = !heating.isWinter && heating.daysUntilWinter <= ADVISOR_WINTER_PREP_DAYS && heating.fuel < heating.fuelNeeded;
  const showHeating = (heating.isWinter && heating.fuelPerDay > 0) || winterSoon;
  const heatingDanger = heating.isWinter ? heating.daysOfFuel < 10 : heating.daysUntilWinter <= 15;

  return (
    <div className="resource-ticker">
      <WhyChip
        {...why}
        metric="treasury"
        runOut={forecasts.treasury}
        label={`Treasury: ${formatExact(stats.treasury)} ${CURRENCY_SYMBOL} (${formatDelta(production.netTreasury)} a day, after wages and building)`}
        danger={stats.treasury < 0}
      >
        <StatIcon type="treasury" size={20} />
        <span>
          {formatCompact(stats.treasury)} {CURRENCY_SYMBOL}
        </span>
        <Delta value={production.netTreasury} />
      </WhyChip>

      <Chip
        label={`People: ${formatExact(stats.population)}, homes for ${formatExact(production.housingCapacity)}${production.homeless > 0 ? `, ${formatExact(production.homeless)} without a home` : ""}`}
        danger={homesTrouble}
      >
        <StatIcon type="population" size={20} />
        <span>
          {formatCompact(stats.population)} / {formatCompact(production.housingCapacity)}
        </span>
        {homesTrouble && <Alert />}
      </Chip>

      <WhyChip {...why} metric="food" runOut={forecasts.food} label={`Food: ${formatExact(stats.food)} (${formatDelta(production.netFood)})`}>
        <StatIcon type="food" size={20} />
        <span>{formatCompact(stats.food)}</span>
        <Delta value={production.netFood} />
      </WhyChip>

      {/* Stability carries its unrest stage: the shape always, the name
          once it's more than calm (see domain/unrest). */}
      <WhyChip
        {...why}
        metric="stability"
        label={`Stability: ${formatExact(stats.stability)}/100, ${stage.name} (${stage.range}): ${stage.effect}${unrestStage === "calm" ? "" : " A crackdown on the Politics tab pulls the country back a stage."}`}
        danger={stageUrgent}
        warn={unrestStage === "discontent"}
      >
        <StatIcon type="stability" size={20} />
        <span>{formatExact(stats.stability)}</span>
        <UnrestStageIcon stage={unrestStage} size={18} />
        {unrestStage !== "calm" && <span>{stage.name}</span>}
        {stageUrgent && <Alert />}
      </WhyChip>

      <WhyChip {...why} metric="support" label={`Support: ${formatExact(stats.popularity)}%. Elections need 50%.`} danger={stats.popularity < 50}>
        <StatIcon type="popularity" size={20} />
        <span>{formatExact(stats.popularity)}%</span>
        {stats.popularity < 50 && <Alert />}
      </WhyChip>

      {debt > 0 && (
        <Chip
          label={`Debt: ${formatExact(debt)} ${CURRENCY_SYMBOL}${isDebtDangerous(debt) ? ". Dangerous: it hurts stability and support" : ""}`}
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
              ? `Heating: ${Math.floor(heating.fuel)} coal + wood in stock, homes burn ${heating.fuelPerDay.toFixed(1)} a day, enough for ${Math.floor(heating.daysOfFuel)} days`
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

      {/* Building materials a project is about to stall on — shown in the
          pinned stores' own cells instead, when those are out. */}
      {!storesPinned && shortages.map((short) => (
        <Chip
          key={short.type}
          label={`${RESOURCE_LABELS[short.type]}: ${formatExact(short.stock)} left. Building draws ${short.perDay.toFixed(1)} a day, about ${Math.floor(short.daysLeft)} days.`}
          danger
        >
          <ResourceGlyph type={short.type} />
          <span>{formatCompact(short.stock)}</span>
          <Alert />
        </Chip>
      ))}

      <div className="resource-ticker__divider" />
      <Stores resources={resources} production={production} shortages={shortages} pinned={storesPinned} onPin={pinStores} />
    </div>
  );
}
