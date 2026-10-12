// The province you clicked on the map, as a card docked at the map's edge:
// its people and homes, workers and jobs, and mood — each with a "!" when
// in trouble — one line on what it needs most, and quick-build buttons with
// the fix for its problem first. "All buildings…" opens Economy › Build
// already pointed at this province.
import "./ProvinceCard.css";
import { useEffect } from "react";
import { buildCannery, buildEducation, buildFactory, buildFarm, buildGranary, buildHousing, buildRoad, countBuildingsInProvince } from "../../application/actions";
import { upfrontCost, type BuildAction } from "../../application/actions/createBuildAction";
import { getProvinceStatus, type ProvinceOverview } from "../../application/getProvinceOverview";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { ProjectType } from "../../domain/construction/types";
import type { GameState } from "../../domain/country/types";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import { isBuildingUnlocked } from "../../domain/research/researchRules";
import { RESOURCE_BY_TERRAIN } from "../../domain/resources/resourceRules";
import { playConfirm } from "../audio/sound";
import { formatCompact } from "../formatNumber";
import { UNREST_INFO } from "../unrestStages";
import { BuildingGlyph, UnrestStageIcon } from "./CauseIcon";
import { Gauge } from "./Gauge";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";
import type { OpenPanel } from "./TopBar";

const ACTIONS: Array<[ProjectType, BuildAction]> = [
  ["housing", buildHousing],
  ["farm", buildFarm],
  ["factory", buildFactory],
  ["education", buildEducation],
  ["road", buildRoad],
  ["granary", buildGranary],
  ["cannery", buildCannery],
];

const QUICK_BUILD_COUNT = 4;

// What the province needs most, and which buildings answer it, best first.
function getNeed(p: ProvinceOverview): { text: string; urgent: boolean; order: ProjectType[] } {
  const status = getProvinceStatus(p);
  if (status.stage === "riots" || status.stage === "strikes") {
    const why = status.homes === "over" ? "homes" : "work";
    return {
      text: `${UNREST_INFO[status.stage].name} — too many here have no ${why}. Build here, or crack down.`,
      urgent: true,
      order: why === "homes" ? ["housing", "farm", "factory"] : ["farm", "factory", "housing"],
    };
  }
  if (status.homes === "over") return { text: `Needs homes — ${formatCompact(p.homeless)} without a roof.`, urgent: true, order: ["housing", "farm", "factory"] };
  if (status.jobs === "jobless") return { text: `Needs work — ${formatCompact(p.unemployed)} jobless here.`, urgent: true, order: ["farm", "factory", "education", "housing"] };
  if (status.homes === "full") return { text: "Homes nearly full — room to grow is running out.", urgent: false, order: ["housing", "farm", "factory"] };
  if (status.jobs === "short") return { text: `Jobs going unfilled — ${formatCompact(p.openJobs)} open. Homes here would bring workers.`, urgent: false, order: ["housing", "farm", "factory"] };
  return { text: "Nothing pressing.", urgent: false, order: ["housing", "farm", "factory", "education"] };
}

interface ProvinceCardProps {
  state: GameState;
  province: ProvinceOverview;
  dispatch: (action: (state: GameState) => GameState) => void;
  onOpenPanel: OpenPanel;
  onClose: () => void;
}

export function ProvinceCard({ state, province, dispatch, onOpenPanel, onClose }: ProvinceCardProps) {
  const status = getProvinceStatus(province);
  const need = getNeed(province);
  const terrain = MAP_GEOMETRY.provinces.find((p) => p.id === province.id)?.terrain;

  // Escape closes the card (an open tab's own Escape handling comes first:
  // the card only listens while no modal covers the map).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector(".modal-overlay")) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const available = ACTIONS.filter(([type, action]) => !action.config.requiresResearch || isBuildingUnlocked(state.enactedResearchIds, type));
  const ordered = [
    ...need.order.flatMap((type) => available.filter(([t]) => t === type)),
    ...available.filter(([type]) => !need.order.includes(type)),
  ].slice(0, QUICK_BUILD_COUNT);

  return (
    <section className="province-card" aria-label={`${province.name}`}>
      <header className="province-card__head">
        <h2 className="province-card__name">
          {province.isCapital && <span aria-label="Capital">★ </span>}
          {province.name}
        </h2>
        {terrain && (
          <span className="province-card__terrain" title={`Produces ${RESOURCE_BY_TERRAIN[terrain]}`}>
            <svg viewBox="-10 -10 20 20" width={18} height={18} aria-hidden="true">
              <ResourceIcon type={RESOURCE_BY_TERRAIN[terrain]} size={8} />
            </svg>
          </span>
        )}
        <button type="button" className="province-card__close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </header>

      <div className="province-card__stats">
        <span className={`province-card__stat ${status.homes === "over" ? "is-alert" : ""}`} title={`${Math.round(province.population)} people, homes for ${Math.round(province.capacity)}`}>
          <BuildingGlyph type="housing" size={18} />
          {formatCompact(province.population)}/{formatCompact(province.capacity)}
          {status.homes === "over" && <span className="province-card__alert">!</span>}
        </span>
        <span
          className={`province-card__stat ${status.jobs === "jobless" ? "is-alert" : ""}`}
          title={`${Math.round(province.workers)} workers for ${Math.round(province.jobs)} jobs — ${Math.round(province.unemployed)} jobless, ${Math.round(province.openJobs)} unfilled`}
        >
          <StatIcon type="industry" size={18} />
          {formatCompact(province.workers)}/{formatCompact(province.jobs)}
          {status.jobs === "jobless" && <span className="province-card__alert">!</span>}
        </span>
        <span className="province-card__stat" title={`${UNREST_INFO[province.unrestStage].name}: ${UNREST_INFO[province.unrestStage].effect} Local stability ${Math.round(province.stability)}.`}>
          <UnrestStageIcon stage={province.unrestStage} size={18} />
          {UNREST_INFO[province.unrestStage].name}
        </span>
      </div>

      <div className="province-card__gauges">
        <Gauge
          max={province.capacity}
          segments={[{ value: province.population - province.homeless, tone: status.homes === "ok" ? "good" : "warn" }]}
          overflow={province.homeless}
          label={`Homes: ${Math.round(province.population)} people, room for ${Math.round(province.capacity)}`}
        />
        <Gauge
          max={province.jobs}
          segments={[
            { value: province.jobs - province.openJobs, tone: "good" },
            { value: province.openJobs, tone: "neutral", dashed: true },
          ]}
          overflow={province.unemployed}
          label={`Jobs: ${Math.round(province.jobs - province.openJobs)} of ${Math.round(province.jobs)} filled, ${Math.round(province.unemployed)} out of work`}
        />
      </div>

      <p className={`province-card__need ${need.urgent ? "is-urgent" : ""}`}>{need.text}</p>

      <div className="province-card__builds">
        {ordered.map(([type, action], index) => {
          const { config } = action;
          const count = countBuildingsInProvince(state, type, province.id);
          const canBuild = action.canBuild(state, province.id);
          const upfront = upfrontCost(config.cost);
          const material = upfrontCost(config.resourceCost);
          // Say what's missing, not just grey the button out.
          const moneyShort = state.stats.treasury < upfront;
          const materialShort = state.resources[config.resourceType] < material;
          const full = count >= config.maxPerProvince;
          return (
            <button
              key={type}
              type="button"
              className={`province-card__build ${index === 0 && need.urgent ? "is-recommended" : ""}`}
              disabled={!canBuild}
              title={`${config.label}: ${upfront} ${CURRENCY_SYMBOL} and ${material} ${config.resourceType} up front (${config.cost} ${CURRENCY_SYMBOL} in all) · ${count}/${config.maxPerProvince} here${full ? " — no room for more here" : materialShort ? ` — short of ${config.resourceType}: buy some on the Trade tab` : moneyShort ? " — not enough money yet" : ""}`}
              onClick={() => {
                playConfirm();
                dispatch((s) => action(s, province.id));
              }}
            >
              <BuildingGlyph type={type} size={22} />
              <span className="province-card__build-name">
                {index === 0 && need.urgent && <span aria-label="Recommended">★ </span>}
                {config.label}
                <span className={`province-card__build-count ${full ? "is-short" : ""}`}>
                  {count}/{config.maxPerProvince}
                </span>
              </span>
              <span className="province-card__build-cost">
                <span className={moneyShort ? "is-short" : ""}>
                  {formatCompact(upfront)} {CURRENCY_SYMBOL}
                  {moneyShort && "!"}
                </span>
                <span className={materialShort ? "is-short" : ""}>
                  <svg viewBox="-10 -10 20 20" width={13} height={13} aria-hidden="true">
                    <ResourceIcon type={config.resourceType} size={8} />
                  </svg>
                  {material}
                  {materialShort && "!"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button type="button" className="province-card__more" onClick={() => onOpenPanel("economy", "build")}>
        All buildings…
      </button>
    </section>
  );
}
