// The Army window: your regiments (raising them, standing them down, and
// where each stands or is marching), and the neighbours' armies beside
// them. Moving regiments happens on the map: tap a counter, then a province.
// The militia is not here: it lives with the police on the Unrest page.
import "./WorkforcePanel.css";
import "./ArmyPanel.css";
import type { CSSProperties } from "react";
import { disbandRegiment, getMarchRoute, getYourRegiments, haltRegiments, raiseRegiment, canRaiseRegiment } from "../../application/actions/armyActions";
import { CURRENCY_SYMBOL, POPULATION_PER_REGIMENT, REGIMENT_RAISE_COST, REGIMENT_SALARY, REGIMENT_TRAINING_DAYS } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getRegimentCap, regimentsOf, routeDays } from "../../domain/military/militaryRules";
import type { Regiment } from "../../domain/military/types";
import { getNation } from "../../domain/nations/nationRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { formatAmount } from "../formatNumber";
import { StatIcon } from "./StatIcon";
import { HireTerms, Seats, StaffStepper } from "./WorkforcePanel";

type Dispatch = (action: (state: GameState) => GameState) => void;

// Where a regiment is and what it's doing, in a few words.
function regimentStatus(state: GameState, r: Regiment): string {
  if (r.trainingDays > 0) return `At drill in ${getProvinceName(r.provinceId)}, ${r.trainingDays} days left`;
  if (!r.march) return `Ready in ${getProvinceName(r.provinceId)}`;
  const to = r.march.route[r.march.route.length - 1];
  const rest = r.march.route.length > 1 ? getMarchRoute(state, r.march.route[0], to) : [];
  return `Marching to ${getProvinceName(to)}, ${r.march.daysLeft + routeDays(rest ?? [])} days`;
}

export function ArmyPanel({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const yours = getYourRegiments(state);
  const cap = getRegimentCap(state.stats.population);
  // Standing one down takes the newest not on the march.
  const standDown = [...yours].reverse().find((r) => !r.march) ?? yours[yours.length - 1];
  const neighbours = Object.keys(state.neighbours);

  return (
    <section className="army-panel">
      <div className="politics-section-head">
        <h3 className="army-panel__subhead">Your regiments</h3>
        <Seats used={yours.length} cap={cap} label={`Regiments the country can keep: one for every ${formatAmount(POPULATION_PER_REGIMENT)} people`} />
      </div>
      <div className={`workforce-panel__row ${yours.length > 0 ? "" : "is-empty"}`}>
        <StatIcon type="regiment" size={20} />
        <span className="workforce-panel__label">Regiments</span>
        <HireTerms hire={REGIMENT_RAISE_COST} wage={REGIMENT_SALARY}>
          <span title="A new regiment drills in the capital before it can march">{REGIMENT_TRAINING_DAYS} days' drill</span>
        </HireTerms>
        <StaffStepper
          count={yours.length}
          canAdd={canRaiseRegiment(state)}
          addHint={
            yours.length >= cap
              ? `The country keeps one regiment for every ${formatAmount(POPULATION_PER_REGIMENT)} people`
              : `Raise a regiment: ${REGIMENT_RAISE_COST} ${CURRENCY_SYMBOL}, then ${REGIMENT_SALARY} ${CURRENCY_SYMBOL}/day. It drills in the capital for ${REGIMENT_TRAINING_DAYS} days.`
          }
          removeHint="Stand a regiment down: its pay stops"
          onAdd={() => dispatch(raiseRegiment)}
          onRemove={() => standDown && dispatch((s) => disbandRegiment(s, standDown.id))}
        />
      </div>

      {yours.length > 0 ? (
        <>
          <ul className="army-panel__list">
            {yours.map((r) => (
              <li key={r.id} className="army-panel__regiment">
                <span className="army-panel__status">{regimentStatus(state, r)}</span>
                {r.march && r.march.route.length > 1 && (
                  <button type="button" className="army-panel__halt" onClick={() => dispatch((s) => haltRegiments(s, [r.id]))} title={`Stop in ${getProvinceName(r.march.route[0])}, the next place on the way`}>
                    Halt
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="army-panel__how">To march, tap a regiment's counter on the map, then the province to send it to.</p>
        </>
      ) : (
        <p className="army-panel__how">Raise a regiment, and it appears on the map in the capital. Once it has drilled, tap its counter, then a province, to march it there.</p>
      )}

      <h3 className="army-panel__subhead">The neighbours' armies</h3>
      <ul className="army-panel__neighbours">
        {neighbours.map((nationId) => {
          const theirs = regimentsOf(state.regiments, nationId);
          const nation = getNation(nationId);
          return (
            <li key={nationId} className="army-panel__neighbour" style={{ "--nation-color": nation.color } as CSSProperties}>
              <span className="army-panel__crest" aria-hidden="true">
                {nation.name[0]}
              </span>
              <span className="army-panel__neighbour-name">{nation.name}</span>
              <span className="army-panel__neighbour-count" title="Regiments, counting those still at drill">
                <StatIcon type="regiment" size={16} />
                {theirs.length}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
