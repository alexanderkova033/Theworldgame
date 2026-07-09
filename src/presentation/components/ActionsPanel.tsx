// Development, Military, and Taxes actions are temporarily removed from the
// UI while the core build/economy/food loop is being nailed down — the
// underlying domain/application code for them still exists (see
// application/actions/), so bringing them back later is just re-adding a
// couple of button groups here.
import { buildFactory, buildFarm, buildRoad } from "../../application/actions";
import { canAfford } from "../../domain/economy/economyRules";
import { CURRENCY_SYMBOL, FACTORY_COST, FARM_COST, ROAD_COST } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getProvinceName } from "../../domain/provinces/provinceRules";

interface ActionsPanelProps {
  state: GameState;
  selectedProvinceId: string;
  dispatch: (action: (state: GameState) => GameState) => void;
}

export function ActionsPanel({ state, selectedProvinceId, dispatch }: ActionsPanelProps) {
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
    </section>
  );
}
