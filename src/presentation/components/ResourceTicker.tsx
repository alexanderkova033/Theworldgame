// The always-visible strip under the nation's name: only the five numbers
// that decide whether the government survives — treasury, people and
// homes, food, stability (with its unrest stage) and support — plus debt
// and heating when they matter. Raw goods show where they're used (Build,
// People, the Market); one actually running short (building materials a
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
import { formatAmount, formatExact, formatRate } from "../formatNumber";
import type { ResourceType } from "../../domain/resources/types";
import type { UnrestStage } from "../../domain/unrest/types";
import { UNREST_INFO } from "../unrestStages";
import { getLedgerTotal } from "../../domain/ledger/ledgerRules";
import type { Ledger, LedgerMetric } from "../../domain/ledger/types";
import { formatChange, METRIC_LABELS } from "../causes";
import { CauseBreakdown } from "./CauseBreakdown";
import { FlameIcon, HourglassIcon, LoanIcon, UnrestStageIcon } from "./CauseIcon";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";
import { useLetterPreview, type PreviewMetric } from "../letterPreview";

interface ResourceTickerProps {
  stats: CountryStats;
  electionThreshold: number;
  unrestStage: UnrestStage;
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

// A per-day rate riding alongside a chip's current total — see
// getDailyProductionSummary.ts.
function Delta({ value }: { value: number | undefined }) {
  if (value === undefined || formatRate(value) === "0/d") return null;
  return <span className={`resource-ticker__delta ${value >= 0 ? "is-positive" : "is-negative"}`}>{formatRate(value)}</span>;
}

function Alert() {
  return (
    <span className="resource-ticker__alert" aria-hidden="true">
      !
    </span>
  );
}

function Chip({ label, danger, warn, children, previewing }: { label: string; danger?: boolean; warn?: boolean; children: ReactNode; previewing?: boolean }) {
  return (
    <div className={`resource-ticker__chip ${danger ? "is-danger" : warn ? "is-warn" : ""} ${previewing ? "is-previewed" : ""}`} title={label} aria-label={label}>
      {children}
    </div>
  );
}

// What the letter's answer under the pointer would do to this number.
function PreviewMark({ value, metric }: { value: number | undefined; metric: PreviewMetric }) {
  if (value === undefined) return null;
  const text = formatChange(metric, value);
  return <span className={`resource-ticker__preview ${value >= 0 ? "is-gain" : "is-loss"}`}>{text}</span>;
}

function ResourceGlyph({ type, size = 20 }: { type: ResourceType; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" aria-hidden="true">
      <ResourceIcon type={type} size={8} />
    </svg>
  );
}

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
  const previewed = useLetterPreview()?.[metric];
  return (
    <div className="resource-ticker__why" ref={ref}>
      <button
        type="button"
        className={`resource-ticker__chip resource-ticker__why-button ${danger ? "is-danger" : warn ? "is-warn" : ""} ${open ? "is-open" : ""} ${previewed !== undefined ? "is-previewed" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${label}${runOut ? `. Runs out in ${runOut.days} days if nothing changes` : ""}. Show why it changed.`}
        title={`${label}${runOut ? `. Runs out around ${formatDate(runOut.date)} if nothing changes` : ""}. Click to see why it's moving.`}
        onClick={() => setOpen((v) => !v)}
      >
        {children}
        <PreviewMark value={previewed} metric={metric} />
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
export function ResourceTicker({ stats, electionThreshold, unrestStage, production, heating, debt, shortages, lastDayLedger, monthLedger, forecasts, onOpenReports }: ResourceTickerProps) {
  const why = { lastDay: lastDayLedger, month: monthLedger, onOpenReports };
  const previewedPeople = useLetterPreview()?.population;
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
        label={`Treasury: ${formatExact(stats.treasury)} ${CURRENCY_SYMBOL} (${formatRate(production.netTreasury)}, after wages and building)`}
        danger={stats.treasury < 0}
      >
        <StatIcon type="treasury" size={20} />
        <span className={stats.treasury < 0 ? undefined : "tone-money"}>
          {formatAmount(stats.treasury)} {CURRENCY_SYMBOL}
        </span>
        <Delta value={production.netTreasury} />
      </WhyChip>

      <Chip
        label={`People: ${formatExact(stats.population)}, homes for ${formatExact(production.housingCapacity)}${production.homeless > 0 ? `, ${formatExact(production.homeless)} without a home` : ""}`}
        danger={homesTrouble}
        previewing={previewedPeople !== undefined}
      >
        <StatIcon type="population" size={20} />
        <span>
          {formatAmount(stats.population)} / {formatAmount(production.housingCapacity)}
        </span>
        {homesTrouble && <Alert />}
        <PreviewMark value={previewedPeople} metric="population" />
      </Chip>

      <WhyChip {...why} metric="food" runOut={forecasts.food} label={`Food: ${formatExact(stats.food)} (${formatRate(production.netFood)})`}>
        <StatIcon type="food" size={20} />
        <span>{formatAmount(stats.food)}</span>
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
        <span>{formatAmount(stats.stability)}</span>
        <UnrestStageIcon stage={unrestStage} size={18} />
        {unrestStage !== "calm" && <span>{stage.name}</span>}
        {stageUrgent && <Alert />}
      </WhyChip>

      <WhyChip {...why} metric="support" label={`Support: ${formatExact(stats.popularity)}%. The next election needs ${electionThreshold}%.`} danger={stats.popularity < electionThreshold}>
        <StatIcon type="popularity" size={20} />
        <span className={stats.popularity < electionThreshold ? undefined : "tone-politics"}>{formatAmount(stats.popularity)}%</span>
        {stats.popularity < electionThreshold && <Alert />}
      </WhyChip>

      {debt > 0 && (
        <Chip
          label={`Debt: ${formatExact(debt)} ${CURRENCY_SYMBOL}${isDebtDangerous(debt) ? ". Dangerous: it hurts stability and support" : ""}`}
          danger={isDebtDangerous(debt)}
        >
          <LoanIcon size={20} />
          <span>{formatAmount(debt)}</span>
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
      {shortages.map((short) => (
        <Chip
          key={short.type}
          label={`${RESOURCE_LABELS[short.type]}: ${formatExact(short.stock)} left. Building draws ${short.perDay.toFixed(1)} a day, about ${Math.floor(short.daysLeft)} days.`}
          danger
        >
          <ResourceGlyph type={short.type} />
          <span>{formatAmount(short.stock)}</span>
          <Alert />
        </Chip>
      ))}

      <div className="resource-ticker__divider" />
    </div>
  );
}
