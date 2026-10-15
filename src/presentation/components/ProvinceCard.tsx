// The province you clicked on the map, as a card docked at the map's edge:
// what it needs most, in one sentence, then a short fact sheet — its people
// and homes, who's moving in or out, work, mood, what the land yields, and
// what stands or is going up there. It informs rather than builds: one link
// at the foot opens Economy › Build already pointed at this province.
import "./ProvinceCard.css";
import { useEffect, type ReactNode } from "react";
import { getProvinceStatus, type ProvinceOverview } from "../../application/getProvinceOverview";
import type { ProjectType } from "../../domain/construction/types";
import { getSeason } from "../../domain/country/calendar";
import type { GameState } from "../../domain/country/types";
import type { Sector } from "../../domain/labour/labourRules";
import { isWorking } from "../../domain/maintenance/maintenanceRules";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import { calculateDailyProduction, RESOURCE_BY_TERRAIN } from "../../domain/resources/resourceRules";
import { RESOURCE_TYPES, type ResourceType } from "../../domain/resources/types";
import { formatCompact } from "../formatNumber";
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
    const why = status.homes === "over" ? "homes" : "work";
    return { text: `${UNREST_INFO[status.stage].name}: too many here have no ${why}.`, urgent: true };
  }
  if (status.homes === "over") return { text: `Needs homes: ${formatCompact(p.homeless)} without a roof.`, urgent: true };
  if (status.jobs === "jobless") return { text: `Needs work: ${formatCompact(p.unemployed)} jobless here.`, urgent: true };
  if (status.homes === "full") return { text: "Homes nearly full. Room to grow is running out.", urgent: false };
  if (status.jobs === "short") return { text: `Jobs going unfilled: ${formatCompact(p.openJobs)} open. Homes here would bring workers.`, urgent: false };
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

interface ProvinceCardProps {
  state: GameState;
  province: ProvinceOverview;
  onOpenPanel: OpenPanel;
  onClose: () => void;
}

export function ProvinceCard({ state, province, onOpenPanel, onClose }: ProvinceCardProps) {
  const status = getProvinceStatus(province);
  const need = getNeed(province);
  const terrain = MAP_GEOMETRY.provinces.find((p) => p.id === province.id)?.terrain;
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

      <p className={`province-card__need ${need.urgent ? "is-urgent" : ""}`}>{need.text}</p>

      <dl className="province-card__facts">
        <Fact icon={<BuildingGlyph type="housing" size={16} />} label="Homes" alert={status.homes === "over"}>
          <strong>{formatCompact(province.population)}</strong> in homes for {formatCompact(province.capacity)}
          {province.homeless >= 1 && <span className="province-card__bad"> · {formatCompact(province.homeless)} homeless</span>}
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
          <strong>{formatCompact(province.jobs - province.openJobs)}</strong> of {formatCompact(province.jobs)} jobs filled
          {province.unemployed >= 1 && <span className="province-card__bad"> · {formatCompact(province.unemployed)} jobless</span>}
          {province.commutersOut >= 1 && <> · {formatCompact(province.commutersOut)} work elsewhere</>}
          {/* Where they work: farms and food first, as jobs are filled. */}
          <span className="province-card__sectors">
            {SECTOR_LABELS.filter(([key]) => province.sectors[key].jobs > 0).map(([key, label]) => {
              const sector = province.sectors[key];
              return (
                <span key={key} className={sector.hired < sector.jobs ? "province-card__bad" : ""}>
                  {label} {formatCompact(sector.hired)}/{formatCompact(sector.jobs)}
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
          <strong>{unrest.name}</strong> · local stability {Math.round(province.stability)}
        </Fact>

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
                const broken = ofType.filter((b) => !isWorking(b)).length;
                return (
                  <span key={type}>
                    {i > 0 && " · "}
                    {plural(ofType.length, type)}
                    {broken > 0 && <span className="province-card__bad"> ({broken} broken)</span>}
                  </span>
                );
              })}
        </Fact>

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
        Build here…
      </button>
    </section>
  );
}
