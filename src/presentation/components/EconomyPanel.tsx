// The Economy tab, one section at a time (HOI4-style subtabs) instead of
// seven panels stacked in one long scroll:
// - Build: what to build where, what's underway, what needs repairing
// - People: homes, jobs and heating, nationally and province by province
// - Staff: scientists and police on the payroll
// - Budget: the day's money in and out, the tax lever, and food
// Each tab says at a glance how its section stands, with a "!" when
// something there needs the player; the advisor strip and toasts open the
// right section directly (see App.tsx).
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import type { EconomySection } from "../../application/getAdvisorOutlook";
import { getProvinceStatus, type ProvinceOverview } from "../../application/getProvinceOverview";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getTotalScientists } from "../../domain/workforce/workforceRules";
import { formatCompact, formatSignedChange } from "../formatNumber";
import { ActionsPanel } from "./ActionsPanel";
import { BudgetPanel } from "./BudgetPanel";
import { NavIcon } from "./NavIcon";
import { PeoplePanel } from "./PeoplePanel";
import { ProductionPanel } from "./ProductionPanel";
import { ProjectsPanel } from "./ProjectsPanel";
import { RepairsPanel } from "./RepairsPanel";
import { StatIcon } from "./StatIcon";
import { SubTabs, type SubTab } from "./SubTabs";
import { TaxPanel } from "./TaxPanel";
import type { OpenPanel } from "./TopBar";
import { WorkforcePanel } from "./WorkforcePanel";

interface EconomyPanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
  production: DailyProductionSummary;
  provinces: ProvinceOverview[];
  selectedProvinceId: string;
  onSelectProvince: (provinceId: string) => void;
  onOpenPanel: OpenPanel;
  section: EconomySection;
  onSection: (section: EconomySection) => void;
}

function sectionTabs(state: GameState, production: DailyProductionSummary, provinces: ProvinceOverview[]): SubTab[] {
  const broken = state.placedBuildings.filter((b) => b.condition === "broken").length;
  const stalled = state.projects.filter((p) => p.isStalled).length;
  const peopleTrouble = provinces.some((p) => {
    const status = getProvinceStatus(p);
    return status.homes === "over" || status.jobs === "jobless" || status.stage === "strikes" || status.stage === "riots";
  });
  const scientists = getTotalScientists(state.workforce);
  return [
    {
      key: "build",
      label: "Build",
      icon: <NavIcon type="economy" size={22} />,
      alert: broken > 0 || stalled > 0,
      badge: state.projects.length > 0 ? `${state.projects.length} underway` : undefined,
      hint: `${state.projects.length} projects underway${broken > 0 ? `, ${broken} broken buildings to repair` : ""}${stalled > 0 ? `, ${stalled} stalled` : ""}`,
    },
    {
      key: "people",
      label: "People",
      icon: <StatIcon type="population" size={22} />,
      alert: peopleTrouble || production.unheatedShare > 0,
      badge: formatCompact(state.stats.population),
      hint: peopleTrouble ? "Some provinces are short of homes or work" : "Homes, jobs and heating, province by province",
    },
    {
      key: "staff",
      label: "Staff",
      icon: <StatIcon type="police" size={22} />,
      badge: `${scientists} + ${state.workforce.police}`,
      hint: `${scientists} scientists and ${state.workforce.police} police on the payroll`,
    },
    {
      key: "budget",
      label: "Budget",
      icon: <StatIcon type="treasury" size={22} />,
      alert: production.netTreasury < 0,
      badge: `${formatSignedChange(production.netTreasury)}/d`,
      hint: `Net ${formatSignedChange(production.netTreasury)} ${CURRENCY_SYMBOL} a day after wages and building`,
    },
  ];
}

export function EconomyPanel({ state, dispatch, production, provinces, selectedProvinceId, onSelectProvince, onOpenPanel, section, onSection }: EconomyPanelProps) {
  return (
    <div className="economy-panel">
      <SubTabs label="Economy sections" tabs={sectionTabs(state, production, provinces)} active={section} onSelect={(key) => onSection(key as EconomySection)} />

      {section === "build" && (
        <div className="economy-modal">
          <ActionsPanel state={state} selectedProvinceId={selectedProvinceId} dispatch={dispatch} provinces={provinces} onSelectProvince={onSelectProvince} />
          <div className="economy-modal__side">
            <ProjectsPanel state={state} />
            <RepairsPanel state={state} dispatch={dispatch} />
          </div>
        </div>
      )}

      {section === "people" && (
        <div className="economy-modal__single economy-modal__single--wide">
          <PeoplePanel
            state={state}
            production={production}
            provinces={provinces}
            selectedProvinceId={selectedProvinceId}
            onSelectProvince={onSelectProvince}
            onOpenPanel={onOpenPanel}
            onBuild={() => onSection("build")}
          />
        </div>
      )}

      {section === "staff" && (
        <div className="economy-modal__single">
          <WorkforcePanel state={state} dispatch={dispatch} />
        </div>
      )}

      {section === "budget" && (
        <div className="economy-modal economy-modal--even">
          <BudgetPanel state={state} production={production} onSection={onSection} />
          <div className="economy-modal__side">
            <TaxPanel state={state} production={production} dispatch={dispatch} />
            <ProductionPanel state={state} production={production} />
          </div>
        </div>
      )}
    </div>
  );
}
