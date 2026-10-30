// The Build window, in two sections:
// - Buildings: what's being built as a strip of rings along the top, then
//   every kind of building in groups ruled off from one another, for the
//   province chosen on the map (which shows each province's slots meanwhile)
// - People: homes, jobs, heating and food
// Each section tab says at a glance how it stands, with a "!" when
// something there needs the player; the advisor strip and toasts open the
// right section directly (see navigation.ts).
import "./BuildPanel.css";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { getProvinceStatus, type ProvinceOverview } from "../../application/getProvinceOverview";
import type { GameState } from "../../domain/country/types";
import type { BuildSection, OpenPanel } from "../navigation";
import { useEffect, useRef } from "react";
import { ActionsPanel } from "./ActionsPanel";
import { NavIcon } from "./NavIcon";
import { PeoplePanel } from "./PeoplePanel";
import { ProjectRings } from "./ProjectsPanel";
import { RepairsPanel } from "./RepairsPanel";
import type { BuildRail } from "../buildGroups";
import { StatIcon } from "./StatIcon";
import { SubTabs, type SubTab } from "./SubTabs";

interface BuildPanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
  production: DailyProductionSummary;
  provinces: ProvinceOverview[];
  selectedProvinceId: string;
  onOpenPanel: OpenPanel;
  section: BuildSection;
  onSection: (section: BuildSection) => void;
  rail: BuildRail | null;
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

// `rail` is where a "Go" elsewhere wanted the window to open (at farms, say):
// the list scrolls there.
export function BuildPanel({ state, dispatch, production, provinces, selectedProvinceId, onOpenPanel, section, onSection, rail }: BuildPanelProps) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (rail && section === "buildings") list.current?.querySelector(`[data-rail="${rail}"]`)?.scrollIntoView({ block: "start" });
  }, [rail, section]);
  const broken = state.placedBuildings.filter((b) => b.condition === "broken").length;
  const damaged = broken + state.placedBuildings.filter((b) => b.condition === "repairing").length;
  return (
    <div className="window-panel">
      <SubTabs label="Build sections" tabs={sectionTabs(state, production, provinces)} active={section} onSelect={(key) => onSection(key as BuildSection)} />

      {section === "buildings" && (
        <div className="production">
          <ProjectRings state={state} dailyCost={production.buildingInstalments} />
          {/* Every kind of building, the groups ruled off; Repairs below when
              anything needs mending. */}
          <div className="production__main" ref={list}>
            <ActionsPanel state={state} selectedProvinceId={selectedProvinceId} dispatch={dispatch} provinces={provinces} netPerDay={production.netTreasury} />
            {damaged > 0 && (
              <div className="production__repairs" data-rail="repairs">
                <RepairsPanel state={state} dispatch={dispatch} />
              </div>
            )}
          </div>
        </div>
      )}

      {section === "people" && (
        <PeoplePanel
          state={state}
          production={production}
          onOpenPanel={onOpenPanel}
        />
      )}
    </div>
  );
}
