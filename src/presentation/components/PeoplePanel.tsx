// The four things people need from you, as four matching cards: a roof, a
// job, heat in winter and food, each a meter with its numbers said in
// words. Province by province, the map shows the same (its Homes and Jobs modes).
import "./PeoplePanel.css";
import type { ReactNode } from "react";
import { getHeatingOutlook } from "../../application/getHeatingOutlook";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import type { GameState } from "../../domain/country/types";
import { getLabourSituation } from "../../domain/labour/labourRules";
import { ADVISOR_FOOD_CRITICAL_DAYS, ADVISOR_FOOD_WARN_DAYS } from "../../domain/constants";
import { formatAmount, formatRate, formatSigned } from "../formatNumber";
import { BuildingGlyph, FlameIcon, JobsIcon } from "./CauseIcon";
import { Gauge } from "./Gauge";
import { ResourceIcon } from "./ResourceIcon";
import type { OpenPanel } from "../navigation";
import { getForecasts } from "../../application/getForecasts";
import { isFeatureOpen } from "../../domain/chapters/chapterData";
import { StatIcon } from "./StatIcon";

// The food meter's full length: a season's eating in store.
const FOOD_STORE_SCALE_DAYS = 90;

function Meter({
  icon,
  label,
  gauge,
  danger,
  value,
  detail,
  action,
}: {
  icon: ReactNode;
  label: string;
  gauge: ReactNode;
  danger: boolean;
  value: string;
  detail: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`people-meter ${danger ? "is-danger" : ""}`}>
      <div className="people-meter__head">
        <span className="people-meter__icon">{icon}</span>
        <span className="people-meter__label">{label}</span>
        {danger && (
          <span className="people-meter__alert" aria-label="Needs attention">
            !
          </span>
        )}
        <strong className="people-meter__value">{value}</strong>
      </div>
      {gauge}
      <div className="people-meter__foot">
        <span className="people-meter__detail">{detail}</span>
        {action}
      </div>
    </div>
  );
}

interface PeoplePanelProps {
  state: GameState;
  production: DailyProductionSummary;
  onOpenPanel: OpenPanel;
}

export function PeoplePanel({ state, production, onOpenPanel }: PeoplePanelProps) {
  const population = state.stats.population;
  const capacity = production.housingCapacity;
  const homeless = production.homeless; // summed over provinces — a free home elsewhere doesn't help

  const labour = getLabourSituation(state);
  const shortWorkers = Math.max(0, labour.jobs - labour.workers);
  const unfilled = Object.values(labour.provinces).reduce((sum, p) => sum + p.openJobs, 0);
  const housed = Math.max(0, population - homeless);

  const heating = getHeatingOutlook(state);
  const fuelShort = heating.fuel < heating.fuelNeeded;
  // Buying only once the market is open (see domain/chapters).
  const market = isFeatureOpen(state, "market");

  // Food: what comes in and goes out a day, and how long the store lasts.
  const netFood = Math.round(production.netFood) || 0;
  const eaten = production.foodConsumed;
  const storeDays = eaten > 0 ? state.stats.food / eaten : Infinity;
  const runOut = netFood < 0 ? getForecasts(state, production).food : null;
  const foodShort = runOut !== null && runOut.days < ADVISOR_FOOD_WARN_DAYS;

  return (
    <section className="panel people-panel">
      <div className="people-needs">
      <Meter
        icon={<BuildingGlyph type="housing" size={22} />}
        label="Homes"
        gauge={
          <Gauge
            max={capacity}
            segments={[{ value: housed, tone: capacity > 0 && housed / capacity >= 0.95 ? "warn" : "good" }]}
            overflow={homeless}
            size="lg"
            label={`${Math.round(housed)} housed of ${Math.round(capacity)} places${homeless > 0 ? `, ${Math.round(homeless)} without a home` : ""}`}
          />
        }
        danger={homeless > 0}
        value={`${formatAmount(population)} people · ${formatAmount(capacity)} places`}
        detail={homeless > 0 ? `${formatAmount(homeless)} without a home` : `${formatAmount(Math.max(0, capacity - population))} free places`}
      />

      <Meter
        icon={<JobsIcon size={22} />}
        label="Jobs"
        gauge={
          <Gauge
            max={labour.jobs}
            segments={[
              { value: labour.jobs - unfilled, tone: "good" },
              { value: unfilled, tone: "neutral", dashed: true },
            ]}
            overflow={labour.unemployed}
            size="lg"
            label={`${Math.round(labour.jobs - unfilled)} of ${Math.round(labour.jobs)} jobs filled${labour.unemployed >= 1 ? `, ${Math.round(labour.unemployed)} jobless` : ""}`}
          />
        }
        danger={shortWorkers > 0 || labour.unemploymentShare > 0.1}
        value={`${formatAmount(labour.workers)} workers · ${formatAmount(labour.jobs)} jobs`}
        detail={
          unfilled >= 1 && labour.unemployed >= 1
            ? `${formatAmount(labour.unemployed)} jobless, ${formatAmount(unfilled)} jobs unfilled elsewhere. Build homes near the jobs.`
            : shortWorkers > 0
            ? `Short ${formatAmount(shortWorkers)} workers: ${labour.foodStaffing < 1 ? `farms at ${Math.round(labour.foodStaffing * 100)}%` : labour.industryStaffing < 1 ? `factories at ${Math.round(labour.industryStaffing * 100)}%` : `schools at ${Math.round(labour.schoolStaffing * 100)}%`}`
            : labour.unemployed > 0
              ? `${formatAmount(labour.unemployed)} jobless`
              : "Everyone employed"
        }
      />

      <Meter
        icon={<FlameIcon />}
        label="Heating"
        gauge={
          <Gauge
            max={Math.max(1, heating.fuelNeeded)}
            segments={[
              {
                value: Math.min(heating.fuel, heating.fuelNeeded),
                tone: heating.fuel >= heating.fuelNeeded ? "good" : heating.fuel >= heating.fuelNeeded * 0.5 ? "warn" : "bad",
              },
            ]}
            size="lg"
            label={`${Math.floor(heating.fuel)} coal and wood of ${Math.ceil(heating.fuelNeeded)} needed for ${heating.isWinter ? "the rest of this winter" : "next winter"}`}
          />
        }
        danger={fuelShort && (heating.isWinter || heating.daysUntilWinter < 60)}
        value={
          heating.isWinter
            ? `fuel for ${Number.isFinite(heating.daysOfFuel) ? Math.floor(heating.daysOfFuel) : "∞"} days`
            : `${Math.floor(heating.fuel)} in stock · winter needs ${Math.ceil(heating.fuelNeeded)}`
        }
        detail={
          <span className="people-meter__fuel">
            <span title="Coal, burned first">
              <svg viewBox="-10 -10 20 20" width={14} height={14}>
                <ResourceIcon type="coal" size={8} />
              </svg>
              {Math.floor(state.resources.coal)}
            </span>
            <span>+</span>
            <span title="Firewood, burned once the coal runs out">
              <svg viewBox="-10 -10 20 20" width={14} height={14}>
                <ResourceIcon type="wood" size={8} />
              </svg>
              {Math.floor(state.resources.wood)}
            </span>
            <span className="people-meter__fuel-rate">
              {formatRate(-heating.fuelPerDay)} in winter{heating.isWinter ? "" : ` · in ${heating.daysUntilWinter} days`}
            </span>
          </span>
        }
        action={
          fuelShort && market ? (
            <button type="button" className="btn-primary people-meter__action" onClick={() => onOpenPanel("money", "market")}>
              Buy coal
            </button>
          ) : undefined
        }
      />

      <Meter
        icon={<StatIcon type="food" size={22} />}
        label="Food"
        gauge={
          <Gauge
            max={FOOD_STORE_SCALE_DAYS}
            segments={[
              {
                value: Math.min(storeDays, FOOD_STORE_SCALE_DAYS),
                tone: netFood >= 0 || storeDays >= ADVISOR_FOOD_WARN_DAYS ? "good" : storeDays >= ADVISOR_FOOD_CRITICAL_DAYS ? "warn" : "bad",
              },
            ]}
            size="lg"
            label={`${formatAmount(Math.floor(state.stats.food))} food in store, ${Number.isFinite(storeDays) ? `${Math.floor(storeDays)} days of eating` : "nobody to feed"}`}
          />
        }
        danger={foodShort}
        value={`${formatAmount(Math.floor(state.stats.food))} in store · ${formatRate(netFood)}`}
        detail={
          <span className="people-meter__fuel">
            <span title="Grown on the farms each day">
              <BuildingGlyph type="farm" size={14} />
              {formatSigned(production.farmFood)}
            </span>
            {production.processedFood !== 0 && (
              <span title="Made by granaries and canneries each day">
                <BuildingGlyph type="granary" size={14} />
                {formatSigned(production.processedFood)}
              </span>
            )}
            <span title="Eaten each day">
              <StatIcon type="population" size={14} />
              {formatSigned(-eaten)}
            </span>
            {runOut && <span className="people-meter__fuel-rate">lasts {runOut.days} days</span>}
          </span>
        }
        action={
          foodShort && market ? (
            <button type="button" className="btn-primary people-meter__action" onClick={() => onOpenPanel("money", "market")}>
              Buy food
            </button>
          ) : undefined
        }
      />
      </div>


    </section>
  );
}
