// The salaried workforce: scientists per research area, and police. Each
// row is an icon, a headcount, and a −/+ stepper; what a hire costs and
// what it buys sit in the tooltips. The same stepper is reused in the
// Research tab's column headers (see ResearchPanel.tsx).
import "./WorkforcePanel.css";
import {
  canHirePolice,
  canHireScientist,
  dismissPolice,
  dismissScientist,
  hirePolice,
  hireScientist,
} from "../../application/actions";
import {
  CURRENCY_SYMBOL,
  POLICE_HIRE_COST,
  POLICE_SALARY,
  RESEARCH_PER_SCIENTIST,
  SCIENTIST_HIRE_COST,
  SCIENTIST_SALARY,
} from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import type { ResearchCategory } from "../../domain/research/types";
import {
  getDailySalaries,
  getPoliceBreakdownReduction,
  getPoliceCap,
  getPoliceStabilityBonus,
  getScientistCap,
  getTotalScientists,
  RESEARCH_CATEGORIES,
} from "../../domain/workforce/workforceRules";
import { playConfirm } from "../audio/sound";
import { AREA_ICONS, AREA_LABELS } from "../researchAreas";
import { StatIcon } from "./StatIcon";

type Dispatch = (action: (state: GameState) => GameState) => void;

export function StaffStepper({
  count,
  canAdd,
  addHint,
  removeHint,
  onAdd,
  onRemove,
}: {
  count: number;
  canAdd: boolean;
  addHint: string;
  removeHint: string;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <span className="staff-stepper">
      <button type="button" className="staff-stepper__button" disabled={count === 0} onClick={onRemove} title={removeHint} aria-label={removeHint}>
        −
      </button>
      <span className="staff-stepper__count">{count}</span>
      <button
        type="button"
        className="staff-stepper__button staff-stepper__button--add"
        disabled={!canAdd}
        onClick={() => {
          playConfirm();
          onAdd();
        }}
        title={addHint}
        aria-label={addHint}
      >
        +
      </button>
    </span>
  );
}

export function ScientistStepper({ state, category, dispatch }: { state: GameState; category: ResearchCategory; dispatch: Dispatch }) {
  const full = getTotalScientists(state.workforce) >= getScientistCap(state.educationLevel);
  return (
    <StaffStepper
      count={state.workforce.scientists[category]}
      canAdd={canHireScientist(state)}
      addHint={
        full
          ? "No more scientists to hire — build schools to train more"
          : `Hire a ${AREA_LABELS[category].toLowerCase()} scientist: ${SCIENTIST_HIRE_COST} ${CURRENCY_SYMBOL}, then ${SCIENTIST_SALARY} ${CURRENCY_SYMBOL}/day — +${RESEARCH_PER_SCIENTIST} research/day here`
      }
      removeHint={`Let a ${AREA_LABELS[category].toLowerCase()} scientist go`}
      onAdd={() => dispatch((s) => hireScientist(s, category))}
      onRemove={() => dispatch((s) => dismissScientist(s, category))}
    />
  );
}

// "used/cap", with what sets the cap in the tooltip.
function CapMeter({ used, cap, label }: { used: number; cap: number; label: string }) {
  return (
    <span className="workforce-panel__cap" title={`${label}: ${used} of ${cap}`}>
      {used}/{cap}
    </span>
  );
}

export function WorkforcePanel({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const salaries = getDailySalaries(state.workforce);
  const scientistCap = getScientistCap(state.educationLevel);
  const policeCap = getPoliceCap(state.stats.population);
  const police = state.workforce.police;

  return (
    <section className="panel workforce-panel">
      <div className="workforce-panel__header">
        <h2>Workforce</h2>
        <span className="workforce-panel__salaries" title="Paid out of the treasury every day">
          <StatIcon type="treasury" size={15} />−{salaries}/d
        </span>
      </div>

      <div className="workforce-panel__group">
        <span className="workforce-panel__group-title">
          <StatIcon type="research" size={16} />
          Scientists
          <CapMeter used={getTotalScientists(state.workforce)} cap={scientistCap} label="Scientists employed (schools train more)" />
        </span>
        {RESEARCH_CATEGORIES.map((category) => (
          <div className="workforce-panel__row" key={category}>
            <StatIcon type={AREA_ICONS[category]} size={20} />
            <span className="workforce-panel__label">{AREA_LABELS[category]}</span>
            <ScientistStepper state={state} category={category} dispatch={dispatch} />
          </div>
        ))}
      </div>

      <div className="workforce-panel__group">
        <span className="workforce-panel__group-title">
          <StatIcon type="police" size={16} />
          Police
          <CapMeter used={police} cap={policeCap} label="Officers employed (one per 2,000 people)" />
        </span>
        <div
          className="workforce-panel__row"
          title={`+${getPoliceStabilityBonus(police).toFixed(2)} stability/day, ${Math.round(getPoliceBreakdownReduction(police) * 100)}% fewer breakdowns`}
        >
          <StatIcon type="police" size={20} />
          <span className="workforce-panel__label">
            Constables
            <span className="workforce-panel__effect">
              <StatIcon type="stability" size={13} />+{getPoliceStabilityBonus(police).toFixed(2)}/d
            </span>
          </span>
          <StaffStepper
            count={police}
            canAdd={canHirePolice(state)}
            addHint={
              police >= policeCap
                ? "No more officers needed for this population"
                : `Hire an officer: ${POLICE_HIRE_COST} ${CURRENCY_SYMBOL}, then ${POLICE_SALARY} ${CURRENCY_SYMBOL}/day — steadier stability, fewer breakdowns`
            }
            removeHint="Let an officer go"
            onAdd={() => dispatch(hirePolice)}
            onRemove={() => dispatch(dismissPolice)}
          />
        </div>
      </div>
    </section>
  );
}
