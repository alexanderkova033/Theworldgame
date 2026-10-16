// The three things people need from you, as three meters: a roof, a job,
// and heat in winter, each with its numbers said in words. Then where the
// workers actually work — farms and food first, then schools, then
// factories — and every province as a row of a table with named columns.
import "./PeoplePanel.css";
import type { ReactNode } from "react";
import { getHeatingOutlook } from "../../application/getHeatingOutlook";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import type { GameState } from "../../domain/country/types";
import { getLabourSituation, type Sector, type SectorJobs } from "../../domain/labour/labourRules";
import { COMMUTE_SHARE, LABOUR_SHARE } from "../../domain/constants";
import { isWorking } from "../../domain/maintenance/maintenanceRules";
import type { ProjectType } from "../../domain/construction/types";
import { formatAmount, formatRate } from "../formatNumber";
import { getProvinceStatus, type ProvinceOverview } from "../../application/getProvinceOverview";
import { UNREST_INFO } from "../unrestStages";
import { BuildingGlyph, FlameIcon, JobsIcon, UnrestStageIcon } from "./CauseIcon";
import { Gauge } from "./Gauge";
import { ResourceIcon } from "./ResourceIcon";
import type { OpenPanel } from "../navigation";

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

// Where the workers work, by kind of job, in the order they're hired:
// food (farms, granaries, canneries), then schools, then factories.
const SECTOR_ROWS: Array<{ key: Sector; label: string; types: ProjectType[]; icon: ReactNode }> = [
  { key: "food", label: "Farms & food", types: ["farm", "granary", "cannery"], icon: <BuildingGlyph type="farm" size={18} /> },
  { key: "school", label: "Schools", types: ["education"], icon: <BuildingGlyph type="education" size={18} /> },
  { key: "industry", label: "Factories", types: ["factory"], icon: <BuildingGlyph type="factory" size={18} /> },
];

const TYPE_NAMES: Partial<Record<ProjectType, [string, string]>> = {
  farm: ["farm", "farms"],
  granary: ["granary", "granaries"],
  cannery: ["cannery", "canneries"],
  education: ["school", "schools"],
  factory: ["factory", "factories"],
};

function percent(jobs: SectorJobs): number | null {
  return jobs.jobs > 0 ? Math.round((jobs.hired / jobs.jobs) * 100) : null;
}

function WorkTable({ state, sectors }: { state: GameState; sectors: Record<Sector, SectorJobs> }) {
  const working = state.placedBuildings.filter(isWorking);
  return (
    <div className="people-work">
      <div className="people-section-head">
        <h3 className="people-section-title">Where people work</h3>
        {/* The order jobs are filled in, as a chain; the why is in the tooltip. */}
        <span
          className="people-work__order"
          title={`About ${Math.round(LABOUR_SHARE * 100)}% of your people are of working age. They take food jobs first, then schools, then factories. So when hands run short, the factories go quiet before the farms do. Of the people left without work in one province, ${Math.round(COMMUTE_SHARE * 10)} in 10 travel to fill jobs in another.`}
        >
          Filled first
          {SECTOR_ROWS.map((row, i) => (
            <span key={row.key} className="people-work__step">
              {i > 0 && <span aria-hidden="true">→</span>}
              {row.icon}
              <span className="sr-only">{row.label}</span>
            </span>
          ))}
        </span>
      </div>
      <table className="people-table">
        <thead>
          <tr>
            <th scope="col">Work</th>
            <th scope="col">Buildings</th>
            <th scope="col" className="is-num">
              Workers
            </th>
            <th scope="col" className="is-num">
              Jobs
            </th>
            <th scope="col">Staffed</th>
          </tr>
        </thead>
        <tbody>
          {SECTOR_ROWS.map((row) => {
            const jobs = sectors[row.key];
            const share = percent(jobs);
            const buildings = row.types
              .map((type) => {
                const count = working.filter((b) => b.type === type).length;
                const names = TYPE_NAMES[type]!;
                return count > 0 ? `${count} ${names[count === 1 ? 0 : 1]}` : null;
              })
              .filter(Boolean);
            const short = share !== null && share < 100;
            return (
              <tr key={row.key} className={short ? "is-short" : ""}>
                <th scope="row">
                  <span className="people-table__name">
                    {row.icon}
                    {row.label}
                  </span>
                </th>
                <td>{buildings.length > 0 ? buildings.join(", ") : "None yet"}</td>
                <td className="is-num">{formatAmount(jobs.hired)}</td>
                <td className="is-num">{formatAmount(jobs.jobs)}</td>
                <td>
                  {share === null ? (
                    <span className="people-table__muted">none</span>
                  ) : (
                    <span className="people-table__staffed">
                      <Gauge max={100} size="sm" segments={[{ value: share, tone: share >= 100 ? "good" : share >= 60 ? "warn" : "bad" }]} label={`${share}% staffed`} />
                      <strong>{share}%</strong>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Every province as a row with named columns. Picking a row makes it the
// province the Build panel builds in, and offers to go and build there.
function ProvinceTable({
  provinces,
  selectedProvinceId,
  onSelectProvince,
  onBuild,
}: {
  provinces: ProvinceOverview[];
  selectedProvinceId: string;
  onSelectProvince: (provinceId: string) => void;
  onBuild: () => void;
}) {
  return (
    <div className="people-provinces">
      <h3 className="people-section-title">Provinces</h3>
      <table className="people-table people-table--provinces">
        <thead>
          <tr>
            <th scope="col">Province</th>
            <th scope="col" className="is-num">
              People / homes
            </th>
            <th scope="col" className="is-num">
              Farm & food jobs
            </th>
            <th scope="col" className="is-num">
              Factory jobs
            </th>
            <th scope="col" className="is-num">
              Jobless
            </th>
            <th scope="col">Mood</th>
            <th scope="col">
              <span className="sr-only">Build</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {provinces.map((p) => {
            const status = getProvinceStatus(p);
            const selected = p.id === selectedProvinceId;
            const food = p.sectors.food;
            const industry = p.sectors.industry;
            return (
              <tr key={p.id} className={selected ? "is-selected" : ""} onClick={() => onSelectProvince(p.id)}>
                <th scope="row">
                  <button type="button" className="people-table__pick" aria-pressed={selected} onClick={() => onSelectProvince(p.id)} title="Build here">
                    {p.isCapital && <span aria-label="Capital">★ </span>}
                    {p.name}
                  </button>
                </th>
                <td className={`is-num ${status.homes === "over" ? "is-bad" : status.homes === "full" ? "is-warn" : ""}`}>
                  {formatAmount(p.population)} / {formatAmount(p.capacity)}
                </td>
                <td className={`is-num ${food.hired < food.jobs ? "is-warn" : ""}`}>
                  {food.jobs > 0 ? `${formatAmount(food.hired)} / ${formatAmount(food.jobs)}` : "none"}
                </td>
                <td className={`is-num ${industry.hired < industry.jobs ? "is-warn" : ""}`}>
                  {industry.jobs > 0 ? `${formatAmount(industry.hired)} / ${formatAmount(industry.jobs)}` : "none"}
                </td>
                <td className={`is-num ${status.jobs === "jobless" ? "is-bad" : ""}`}>{p.unemployed >= 1 ? formatAmount(p.unemployed) : "0"}</td>
                <td>
                  <span className="people-table__mood">
                    <UnrestStageIcon stage={p.unrestStage} size={16} />
                    {UNREST_INFO[p.unrestStage].name}
                  </span>
                </td>
                <td className="people-table__action">
                  {selected && (
                    <button
                      type="button"
                      className="people-table__build"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBuild();
                      }}
                    >
                      Build here ›
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
  onBuild: () => void; // to the Build section, for the picked province
}

export function PeoplePanel({ state, production, provinces, selectedProvinceId, onSelectProvince, onOpenPanel, onBuild }: PeoplePanelProps) {
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
        value={`${formatAmount(population)} people · homes for ${formatAmount(capacity)}`}
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
          fuelShort ? (
            <button type="button" className="btn-primary people-meter__action" onClick={() => onOpenPanel("money", "market")}>
              Buy coal
            </button>
          ) : undefined
        }
      />

      <WorkTable state={state} sectors={labour.sectors} />

      <ProvinceTable provinces={provinces} selectedProvinceId={selectedProvinceId} onSelectProvince={onSelectProvince} onBuild={onBuild} />
    </section>
  );
}
