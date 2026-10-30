// The Build window, in two sections:
// - Buildings: what's being built as a strip of rings along the top, a rail
//   of building kinds down the left (and Repairs), and the chosen kind's
//   buildings beside it
// - People: homes, jobs, heating and food, nationally and by province
// Each section tab says at a glance how it stands, with a "!" when
// something there needs the player; the advisor strip and toasts open the
// right section directly (see navigation.ts).
import "./BuildPanel.css";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { getProvinceStatus, type ProvinceOverview } from "../../application/getProvinceOverview";
import type { GameState } from "../../domain/country/types";
import type { BuildSection, OpenPanel } from "../navigation";
import { ActionsPanel } from "./ActionsPanel";
import { NavIcon } from "./NavIcon";
import { PeoplePanel } from "./PeoplePanel";
import { ProjectRings } from "./ProjectsPanel";
import { RepairsPanel, WrenchIcon } from "./RepairsPanel";
import { BuildingIcon } from "./BuildingIcon";
import { BUILD_GROUPS, type BuildRail } from "../buildGroups";
import { StatIcon } from "./StatIcon";
import { SubTabs, type SubTab } from "./SubTabs";

interface BuildPanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
  production: DailyProductionSummary;
  provinces: ProvinceOverview[];
  selectedProvinceId: string;
  onSelectProvince: (provinceId: string) => void;
  onOpenPanel: OpenPanel;
  section: BuildSection;
  onSection: (section: BuildSection) => void;
  rail: BuildRail;
  onRail: (rail: BuildRail) => void;
}

function sectionTabs(state: GameState, production: DailyProductionSummary, provinces: ProvinceOverview[]): SubTab[] {
  const broken = state.placedBuildings.filter((b) => b.condition === "broken").length;
  const stalled = state.projects.filter((p) => p.isStalled).length;
  const peopleTrouble = provinces.some((p) => {
    const status = getProvinceStatus(p);
    return status.homes === "over" || status.jobs === "jobless" || status.stage === "strikes" || status.stage === "riots";
  });
  return [
    {
      key: "buildings",
      label: "Buildings",
      icon: <NavIcon type="build" size={22} />,
      alert: broken > 0 || stalled > 0,
      hint: `${state.projects.length} projects underway${broken > 0 ? `, ${broken} broken buildings to repair` : ""}${stalled > 0 ? `, ${stalled} stalled` : ""}`,
    },
    {
      key: "people",
      label: "People",
      icon: <StatIcon type="population" size={22} />,
      alert: peopleTrouble || production.unheatedShare > 0 || production.netFood < 0,
      hint: peopleTrouble ? "Some provinces are short of homes or work" : "Homes, jobs, heating and food, province by province",
    },
  ];
}

// The kind looked at (`rail`) is kept by App between openings of the
// window, so a "Go" elsewhere can open Build straight at farms.
export function BuildPanel({ state, dispatch, production, provinces, selectedProvinceId, onSelectProvince, onOpenPanel, section, onSection, rail, onRail: setRail }: BuildPanelProps) {
  const broken = state.placedBuildings.filter((b) => b.condition === "broken").length;
  const damaged = broken + state.placedBuildings.filter((b) => b.condition === "repairing").length;
  return (
    <div className="window-panel">
      <SubTabs label="Build sections" tabs={sectionTabs(state, production, provinces)} active={section} onSelect={(key) => onSection(key as BuildSection)} />

      {section === "buildings" && (
        <div className="production">
          <ProjectRings state={state} dailyCost={production.buildingInstalments} />
          <div className="production__body">
            <nav className="production__rail" aria-label="Kinds of building">
              {BUILD_GROUPS.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  className={`production__kind ${rail === group.key ? "is-active" : ""}`}
                  aria-pressed={rail === group.key}
                  aria-label={group.title}
                  title={group.title}
                  onClick={() => setRail(group.key)}
                >
                  <svg viewBox="-12 -16 24 24" aria-hidden="true">
                    <BuildingIcon type={group.picture} x={0} y={0} size={7} />
                  </svg>
                </button>
              ))}
              <span className="production__rail-gap" />
              <button
                type="button"
                className={`production__kind production__kind--repairs ${rail === "repairs" ? "is-active" : ""} ${broken > 0 ? "has-broken" : ""}`}
                aria-pressed={rail === "repairs"}
                aria-label={broken > 0 ? `Repairs, ${broken} broken` : "Repairs"}
                title={broken > 0 ? `Repairs: ${broken} broken` : "Repairs"}
                onClick={() => setRail("repairs")}
              >
                <WrenchIcon size={24} />
                {broken > 0 && <span className="production__count">{broken}</span>}
              </button>
            </nav>
            <div className="production__main">
              {rail === "repairs" ? (
                damaged > 0 ? (
                  <RepairsPanel state={state} dispatch={dispatch} />
                ) : (
                  <div className="empty-plate production__nothing">
                    <span>
                      <WrenchIcon size={22} />
                    </span>
                    <p>Nothing broken.</p>
                  </div>
                )
              ) : (
                <ActionsPanel state={state} group={rail} selectedProvinceId={selectedProvinceId} dispatch={dispatch} provinces={provinces} onSelectProvince={onSelectProvince} netPerDay={production.netTreasury} />
              )}
            </div>
          </div>
        </div>
      )}

      {section === "people" && (
        <PeoplePanel
          state={state}
          production={production}
          provinces={provinces}
          selectedProvinceId={selectedProvinceId}
          onSelectProvince={onSelectProvince}
          onOpenPanel={onOpenPanel}
          onBuild={() => onSection("buildings")}
        />
      )}
    </div>
  );
}
