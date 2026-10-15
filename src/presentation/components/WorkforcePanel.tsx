// The salaried workforce: scientists per research area, and police. Each
// group heads with its places as seats (filled per hire) and what one hire
// costs and does; each row is an icon, what that row's staff produce, and a
// −/+ stepper. The same stepper is reused in the
// Research tab's column headers (see ResearchPanel.tsx).
import "./WorkforcePanel.css";
import type { ReactNode } from "react";
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
  POLICE_STABILITY_PER_OFFICER,
  POPULATION_PER_POLICE,
  RESEARCH_PER_SCIENTIST,
  SCIENTIST_HIRE_COST,
  SCIENTIST_SALARY,
} from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getResearchRateBreakdown } from "../../domain/research/researchRules";
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
import { playCoins } from "../audio/sound";
import { AREA_ICONS, AREA_LABELS } from "../researchAreas";
import { getModifiers } from "../../domain/policy/policyRules";
import { NavIcon } from "./NavIcon";
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
          playCoins();
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
          ? "No more scientists to hire. Build schools to train more."
          : `Hire a ${AREA_LABELS[category].toLowerCase()} scientist: ${SCIENTIST_HIRE_COST} ${CURRENCY_SYMBOL}, then ${SCIENTIST_SALARY} ${CURRENCY_SYMBOL}/day, for +${RESEARCH_PER_SCIENTIST} research/day here`
      }
      removeHint={`Let a ${AREA_LABELS[category].toLowerCase()} scientist go`}
      onAdd={() => dispatch((s) => hireScientist(s, category))}
      onRemove={() => dispatch((s) => dismissScientist(s, category))}
    />
  );
}

// The places there are to fill, as seats: a filled one per hire. Too many
// to draw and it's a number instead.
const MAX_SEATS_DRAWN = 24;

function Seats({ used, cap, label }: { used: number; cap: number; label: string }) {
  return (
    <span className="workforce-panel__seats" title={`${label}: ${used} of ${cap}`}>
      {cap <= MAX_SEATS_DRAWN &&
        Array.from({ length: cap }, (_, i) => <span key={i} className={`workforce-panel__seat ${i < used ? "is-filled" : ""}`} aria-hidden="true" />)}
      <span className="workforce-panel__seats-count">
        {used}/{cap}
      </span>
    </span>
  );
}

// What one hire costs and does, said once for the group.
function HireTerms({ hire, wage, children }: { hire: number; wage: number; children: ReactNode }) {
  return (
    <span className="workforce-panel__terms">
      <span title={`Costs ${hire} ${CURRENCY_SYMBOL} to hire, then ${wage} ${CURRENCY_SYMBOL} a day`}>
        <StatIcon type="treasury" size={15} />
        {hire} + {wage}/d
      </span>
      {children}
    </span>
  );
}

export function WorkforcePanel({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const salaries = Math.round(getDailySalaries(state.workforce, getModifiers(state).wageMultiplier));
  const scientistCap = getScientistCap(state.educationLevel);
  const policeCap = getPoliceCap(state.stats.population);
  const police = state.workforce.police;
  const scientists = getTotalScientists(state.workforce);

  return (
    <section className="panel workforce-panel">
      <div className="workforce-panel__header">
        <h2>Workforce</h2>
        <span className="workforce-panel__salaries" title={`Wages, paid out of the treasury every day`}>
          Wages
          <StatIcon type="treasury" size={16} />
          {salaries > 0 ? `−${salaries}` : 0}/d
        </span>
      </div>

      <div className="workforce-panel__group">
        <div className="workforce-panel__group-head">
          <span className="workforce-panel__group-title">
            <StatIcon type="research" size={18} />
            Scientists
          </span>
          <Seats used={scientists} cap={scientistCap} label="Scientists employed. Schools train more" />
          <HireTerms hire={SCIENTIST_HIRE_COST} wage={SCIENTIST_SALARY}>
            <span title={`Each moves research in its own area ${RESEARCH_PER_SCIENTIST} points a day`}>
              <StatIcon type="research" size={15} />+{RESEARCH_PER_SCIENTIST}/d each
            </span>
          </HireTerms>
        </div>
        {RESEARCH_CATEGORIES.map((category) => {
          const rate = getResearchRateBreakdown(state, category);
          const output = rate.scientists * rate.educationMultiplier;
          return (
            <div className={`workforce-panel__row ${state.workforce.scientists[category] > 0 ? "" : "is-empty"}`} key={category}>
              <StatIcon type={AREA_ICONS[category]} size={20} />
              <span className="workforce-panel__label">{AREA_LABELS[category]}</span>
              {output > 0 && (
                <span className="workforce-panel__effect" title={`${AREA_LABELS[category]} research a day from its scientists`}>
                  <StatIcon type="research" size={14} />+{output.toFixed(1)}/d
                </span>
              )}
              <ScientistStepper state={state} category={category} dispatch={dispatch} />
            </div>
          );
        })}
      </div>

      <div className="workforce-panel__group">
        <div className="workforce-panel__group-head">
          <span className="workforce-panel__group-title">
            <StatIcon type="police" size={18} />
            Police
          </span>
          <Seats used={police} cap={policeCap} label={`Officers employed: one for every ${POPULATION_PER_POLICE.toLocaleString()} people`} />
          <HireTerms hire={POLICE_HIRE_COST} wage={POLICE_SALARY}>
            <span title="Each officer adds stability every day, and makes buildings break down less often">
              <StatIcon type="stability" size={15} />+{POLICE_STABILITY_PER_OFFICER}/d each
            </span>
          </HireTerms>
        </div>
        <div className={`workforce-panel__row ${police > 0 ? "" : "is-empty"}`}>
          <StatIcon type="police" size={20} />
          <span className="workforce-panel__label">Constables</span>
          {police > 0 && (
            <>
              <span className="workforce-panel__effect" title="Stability a day from the police">
                <StatIcon type="stability" size={14} />+{getPoliceStabilityBonus(police).toFixed(2)}/d
              </span>
              <span className="workforce-panel__effect" title="Fewer buildings break down">
                <NavIcon type="economy" size={14} />−{Math.round(getPoliceBreakdownReduction(police) * 100)}% breakdowns
              </span>
            </>
          )}
          <StaffStepper
            count={police}
            canAdd={canHirePolice(state)}
            addHint={
              police >= policeCap
                ? "No more officers needed for this population"
                : `Hire an officer: ${POLICE_HIRE_COST} ${CURRENCY_SYMBOL}, then ${POLICE_SALARY} ${CURRENCY_SYMBOL}/day, for steadier stability and fewer breakdowns`
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
