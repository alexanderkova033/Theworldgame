// Hired staff: the scientist stepper used in each Research area, and the
// police shown on the Unrest page. Each group heads with its places as
// seats (filled per hire) and what one hire costs and does.
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
import type { ResearchCategory } from "../../domain/research/types";
import {
  getPoliceBreakdownReduction,
  getPoliceCap,
  getPoliceStabilityBonus,
  getScientistCap,
  getTotalScientists,
} from "../../domain/workforce/workforceRules";
import { playCoins } from "../audio/sound";
import { AREA_LABELS } from "../researchAreas";
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

// The police, shown on the Unrest page: they add stability every day and
// make buildings break down less often. One officer per so many people.
export function PoliceForce({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const policeCap = getPoliceCap(state.stats.population);
  const police = state.workforce.police;

  return (
    <div className="police-force">
      <div className="politics-section-head">
        <h3 className="politics-subhead">Police</h3>
        <Seats used={police} cap={policeCap} label={`Officers employed: one for every ${POPULATION_PER_POLICE.toLocaleString()} people`} />
      </div>
      <div className={`workforce-panel__row ${police > 0 ? "" : "is-empty"}`}>
        <StatIcon type="police" size={20} />
        <span className="workforce-panel__label">Officers</span>
        <HireTerms hire={POLICE_HIRE_COST} wage={POLICE_SALARY}>
          <span title={`Stability a day from each officer. Now: +${getPoliceStabilityBonus(police).toFixed(2)}/d`}>
            <StatIcon type="stability" size={15} />+{POLICE_STABILITY_PER_OFFICER}/d each
          </span>
          {police > 0 && <span title="Fewer buildings break down">−{Math.round(getPoliceBreakdownReduction(police) * 100)}% breakdowns</span>}
        </HireTerms>
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
  );
}
