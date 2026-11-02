// The four things people need from you, as four matching cards: a roof, a
// job, heat in winter and food, each a meter with its numbers said in
// words. Then where the workers work, as a chain of tiles in the order jobs
// are filled, and every province as a row of small bars.
import "./PeoplePanel.css";
import type { ReactNode } from "react";
import { cancelWorkChange, canMoveWorkers, chooseAutomaticWork, chooseWork, getComingWorkPlan, moveWorkers } from "../../application/actions";
import { getHeatingOutlook } from "../../application/getHeatingOutlook";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import type { GameState } from "../../domain/country/types";
import { nextMonthStartName } from "../../domain/country/calendar";
import { getLabourSituation, type LabourSituation, type Sector } from "../../domain/labour/labourRules";
import type { Trade } from "../../domain/labour/trainingRules";
import { ADVISOR_FOOD_CRITICAL_DAYS, ADVISOR_FOOD_WARN_DAYS, ADVISOR_WINTER_PREP_DAYS, COMMUTE_SHARE, LABOUR_SHARE, WOOD_PER_COAL_HEAT, WORK_PLAN_STEP } from "../../domain/constants";
import { isWorking } from "../../domain/maintenance/maintenanceRules";
import type { ProjectType } from "../../domain/construction/types";
import { getProvinceStatus, type ProvinceOverview } from "../../application/getProvinceOverview";
import { UNREST_INFO } from "../unrestStages";
import { formatAmount, formatRate, formatSigned } from "../formatNumber";
import { BuildingGlyph, FlameIcon, JobsIcon, UnrestStageIcon } from "./CauseIcon";
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

// Where the workers work, by kind of job, in the order they're hired:
// food (farms, granaries, canneries), then schools, then factories.
const SECTORS: Array<{ key: Sector; label: string; types: ProjectType[]; icon: ReactNode }> = [
  { key: "food", label: "Farms & food", types: ["farm", "estate", "modelFarm", "granary", "cannery"], icon: <BuildingGlyph type="farm" size={30} /> },
  { key: "school", label: "Schools", types: ["education"], icon: <BuildingGlyph type="education" size={30} /> },
  { key: "industry", label: "Factories", types: ["factory", "foundry", "steelworks", "mine", "sawmill"], icon: <BuildingGlyph type="factory" size={30} /> },
];

const TYPE_NAMES: Partial<Record<ProjectType, [string, string]>> = {
  farm: ["farm", "farms"],
  granary: ["granary", "granaries"],
  cannery: ["cannery", "canneries"],
  education: ["school", "schools"],
  factory: ["factory", "factories"],
  estate: ["estate", "estates"],
  modelFarm: ["model farm", "model farms"],
  foundry: ["foundry", "foundries"],
  steelworks: ["steelworks", "steelworks"],
  mine: ["mine", "mines"],
  sawmill: ["sawmill", "sawmills"],
};

const staffedTone = (share: number) => (share >= 100 ? "good" : share >= 60 ? "warn" : "bad");

function WorkChain({ state, labour, dispatch }: { state: GameState; labour: LabourSituation; dispatch: (action: (state: GameState) => GameState) => void }) {
  const working = state.placedBuildings.filter(isWorking);
  const { sectors } = labour;
  const coming = getComingWorkPlan(state);
  const when = nextMonthStartName(state.date);
  const afterChange = state.workPlanNext ? getLabourSituation({ ...state, workPlan: coming, workPlanNext: null }) : null;
  return (
    <div className="people-work">
      <div className="people-work__top">
        <h3
          className="people-section-title"
          data-tip={`About ${Math.round(LABOUR_SHARE * 100)}% of your people are of working age. On Automatic they take food jobs first, then schools, then factories, so when hands run short the factories go quiet before the farms do. Of the people left without work in one province, ${Math.round(COMMUTE_SHARE * 10)} in 10 travel to fill jobs in another.`}
        >
          Where people work
        </h3>
        <span className="people-work__mode" role="group" aria-label="Who decides where people work">
          <button type="button" className={coming ? "" : "is-on"} aria-pressed={!coming} data-tip="Jobs fill by themselves, food first." onClick={() => dispatch(chooseAutomaticWork)}>
            Automatic
          </button>
          <button type="button" className={coming ? "is-on" : ""} aria-pressed={!!coming} data-tip="You set the most people in each sector, for the whole country. Anyone left over still takes any open job." onClick={() => dispatch(chooseWork)}>
            Your choice
          </button>
        </span>
        {state.workPlanNext && (
          <>
            <span className="people-work__when">{state.workPlanNext === "automatic" ? `Automatic from ${when}` : `Changes on ${when}`}</span>
            <button type="button" className="people-work__keep" data-tip="Take back this change. Nobody has moved yet." onClick={() => dispatch(cancelWorkChange)}>
              Keep it as it is
            </button>
          </>
        )}
      </div>
      <div className="people-work__chain">
        {SECTORS.map((sector, i) => {
          const jobs = sectors[sector.key];
          const share = jobs.jobs > 0 ? Math.round((jobs.hired / jobs.jobs) * 100) : null;
          const trade = sector.key === "school" ? null : (sector.key as Trade);
          const skill = trade && jobs.hired >= 1 ? labour.skill[trade] : null;
          const trained = trade ? state.trained[trade] : 0;
          // Empty jobs are news under a limit; on Automatic the figures say it.
          const empty = state.workPlan ? jobs.jobs - jobs.hired : 0;
          // Who will really work here after the month's end, when that is about to change.
          const nextHired = afterChange ? Math.round(afterChange.sectors[sector.key].hired) : null;
          const pending = nextHired !== null && Math.abs(nextHired - jobs.hired) >= 1 ? nextHired : null;
          const buildings = sector.types
            .map((type) => {
              const count = working.filter((b) => b.type === type).length;
              const names = TYPE_NAMES[type]!;
              return count > 0 ? `${count} ${names[count === 1 ? 0 : 1]}` : null;
            })
            .filter(Boolean);
          return (
            <div key={sector.key} className="people-work__link">
              {i > 0 && (
                <span className="people-work__arrow" aria-hidden="true">
                  ›
                </span>
              )}
              <div className={`people-work__tile ${share === null ? "is-empty" : ""}`}>
                <span className="people-work__icon" data-tip={buildings.length > 0 ? buildings.join(", ") : "None yet"}>{sector.icon}</span>
                <span className="people-work__body">
                  <span className="people-work__head">
                    <span className="people-work__label">{sector.label}</span>
                    {share !== null && <strong className={`people-work__share is-${staffedTone(share)}`}>{share}%</strong>}
                  </span>
                  <span className="people-work__gauge">
                    <Gauge max={100} size="sm" segments={share === null ? [] : [{ value: share, tone: staffedTone(share) }]} label={share === null ? `No ${sector.label.toLowerCase()} yet` : `${share}% staffed`} />
                    {pending !== null && jobs.jobs > 0 && <span className="people-work__mark" style={{ left: `${Math.min(100, (pending / jobs.jobs) * 100)}%` }} aria-hidden="true" />}
                  </span>
                  <span className="people-work__figures">{share === null ? "None yet" : `${formatAmount(jobs.hired)} of ${formatAmount(jobs.jobs)} jobs`}</span>
                  {skill !== null && skill < 0.995 && (
                    <span
                      className="people-work__skill"
                      data-tip={`${formatAmount(Math.min(trained, jobs.hired))} of those working here know the work. Someone new gives 60% of a trained hand, 90% after six months and 97% after a year.`}
                    >
                      {Math.round(skill * 100)}% skill
                    </span>
                  )}
                  {empty >= 1 && <span className="people-work__empty" data-tip="Your limit holds these jobs back, or there is nobody to fill them.">{formatAmount(empty)} jobs empty</span>}
                  {pending !== null && (
                    <span className="people-work__next" data-tip="Who will really work here. It can differ from your limit: people who won't travel take any job open near home rather than stand idle.">
                      {formatAmount(pending)} from {when}
                    </span>
                  )}
                  {coming && jobs.jobs > 0 && (
                    <span className="people-work__steps">
                      <button type="button" aria-label={`${WORK_PLAN_STEP} fewer in ${sector.label.toLowerCase()}`} data-tip={`${WORK_PLAN_STEP} fewer here, from ${when}`} disabled={!canMoveWorkers(state, sector.key, "fewer")} onClick={() => dispatch((s) => moveWorkers(s, sector.key, "fewer"))}>
                        −
                      </button>
                      <span className="people-work__limit" data-tip="The most people here from the month's end">{formatAmount(coming[sector.key])}</span>
                      <button type="button" aria-label={`${WORK_PLAN_STEP} more in ${sector.label.toLowerCase()}`} data-tip={`${WORK_PLAN_STEP} more here, from ${when}`} disabled={!canMoveWorkers(state, sector.key, "more")} onClick={() => dispatch((s) => moveWorkers(s, sector.key, "more"))}>
                        +
                      </button>
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Every province as a row: homes and jobs as bars you can compare down the
// column, and its mood as a picture; the exact figures in each one's tip.
// Picking a row makes it the province Build builds in.
function ProvinceRows({
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
      <div className="people-provinces__head">
        <h3 className="people-section-title">Provinces</h3>
        <span className="people-provinces__column" title="People and homes">
          <StatIcon type="population" size={18} />
        </span>
        <span className="people-provinces__column" title="Workers and jobs">
          <JobsIcon size={18} />
        </span>
        <span />
        <span />
      </div>
      {provinces.map((p) => {
        const status = getProvinceStatus(p);
        const selected = p.id === selectedProvinceId;
        const filled = p.jobs - p.openJobs;
        return (
          <div key={p.id} className={`people-province ${selected ? "is-selected" : ""}`}>
            <button type="button" className="people-province__pick" aria-pressed={selected} onClick={() => onSelectProvince(p.id)}>
              {p.isCapital && <span aria-label="Capital">★ </span>}
              {p.name}
            </button>
            <span className="people-province__cell" title={`${formatAmount(p.population)} people, homes for ${formatAmount(p.capacity)}${p.homeless >= 1 ? `, ${formatAmount(p.homeless)} without a home` : ""}`}>
              <Gauge
                max={Math.max(1, p.capacity)}
                size="sm"
                overflow={p.homeless}
                segments={[{ value: Math.min(p.population, p.capacity), tone: status.homes === "over" ? "bad" : status.homes === "full" ? "warn" : "good" }]}
                label={`${formatAmount(p.population)} people, homes for ${formatAmount(p.capacity)}`}
              />
              <span className="people-province__figure">{formatAmount(p.population)}</span>
            </span>
            <span
              className="people-province__cell"
              title={`${formatAmount(filled)} of ${formatAmount(p.jobs)} jobs filled${p.unemployed >= 1 ? `, ${formatAmount(p.unemployed)} jobless` : ""}. Farms and food: ${formatAmount(p.sectors.food.hired)} of ${formatAmount(p.sectors.food.jobs)}. Factories: ${formatAmount(p.sectors.industry.hired)} of ${formatAmount(p.sectors.industry.jobs)}.`}
            >
              <Gauge
                max={Math.max(1, p.jobs)}
                size="sm"
                overflow={p.unemployed}
                segments={[{ value: filled, tone: status.jobs === "jobless" ? "bad" : status.jobs === "short" ? "warn" : "good" }]}
                label={`${formatAmount(filled)} of ${formatAmount(p.jobs)} jobs filled`}
              />
              <span className={`people-province__figure ${status.jobs === "jobless" ? "is-bad" : ""}`}>{p.unemployed >= 1 ? `${formatAmount(p.unemployed)} jobless` : formatAmount(p.jobs)}</span>
            </span>
            <span className="people-province__mood" title={UNREST_INFO[p.unrestStage].name}>
              <UnrestStageIcon stage={p.unrestStage} size={20} />
            </span>
            <span className="people-province__action">
              {selected && (
                <button type="button" className="people-province__build" onClick={onBuild}>
                  Build ›
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface PeoplePanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
  production: DailyProductionSummary;
  provinces: ProvinceOverview[];
  selectedProvinceId: string;
  onSelectProvince: (provinceId: string) => void;
  onOpenPanel: OpenPanel;
  onBuild: () => void; // to the Build section, for the picked province
}

export function PeoplePanel({ state, dispatch, production, provinces, selectedProvinceId, onSelectProvince, onOpenPanel, onBuild }: PeoplePanelProps) {
  const population = state.stats.population;
  const capacity = production.housingCapacity;
  const homeless = production.homeless; // summed over provinces — a free home elsewhere doesn't help

  const labour = getLabourSituation(state);
  const shortWorkers = Math.max(0, labour.jobs - labour.workers);
  const unfilled = Object.values(labour.provinces).reduce((sum, p) => sum + p.openJobs, 0);
  const housed = Math.max(0, population - homeless);

  const heating = getHeatingOutlook(state);
  const fuelShort = heating.fuel < heating.fuelNeeded;
  const fuelDays = Number.isFinite(heating.daysOfFuel) ? Math.floor(heating.daysOfFuel) : "∞";
  const fuelAgainst = `${heating.winterDaysLeft} ${heating.isWinter ? "days of winter left" : "days of next winter"}`;
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
            label={`Coal and wood for ${fuelDays} of the ${fuelAgainst}`}
          />
        }
        danger={fuelShort && (heating.isWinter || heating.daysUntilWinter <= ADVISOR_WINTER_PREP_DAYS)}
        value={`fuel for ${fuelDays} of ${heating.winterDaysLeft} days`}
        detail={
          <span className="people-meter__fuel">
            <span title={`Coal, burned first. Lasts ${Number.isFinite(heating.coalDays) ? Math.floor(heating.coalDays) : "∞"} days.`}>
              <svg viewBox="-10 -10 20 20" width={14} height={14}>
                <ResourceIcon type="coal" size={8} />
              </svg>
              {Math.floor(state.resources.coal)}
            </span>
            <span>+</span>
            <span title={`Firewood, burned once the coal runs out. ${WOOD_PER_COAL_HEAT} wood do the work of 1 coal, so it lasts ${Number.isFinite(heating.woodDays) ? Math.floor(heating.woodDays) : "∞"} days.`}>
              <svg viewBox="-10 -10 20 20" width={14} height={14}>
                <ResourceIcon type="wood" size={8} />
              </svg>
              {Math.floor(state.resources.wood)}
            </span>
            <span className="people-meter__fuel-rate">
              {formatRate(-heating.fuelPerDay)} coal or {formatRate(-heating.fuelPerDay * WOOD_PER_COAL_HEAT)} wood{heating.isWinter ? "" : ` · winter in ${heating.daysUntilWinter} days`}
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
            {runOut && <span className="people-meter__fuel-rate">{runOut.days === 0 ? "none left" : `lasts ${runOut.days} days`}</span>}
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

      <WorkChain state={state} labour={labour} dispatch={dispatch} />

      <ProvinceRows provinces={provinces} selectedProvinceId={selectedProvinceId} onSelectProvince={onSelectProvince} onBuild={onBuild} />
    </section>
  );
}
