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
import { getProvinceStatus, type ProvinceOverview } from "../../application/getProvinceOverview";
import { UNREST_INFO } from "../unrestStages";
import { BuildingGlyph, FlameIcon, UnrestStageIcon } from "./CauseIcon";
import { Gauge } from "./Gauge";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";
import type { OpenPanel } from "./TopBar";

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
      <span className="people-meter__icon">{icon}</span>
      <div className="people-meter__main">
        <div className="people-meter__head">
          <span className="people-meter__label">{label}</span>
          <strong className="people-meter__value">
            {danger && <span className="people-meter__alert">!</span>}
            {value}
          </strong>
        </div>
        {gauge}
        <span className="people-meter__detail">{detail}</span>
      </div>
      {action}
    </div>
  );
}

// One province per row: its homes, its jobs, its mood. Picking a row makes
// it the province the Build panel builds in.
function ProvinceRows({
  provinces,
  selectedProvinceId,
  onSelectProvince,
}: {
  provinces: ProvinceOverview[];
  selectedProvinceId: string;
  onSelectProvince: (provinceId: string) => void;
}) {
  return (
    <div className="people-provinces">
      <h3>Provinces</h3>
      <ul className="people-provinces__list">
        {provinces.map((p) => {
          const status = getProvinceStatus(p);
          const homesAlert = status.homes === "over";
          const jobsAlert = status.jobs === "jobless";
          const selected = p.id === selectedProvinceId;
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`people-province ${selected ? "is-selected" : ""}`}
                aria-pressed={selected}
                title={`${p.name}: ${Math.round(p.population)} people, homes for ${Math.round(p.capacity)}; ${Math.round(p.workers)} workers for ${Math.round(p.jobs)} jobs (${Math.round(p.unemployed)} jobless, ${Math.round(p.openJobs)} jobs unfilled); ${UNREST_INFO[p.unrestStage].name}, stability ${Math.round(p.stability)}. Click to build here.`}
                onClick={() => onSelectProvince(p.id)}
              >
                <span className="people-province__name">
                  {p.isCapital && <span aria-label="Capital">★ </span>}
                  {p.name}
                </span>
                <span className={`people-province__cell ${homesAlert ? "is-alert" : ""}`}>
                  <BuildingGlyph type="housing" size={16} />
                  <span className="people-province__gauge">
                    <Gauge
                      max={p.capacity}
                      segments={[{ value: p.population - p.homeless, tone: status.homes === "ok" ? "good" : "warn" }]}
                      overflow={p.homeless}
                      size="sm"
                      label={`${Math.round(p.population)} people, homes for ${Math.round(p.capacity)}`}
                    />
                  </span>
                  {formatCompact(p.population)}/{formatCompact(p.capacity)}
                  {homesAlert && <span className="people-meter__alert">!</span>}
                </span>
                <span className={`people-province__cell ${jobsAlert ? "is-alert" : ""}`}>
                  <StatIcon type="industry" size={16} />
                  <span className="people-province__gauge">
                    <Gauge
                      max={p.jobs}
                      segments={[
                        { value: p.jobs - p.openJobs, tone: "good" },
                        { value: p.openJobs, tone: "neutral", dashed: true },
                      ]}
                      overflow={p.unemployed}
                      size="sm"
                      label={`${Math.round(p.workers)} workers for ${Math.round(p.jobs)} jobs`}
                    />
                  </span>
                  {formatCompact(p.workers)}/{formatCompact(p.jobs)}
                  {jobsAlert && <span className="people-meter__alert">!</span>}
                </span>
                <span className="people-province__stage">
                  <UnrestStageIcon stage={p.unrestStage} size={18} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface PeoplePanelProps {
  state: GameState;
  production: DailyProductionSummary;
  provinces: ProvinceOverview[];
  selectedProvinceId: string;
  onSelectProvince: (provinceId: string) => void;
  onOpenPanel: OpenPanel;
}

export function PeoplePanel({ state, production, provinces, selectedProvinceId, onSelectProvince, onOpenPanel }: PeoplePanelProps) {
  const population = state.stats.population;
  const capacity = production.housingCapacity;
  const homeless = production.homeless; // summed over provinces — a free home elsewhere doesn't help

  const labour = getLabourSituation(state);
  const shortWorkers = Math.max(0, labour.jobs - labour.workers);
  const unfilled = Object.values(labour.provinces).reduce((sum, p) => sum + p.openJobs, 0);
  const housed = Math.max(0, population - homeless);

  const heating = getHeatingOutlook(state);
  const fuelShort = heating.fuel < heating.fuelNeeded;

  return (
    <section className="panel people-panel">
      <h2>People</h2>

      <Meter
        icon={<StatIcon type="population" size={22} />}
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
        value={`${formatCompact(population)} / ${formatCompact(capacity)}`}
        detail={homeless > 0 ? `${formatCompact(homeless)} without a home` : `${formatCompact(Math.max(0, capacity - population))} free places`}
      />

      <Meter
        icon={<StatIcon type="industry" size={22} />}
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
            label={`${Math.round(labour.jobs - unfilled)} of ${Math.round(labour.jobs)} jobs filled${labour.unemployed >= 1 ? `, ${Math.round(labour.unemployed)} out of work` : ""}`}
          />
        }
        danger={shortWorkers > 0 || labour.unemploymentShare > 0.1}
        value={`${formatCompact(labour.workers)} / ${formatCompact(labour.jobs)}`}
        detail={
          unfilled >= 1 && labour.unemployed >= 1
            ? `${formatCompact(labour.unemployed)} out of work, ${formatCompact(unfilled)} jobs unfilled elsewhere — build homes near the jobs`
            : shortWorkers > 0
            ? `Short ${formatCompact(shortWorkers)} workers — ${labour.foodStaffing < 1 ? `farms at ${Math.round(labour.foodStaffing * 100)}%` : labour.industryStaffing < 1 ? `factories at ${Math.round(labour.industryStaffing * 100)}%` : `schools at ${Math.round(labour.schoolStaffing * 100)}%`}`
            : labour.unemployed > 0
              ? `${formatCompact(labour.unemployed)} out of work`
              : "Everyone employed"
        }
      />

      <Meter
        icon={<FlameIcon />}
        label={heating.isWinter ? "Heating" : "Coal for winter"}
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

      <ProvinceRows provinces={provinces} selectedProvinceId={selectedProvinceId} onSelectProvince={onSelectProvince} />
    </section>
  );
}
