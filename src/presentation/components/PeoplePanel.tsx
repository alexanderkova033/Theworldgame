// The three things people need from you, as three meters: a roof, a job,
// and heat in winter. Each bar shows how covered they are at a glance, with
// the short number that matters beside it and a button where there's
// something to do about it.
import "./PeoplePanel.css";
import type { ReactNode } from "react";
import { getHeatingOutlook } from "../../application/getHeatingOutlook";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import type { GameState } from "../../domain/country/types";
import { getLabourSituation } from "../../domain/labour/labourRules";
import { formatCompact } from "../formatNumber";
import { FlameIcon } from "./CauseIcon";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";
import type { PanelKey } from "./TopBar";

function Meter({
  icon,
  label,
  fill,
  danger,
  value,
  detail,
  action,
}: {
  icon: ReactNode;
  label: string;
  fill: number; // 0..1
  danger: boolean;
  value: string;
  detail: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`people-meter ${danger ? "is-danger" : ""}`}>
      <span className="people-meter__icon">{icon}</span>
      <div className="people-meter__main">
        <div className="people-meter__head">
          <span className="people-meter__label">{label}</span>
          <strong className="people-meter__value">
            {danger && <span className="people-meter__alert">!</span>}
            {value}
          </strong>
        </div>
        <span className="people-meter__bar" aria-hidden="true">
          <span className="people-meter__fill" style={{ width: `${Math.round(Math.min(1, Math.max(0, fill)) * 100)}%` }} />
        </span>
        <span className="people-meter__detail">{detail}</span>
      </div>
      {action}
    </div>
  );
}

interface PeoplePanelProps {
  state: GameState;
  production: DailyProductionSummary;
  onOpenPanel: (panel: PanelKey) => void;
}

export function PeoplePanel({ state, production, onOpenPanel }: PeoplePanelProps) {
  const population = state.stats.population;
  const capacity = production.housingCapacity;
  const homeless = production.homeless; // summed over provinces — a free home elsewhere doesn't help

  const labour = getLabourSituation(state);
  const shortWorkers = Math.max(0, labour.jobs - labour.workers);

  const heating = getHeatingOutlook(state);
  const fuelShort = heating.fuel < heating.fuelNeeded;

  return (
    <section className="panel people-panel">
      <h2>People</h2>

      <Meter
        icon={<StatIcon type="population" size={22} />}
        label="Homes"
        fill={capacity > 0 ? population / capacity : 1}
        danger={homeless > 0}
        value={`${formatCompact(population)} / ${formatCompact(capacity)}`}
        detail={homeless > 0 ? `${formatCompact(homeless)} without a home` : `${formatCompact(Math.max(0, capacity - population))} free places`}
      />

      <Meter
        icon={<StatIcon type="industry" size={22} />}
        label="Jobs"
        fill={labour.jobs > 0 ? Math.min(labour.workers, labour.jobs) / labour.jobs : 1}
        danger={shortWorkers > 0 || labour.unemploymentShare > 0.1}
        value={`${formatCompact(labour.workers)} / ${formatCompact(labour.jobs)}`}
        detail={
          shortWorkers > 0
            ? `Short ${formatCompact(shortWorkers)} workers — ${labour.foodStaffing < 1 ? `farms at ${Math.round(labour.foodStaffing * 100)}%` : labour.industryStaffing < 1 ? `factories at ${Math.round(labour.industryStaffing * 100)}%` : `schools at ${Math.round(labour.schoolStaffing * 100)}%`}`
            : labour.unemployed > 0
              ? `${formatCompact(labour.unemployed)} out of work`
              : "Everyone employed"
        }
      />

      <Meter
        icon={<FlameIcon />}
        label={heating.isWinter ? "Heating" : "Coal for winter"}
        fill={heating.fuelNeeded > 0 ? heating.fuel / heating.fuelNeeded : 1}
        danger={fuelShort && (heating.isWinter || heating.daysUntilWinter < 60)}
        value={heating.isWinter ? `${Number.isFinite(heating.daysOfFuel) ? Math.floor(heating.daysOfFuel) : "∞"} days` : `${Math.floor(heating.fuel)} / ${Math.ceil(heating.fuelNeeded)}`}
        detail={
          <span className="people-meter__fuel">
            <span title="Coal — burned first">
              <svg viewBox="-10 -10 20 20" width={14} height={14}>
                <ResourceIcon type="coal" size={8} />
              </svg>
              {Math.floor(state.resources.coal)}
            </span>
            <span>+</span>
            <span title="Firewood — burned once the coal runs out">
              <svg viewBox="-10 -10 20 20" width={14} height={14}>
                <ResourceIcon type="wood" size={8} />
              </svg>
              {Math.floor(state.resources.wood)}
            </span>
            <span className="people-meter__fuel-rate">
              {heating.fuelPerDay.toFixed(1)}/day in winter{heating.isWinter ? "" : ` · in ${heating.daysUntilWinter} days`}
            </span>
          </span>
        }
        action={
          fuelShort ? (
            <button type="button" className="btn-primary people-meter__action" onClick={() => onOpenPanel("trade")}>
              Buy coal
            </button>
          ) : undefined
        }
      />
    </section>
  );
}
