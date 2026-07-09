// Development, Military, and Taxes actions are temporarily removed from the
// UI while the core build/economy/food loop is being nailed down — the
// underlying domain/application code for them still exists (see
// application/actions/), so bringing them back later is just re-adding a
// couple of button groups here.
import { buildFactory, buildFarm, buildRoad } from "../../application/actions";
import { canAfford } from "../../domain/economy/economyRules";
import {
  CURRENCY_SYMBOL,
  FACTORY_COST,
  FACTORY_ORE_COST,
  FARM_COST,
  FARM_WOOD_COST,
  ROAD_COST,
  ROAD_ORE_COST,
} from "../../domain/constants";
import { canAffordResource } from "../../domain/resources/resourceRules";
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
          disabled={!canAfford(state.stats, FARM_COST) || !canAffordResource(state.resources, "wood", FARM_WOOD_COST)}
          onClick={() => dispatch((s) => buildFarm(s, selectedProvinceId))}
        >
          Build Farm ({FARM_COST} {CURRENCY_SYMBOL} + {FARM_WOOD_COST} Wood)
        </button>
        <button
          disabled={
            !canAfford(state.stats, FACTORY_COST) || !canAffordResource(state.resources, "ore", FACTORY_ORE_COST)
          }
          onClick={() => dispatch((s) => buildFactory(s, selectedProvinceId))}
        >
          Build Factory ({FACTORY_COST} {CURRENCY_SYMBOL} + {FACTORY_ORE_COST} Ore)
        </button>
        <button
          disabled={!canAfford(state.stats, ROAD_COST) || !canAffordResource(state.resources, "ore", ROAD_ORE_COST)}
          onClick={() => dispatch((s) => buildRoad(s, selectedProvinceId))}
        >
          Build Road ({ROAD_COST} {CURRENCY_SYMBOL} + {ROAD_ORE_COST} Ore)
        </button>
      </div>
    </section>
  );
}
