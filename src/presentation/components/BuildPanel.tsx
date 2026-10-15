// The Build window, in two sections:
// - Buildings: what to build where, what's underway, what needs repairing
// - People: homes, jobs, heating and food, nationally and by province
// Each section tab says at a glance how it stands, with a "!" when
// something there needs the player; the advisor strip and toasts open the
// right section directly (see navigation.ts).
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { getProvinceStatus, type ProvinceOverview } from "../../application/getProvinceOverview";
import type { GameState } from "../../domain/country/types";
import { formatCompact } from "../formatNumber";
import type { BuildSection, OpenPanel } from "../navigation";
import { ActionsPanel } from "./ActionsPanel";
import { NavIcon } from "./NavIcon";
import { PeoplePanel } from "./PeoplePanel";
import { ProductionPanel } from "./ProductionPanel";
import { ProjectsPanel } from "./ProjectsPanel";
import { RepairsPanel } from "./RepairsPanel";
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
      badge: state.projects.length > 0 ? `${state.projects.length} underway` : undefined,
      hint: `${state.projects.length} projects underway${broken > 0 ? `, ${broken} broken buildings to repair` : ""}${stalled > 0 ? `, ${stalled} stalled` : ""}`,
    },
    {
      key: "people",
      label: "People",
      icon: <StatIcon type="population" size={22} />,
      alert: peopleTrouble || production.unheatedShare > 0 || production.netFood < 0,
      badge: formatCompact(state.stats.population),
      hint: peopleTrouble ? "Some provinces are short of homes or work" : "Homes, jobs, heating and food, province by province",
    },
  ];
}

export function BuildPanel({ state, dispatch, production, provinces, selectedProvinceId, onSelectProvince, onOpenPanel, section, onSection }: BuildPanelProps) {
  return (
    <div className="window-panel">
      <SubTabs label="Build sections" tabs={sectionTabs(state, production, provinces)} active={section} onSelect={(key) => onSection(key as BuildSection)} />

      {section === "buildings" && (
        <div className="window-layout">
          <ActionsPanel state={state} selectedProvinceId={selectedProvinceId} dispatch={dispatch} provinces={provinces} onSelectProvince={onSelectProvince} />
          <div className="window-layout__side">
            <ProjectsPanel state={state} />
            <RepairsPanel state={state} dispatch={dispatch} />
          </div>
        </div>
      )}

      {section === "people" && (
        <div className="window-layout">
          <PeoplePanel
            state={state}
            production={production}
            provinces={provinces}
            selectedProvinceId={selectedProvinceId}
            onSelectProvince={onSelectProvince}
            onOpenPanel={onOpenPanel}
            onBuild={() => onSection("buildings")}
          />
          <div className="window-layout__side">
            <ProductionPanel state={state} production={production} />
          </div>
        </div>
      )}
    </div>
  );
}
