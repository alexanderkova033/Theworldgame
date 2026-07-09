// Development, Military, and Taxes actions are temporarily removed from the
// UI while the core build/economy/food loop is being nailed down — the
// underlying domain/application code for them still exists (see
// application/actions/), so bringing them back later is just re-adding a
// couple of button groups here.
import "./ActionsPanel.css";
import { buildFactory, buildFarm, buildRoad, countBuildingsInProvince } from "../../application/actions";
import {
  CURRENCY_SYMBOL,
  FACTORY_COST,
  FACTORY_ORE_COST,
  FARM_COST,
  FARM_WOOD_COST,
  FOOD_PER_FARM,
  INCOME_PER_INDUSTRY,
  INDUSTRY_PER_FACTORY,
  ROAD_COST,
  ROAD_EFFICIENCY_BONUS,
  ROAD_ORE_COST,
} from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getProvinceName } from "../../domain/provinces/provinceRules";

interface ActionsPanelProps {
  state: GameState;
  selectedProvinceId: string;
  dispatch: (action: (state: GameState) => GameState) => void;
}

export function ActionsPanel({ state, selectedProvinceId, dispatch }: ActionsPanelProps) {
  const provinceName = getProvinceName(selectedProvinceId);
  const farmCount = countBuildingsInProvince(state, "farm", selectedProvinceId);
  const factoryCount = countBuildingsInProvince(state, "factory", selectedProvinceId);
  const roadCount = countBuildingsInProvince(state, "road", selectedProvinceId);

  return (
    <section className="panel actions-panel">
      <h2>Actions</h2>
      <p className="actions-panel__target">
        Building in: <strong>{provinceName}</strong> <span className="actions-panel__hint">(click the map to change)</span>
      </p>

      <div className="actions-panel__group">
        <h3>Build</h3>
        <button disabled={!buildFarm.canBuild(state, selectedProvinceId)} onClick={() => dispatch((s) => buildFarm(s, selectedProvinceId))}>
          Build Farm ({FARM_COST} {CURRENCY_SYMBOL} + {FARM_WOOD_COST} Wood)
          <span className="actions-panel__cap">
            {farmCount}/{buildFarm.maxPerProvince} here
          </span>
        </button>
        <p className="actions-panel__description">Produces {FOOD_PER_FARM.toLocaleString()} food/day.</p>

        <button
          disabled={!buildFactory.canBuild(state, selectedProvinceId)}
          onClick={() => dispatch((s) => buildFactory(s, selectedProvinceId))}
        >
          Build Factory ({FACTORY_COST} {CURRENCY_SYMBOL} + {FACTORY_ORE_COST} Ore)
          <span className="actions-panel__cap">
            {factoryCount}/{buildFactory.maxPerProvince} here
          </span>
        </button>
        <p className="actions-panel__description">
          Produces {INDUSTRY_PER_FACTORY} industry/day (~{INDUSTRY_PER_FACTORY * INCOME_PER_INDUSTRY} {CURRENCY_SYMBOL}/day in income).
        </p>

        <button disabled={!buildRoad.canBuild(state, selectedProvinceId)} onClick={() => dispatch((s) => buildRoad(s, selectedProvinceId))}>
          Build Road ({ROAD_COST} {CURRENCY_SYMBOL} + {ROAD_ORE_COST} Ore)
          <span className="actions-panel__cap">
            {roadCount}/{buildRoad.maxPerProvince} here
          </span>
        </button>
        <p className="actions-panel__description">
          +{ROAD_EFFICIENCY_BONUS * 100}% income &amp; construction speed nationwide, per road (stacks).
        </p>
      </div>
    </section>
  );
}
