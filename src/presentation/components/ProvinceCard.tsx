// The province you clicked on the map, as a card docked at the map's edge:
// what it needs most, in one sentence, with up to three one-click fixes for
// it (see getProvinceSuggestions), then a short fact sheet: its people and
// homes, who's moving in or out, work, mood, what the land yields, and
// what stands or is going up there. A link at the foot opens the Build
// window, already pointed at this province, for anything else.
import "./ProvinceCard.css";
import { useEffect, type ReactNode } from "react";
import { buyAndBuild, repairBuilding } from "../../application/actions";
import { getProvinceStatus, type ProvinceOverview } from "../../application/getProvinceOverview";
import { getProvinceSuggestions, type Suggestion } from "../../application/getProvinceSuggestions";
import { CURRENCY_SYMBOL, SUPPLY_FEE_PER_DAY } from "../../domain/constants";
import { getLinkedIslands, isIsland } from "../../domain/islands/islandRules";
import { getRepairCost } from "../../domain/maintenance/maintenanceRules";
import { getModifiers } from "../../domain/policy/policyRules";
import { playBuild } from "../audio/sound";
import type { ProjectType } from "../../domain/construction/types";
import { formatDate, getSeason } from "../../domain/country/calendar";
import type { GameState } from "../../domain/country/types";
import type { Sector } from "../../domain/labour/labourRules";
import { isWorking } from "../../domain/maintenance/maintenanceRules";
import { getPlace } from "../../domain/provinces/provinceRules";
import { calculateDailyProduction, RESOURCE_BY_TERRAIN } from "../../domain/resources/resourceRules";
import { RESOURCE_TYPES, type ResourceType } from "../../domain/resources/types";
import { formatAmount, formatRate } from "../formatNumber";
import { UNREST_INFO } from "../unrestStages";
import { BuildingGlyph, HourglassIcon, JobsIcon, UnrestStageIcon } from "./CauseIcon";
import { NavIcon } from "./NavIcon";
import { Gauge } from "./Gauge";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";
import type { OpenPanel } from "../navigation";

const BUILDING_NAMES: Record<ProjectType, [string, string]> = {
  housing: ["Home", "Homes"],
  farm: ["Farm", "Farms"],
  factory: ["Factory", "Factories"],
  road: ["Road", "Roads"],
  education: ["School", "Schools"],
  granary: ["Granary", "Granaries"],
  cannery: ["Cannery", "Canneries"],
  harbour: ["Harbour", "Harbours"],
};

const SECTOR_LABELS: Array<[Sector, string]> = [
  ["food", "Farms & food"],
  ["school", "Schools"],
  ["industry", "Factories"],
];

function plural(count: number, type: ProjectType): string {
  return `${count} ${BUILDING_NAMES[type][count === 1 ? 0 : 1]}`;
}

// What the province needs most, in one sentence.
function getNeed(p: ProvinceOverview): { text: string; urgent: boolean } {
  const status = getProvinceStatus(p);
  if (status.stage === "riots" || status.stage === "strikes") {
    // A refused pay rise, not want, unless want is there too.
    if (p.disputeUntil && status.homes !== "over" && status.jobs !== "jobless") {
      return { text: `${UNREST_INFO[status.stage].name}: its workers are in dispute over pay.`, urgent: true };
    }
    if (p.stirred && status.homes !== "over" && status.jobs !== "jobless") {
      return { text: `${UNREST_INFO[status.stage].name}: the uprising next door has stirred it up.`, urgent: true };
    }
    if (isIsland(p.id) && status.homes !== "over" && status.jobs !== "jobless") {
      return { text: `${UNREST_INFO[status.stage].name}: far from the mainland, it feels forgotten.`, urgent: true };
    }
    const why = status.homes === "over" ? "homes" : "work";
    return { text: `${UNREST_INFO[status.stage].name}: too many here have no ${why}.`, urgent: true };
  }
  if (status.homes === "over") return { text: `Needs homes: ${formatAmount(p.homeless)} without a roof.`, urgent: true };
  if (status.jobs === "jobless") return { text: `Needs work: ${formatAmount(p.unemployed)} jobless here.`, urgent: true };
  if (status.homes === "full") return { text: "Homes nearly full. Room to grow is running out.", urgent: false };
  if (status.jobs === "short") return { text: `Jobs going unfilled: ${formatAmount(p.openJobs)} open. Homes here would bring workers.`, urgent: false };
  return { text: "All well. Nothing pressing here.", urgent: false };
}

function Fact({ icon, label, children, alert = false }: { icon: ReactNode; label: string; children: ReactNode; alert?: boolean }) {
  return (
    <div className={`province-card__fact ${alert ? "is-alert" : ""}`}>
      <dt>
        <span className="province-card__fact-icon" aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function ResourceGlyph({ type }: { type: ResourceType }) {
  return (
    <svg viewBox="-10 -10 20 20" width={16} height={16} aria-hidden="true">
      <ResourceIcon type={type} size={8} />
    </svg>
  );
}

type Dispatch = (action: (state: GameState) => GameState) => void;

// One fix the province needs, as a row: what, why, and the button that does it.
function SuggestionRow({ state, suggestion, provinceId, dispatch }: { state: GameState; suggestion: Suggestion; provinceId: string; dispatch: Dispatch }) {
  if (suggestion.kind === "repair") {
    const cost = getRepairCost(suggestion.type, getModifiers(state).repairCostMultiplier);
    const name = BUILDING_NAMES[suggestion.type][0];
    return (
      <li className="province-card__fix">
        <BuildingGlyph type={suggestion.type} size={22} />
        <span className="province-card__fix-text">
          <strong>Repair {name.toLowerCase()}</strong>
          <span>{suggestion.why}</span>
        </span>
        <button
          type="button"
          disabled={!suggestion.can}
          title={`${formatAmount(Math.round(cost.treasury))} ${CURRENCY_SYMBOL} and ${cost.resourceAmount} ${cost.resourceType}${suggestion.can ? "" : ": not enough yet"}`}
          onClick={() => dispatch((s) => repairBuilding(s, suggestion.buildingId))}
        >
          Repair
        </button>
      </li>
    );
  }
  const { action, how, plan } = suggestion;
  const name = action.config.label;
  const price = `${formatAmount(suggestion.cost)} ${CURRENCY_SYMBOL}, ${action.config.resourceCost} ${action.config.resourceType}`;
  const title =
    how === "build"
      ? `Build ${name.toLowerCase()} here: ${price}`
      : how === "buy"
        ? `Buys ${Math.round(plan!.amount)} ${action.config.resourceType} for ${formatAmount(Math.round(plan!.goodsCost))} ${CURRENCY_SYMBOL}, then builds: ${price}`
        : `${suggestion.blockedBy}. Costs ${price}.`;
  return (
    <li className="province-card__fix">
      <BuildingGlyph type={action.config.type} size={22} />
      <span className="province-card__fix-text">
        <strong>{name}</strong>
        <span>{how === "blocked" ? suggestion.blockedBy : suggestion.why}</span>
      </span>
      <button
        type="button"
        className="btn-primary"
        disabled={how === "blocked"}
        title={title}
        onClick={() => {
          playBuild();
          dispatch((s) => (action.canBuild(s, provinceId) ? action(s, provinceId) : buyAndBuild(s, action, provinceId)));
        }}
      >
        {how === "buy" ? "Buy & build" : "Build"}
      </button>
    </li>
  );
}

interface ProvinceCardProps {
  state: GameState;
  dispatch: Dispatch;
  province: ProvinceOverview;
  onOpenPanel: OpenPanel;
  onClose: () => void;
}

export function ProvinceCard({ state, dispatch, province, onOpenPanel, onClose }: ProvinceCardProps) {
  const status = getProvinceStatus(province);
  const need = getNeed(province);
  const suggestions = getProvinceSuggestions(state, province);
  const terrain = getPlace(province.id)?.terrain;
  const yields = terrain ? calculateDailyProduction([terrain], getSeason(state.date)) : null;
  const yieldTypes = yields ? RESOURCE_TYPES.filter((type) => yields[type] > 0) : [];

  const buildings = state.placedBuildings.filter((b) => b.provinceId === province.id);
  const builtTypes = [...new Set(buildings.map((b) => b.type))];
  const projects = state.projects.filter((p) => p.provinceId === province.id);
  const migration = Math.round(province.migration);
  const unrest = UNREST_INFO[province.unrestStage];

  // Escape closes the card (an open tab's own Escape handling comes first:
  // the card only listens while no modal covers the map).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector(".modal-overlay")) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <section className="province-card" aria-label={`${province.name}`}>
      <header className="province-card__head surface-leather">
        <h2 className="province-card__name">
          {province.isCapital && <span aria-label="Capital">★ </span>}
          {province.name}
        </h2>
        <button type="button" className="province-card__close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </header>

      {province.uprising ? (
        // Risen: what that means, how it is going, and where to end it.
        <div className="province-card__uprising">
          <p className="province-card__need is-urgent">
            <StatIcon type="uprising" size={18} /> Risen against the government
          </p>
          <p className="province-card__uprising-text">
            Rebels hold its farms and works, and it pays no taxes. Rebel strength <strong>{Math.round(province.uprising.strength)}</strong> (
            {formatRate(province.uprising.change.total, true)}).
            {province.uprising.breaksAwayIn !== null && (
              <strong className="province-card__bad">
                {" "}
                At full strength, it breaks away for good in {province.uprising.breaksAwayIn} {province.uprising.breaksAwayIn === 1 ? "day" : "days"}.
              </strong>
            )}
          </p>
          <button type="button" className="province-card__go" onClick={() => onOpenPanel("politics", "unrest")}>
            <StatIcon type="militia" size={18} /> Militia and uprisings ›
          </button>
        </div>
      ) : (
        <p className={`province-card__need ${need.urgent ? "is-urgent" : ""}`}>{need.text}</p>
      )}
      {!province.uprising && suggestions.length > 0 && (
        <ul className="province-card__fixes" aria-label={`What ${province.name} needs`}>
          {suggestions.map((suggestion) => (
            <SuggestionRow key={suggestion.key} state={state} suggestion={suggestion} provinceId={province.id} dispatch={dispatch} />
          ))}
        </ul>
      )}

      <dl className="province-card__facts">
        <Fact icon={<BuildingGlyph type="housing" size={16} />} label="Homes" alert={status.homes === "over"}>
          <strong>{formatAmount(province.population)}</strong> in homes for {formatAmount(province.capacity)}
          {province.homeless >= 1 && <span className="province-card__bad"> · {formatAmount(province.homeless)} homeless</span>}
          <Gauge
            max={province.capacity}
            segments={[{ value: province.population - province.homeless, tone: status.homes === "ok" ? "good" : "warn" }]}
            overflow={province.homeless}
            label={`Homes: ${Math.round(province.population)} people, room for ${Math.round(province.capacity)}`}
          />
        </Fact>

        <Fact icon={<StatIcon type="population" size={16} />} label="Moving">
          {migration > 0 ? (
            <span className="province-card__good">{migration} a day moving in</span>
          ) : migration < 0 ? (
            <span className="province-card__bad">{-migration} a day leaving</span>
          ) : (
            "Nobody moving"
          )}
        </Fact>

        <Fact icon={<JobsIcon size={16} />} label="Jobs" alert={status.jobs === "jobless"}>
          <strong>{formatAmount(province.jobs - province.openJobs)}</strong> of {formatAmount(province.jobs)} jobs filled
          {province.unemployed >= 1 && <span className="province-card__bad"> · {formatAmount(province.unemployed)} jobless</span>}
          {province.commutersOut >= 1 && <> · {formatAmount(province.commutersOut)} work elsewhere</>}
          {/* Where they work: farms and food first, as jobs are filled. */}
          <span className="province-card__sectors">
            {SECTOR_LABELS.filter(([key]) => province.sectors[key].jobs > 0).map(([key, label]) => {
              const sector = province.sectors[key];
              return (
                <span key={key} className={sector.hired < sector.jobs ? "province-card__bad" : ""}>
                  {label} {formatAmount(sector.hired)}/{formatAmount(sector.jobs)}
                </span>
              );
            })}
          </span>
          <Gauge
            max={province.jobs}
            segments={[
              { value: province.jobs - province.openJobs, tone: "good" },
              { value: province.openJobs, tone: "neutral", dashed: true },
            ]}
            overflow={province.unemployed}
            label={`Jobs: ${Math.round(province.jobs - province.openJobs)} of ${Math.round(province.jobs)} filled, ${Math.round(province.unemployed)} jobless`}
          />
        </Fact>

        <Fact
          icon={<UnrestStageIcon stage={province.unrestStage} size={16} />}
          label="Mood"
          alert={province.unrestStage === "strikes" || province.unrestStage === "riots"}
        >
          <strong>{province.uprising ? "Risen" : unrest.name}</strong> · local stability {Math.round(province.stability)}
          {!province.uprising && province.riotDays > 0 && (
            <span className="province-card__bad">
              {" "}
              · rises in {province.riotDaysToRise - province.riotDays} {province.riotDaysToRise - province.riotDays === 1 ? "day" : "days"}
            </span>
          )}
        </Fact>

        {(province.payRiseUntil || province.disputeUntil || province.taxReliefUntil) && (
          <Fact icon={<StatIcon type="treasury" size={16} />} label="Terms" alert={province.disputeUntil !== null}>
            {[
              province.payRiseUntil && `Pay rise until ${formatDate(province.payRiseUntil)}`,
              province.disputeUntil && `In dispute over pay until ${formatDate(province.disputeUntil)}`,
              province.taxReliefUntil && `No taxes until ${formatDate(province.taxReliefUntil)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Fact>
        )}

        <Fact icon={terrain ? <ResourceGlyph type={RESOURCE_BY_TERRAIN[terrain]} /> : null} label="Yields">
          {yieldTypes.length > 0
            ? `${yieldTypes.map((type) => `${yields![type].toFixed(1)} ${type}`).join(" + ")} a day`
            : `No ${terrain ? RESOURCE_BY_TERRAIN[terrain] : "goods"} this season`}
        </Fact>

        <Fact icon={<NavIcon type="build" size={16} />} label="Built">
          {builtTypes.length === 0
            ? "Nothing yet"
            : builtTypes.map((type, i) => {
                const ofType = buildings.filter((b) => b.type === type);
                const seized = ofType.filter((b) => b.condition === "seized").length;
                const broken = ofType.filter((b) => !isWorking(b)).length - seized;
                return (
                  <span key={type}>
                    {i > 0 && " · "}
                    {plural(ofType.length, type)}
                    {broken > 0 && <span className="province-card__bad"> ({broken} broken)</span>}
                    {seized > 0 && <span className="province-card__bad"> (held by rebels)</span>}
                  </span>
                );
              })}
        </Fact>

        {isIsland(province.id) && (
          <Fact icon={<BuildingGlyph type="harbour" size={16} />} label="Sea" alert={!getLinkedIslands(state).has(province.id)}>
            {getLinkedIslands(state).has(province.id)
              ? "Linked to the mainland by harbours: people cross freely"
              : `Not linked: supply ships cost ${SUPPLY_FEE_PER_DAY} ${CURRENCY_SYMBOL} a day. A harbour here and one on your coast link it.`}
          </Fact>
        )}

        {projects.length > 0 && (
          <Fact icon={<HourglassIcon size={16} />} label="Underway">
            {projects.map((project, i) => (
              <span key={project.id}>
                {i > 0 && " · "}
                {BUILDING_NAMES[project.type][0]}, {Math.ceil(project.daysRemaining)} days left
                {project.isStalled && <span className="province-card__bad"> (stalled)</span>}
              </span>
            ))}
          </Fact>
        )}
      </dl>

      <button type="button" className="province-card__more" onClick={() => onOpenPanel("build", "buildings")}>
        All buildings…
      </button>
    </section>
  );
}
