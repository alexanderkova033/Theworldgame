import {
  buildFactory,
  buildFarm,
  buildRoad,
  canStartResearch,
  investEducation,
  lowerTaxes,
  raiseTaxes,
  recruitSoldiers,
  startResearch,
} from "../../application/actions";
import { canAfford } from "../../domain/economy/economyRules";
import {
  EDUCATION_COST,
  FACTORY_COST,
  FARM_COST,
  MAX_TAX_RATE,
  MIN_TAX_RATE,
  RESEARCH_PROJECT_COST,
  ROAD_COST,
} from "../../domain/constants";
import { getRecruitmentCost } from "../../domain/army/armyRules";
import type { GameState } from "../../domain/country/types";

interface ActionsPanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
}

export function ActionsPanel({ state, dispatch }: ActionsPanelProps) {
  const recruitCost = getRecruitmentCost();

  return (
    <section className="panel actions-panel">
      <h2>Actions</h2>

      <div className="actions-panel__group">
        <h3>Build</h3>
        <button disabled={!canAfford(state.stats, FARM_COST)} onClick={() => dispatch(buildFarm)}>
          Build Farm (${FARM_COST})
        </button>
        <button disabled={!canAfford(state.stats, FACTORY_COST)} onClick={() => dispatch(buildFactory)}>
          Build Factory (${FACTORY_COST})
        </button>
        <button disabled={!canAfford(state.stats, ROAD_COST)} onClick={() => dispatch(buildRoad)}>
          Build Road (${ROAD_COST})
        </button>
      </div>

      <div className="actions-panel__group">
        <h3>Development</h3>
        <button disabled={!canAfford(state.stats, EDUCATION_COST)} onClick={() => dispatch(investEducation)}>
          Invest in Education (${EDUCATION_COST})
        </button>
        <button disabled={!canStartResearch(state)} onClick={() => dispatch(startResearch)}>
          Start Research (${RESEARCH_PROJECT_COST})
        </button>
      </div>

      <div className="actions-panel__group">
        <h3>Military</h3>
        <button disabled={!canAfford(state.stats, recruitCost)} onClick={() => dispatch(recruitSoldiers)}>
          Recruit Soldiers (${recruitCost})
        </button>
      </div>

      <div className="actions-panel__group">
        <h3>Taxes</h3>
        <button disabled={state.taxRate <= MIN_TAX_RATE} onClick={() => dispatch(lowerTaxes)}>
          Lower Taxes
        </button>
        <button disabled={state.taxRate >= MAX_TAX_RATE} onClick={() => dispatch(raiseTaxes)}>
          Raise Taxes
        </button>
      </div>
    </section>
  );
}
