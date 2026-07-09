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
  CURRENCY_SYMBOL,
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
import { getProvinceName } from "../../domain/provinces/provinceRules";

interface ActionsPanelProps {
  state: GameState;
  selectedProvinceId: string;
  dispatch: (action: (state: GameState) => GameState) => void;
}

export function ActionsPanel({ state, selectedProvinceId, dispatch }: ActionsPanelProps) {
  const recruitCost = getRecruitmentCost();
  const provinceName = getProvinceName(selectedProvinceId);

  return (
    <section className="panel actions-panel">
      <h2>Actions</h2>
      <p className="actions-panel__target">
        Building in: <strong>{provinceName}</strong> <span className="actions-panel__hint">(click the map to change)</span>
      </p>

      <div className="actions-panel__group">
        <h3>Build</h3>
        <button
          disabled={!canAfford(state.stats, FARM_COST)}
          onClick={() => dispatch((s) => buildFarm(s, selectedProvinceId))}
        >
          Build Farm ({FARM_COST} {CURRENCY_SYMBOL})
        </button>
        <button
          disabled={!canAfford(state.stats, FACTORY_COST)}
          onClick={() => dispatch((s) => buildFactory(s, selectedProvinceId))}
        >
          Build Factory ({FACTORY_COST} {CURRENCY_SYMBOL})
        </button>
        <button
          disabled={!canAfford(state.stats, ROAD_COST)}
          onClick={() => dispatch((s) => buildRoad(s, selectedProvinceId))}
        >
          Build Road ({ROAD_COST} {CURRENCY_SYMBOL})
        </button>
      </div>

      <div className="actions-panel__group">
        <h3>Development</h3>
        <button
          disabled={!canAfford(state.stats, EDUCATION_COST)}
          onClick={() => dispatch((s) => investEducation(s, selectedProvinceId))}
        >
          Invest in Education ({EDUCATION_COST} {CURRENCY_SYMBOL})
        </button>
        <button
          disabled={!canStartResearch(state)}
          onClick={() => dispatch((s) => startResearch(s, selectedProvinceId))}
        >
          Start Research ({RESEARCH_PROJECT_COST} {CURRENCY_SYMBOL})
        </button>
      </div>

      <div className="actions-panel__group">
        <h3>Military</h3>
        <button disabled={!canAfford(state.stats, recruitCost)} onClick={() => dispatch(recruitSoldiers)}>
          Recruit Soldiers ({recruitCost} {CURRENCY_SYMBOL})
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
