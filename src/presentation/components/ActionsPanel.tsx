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
import type { ProjectType } from "../../domain/construction/types";
import type { GameState } from "../../domain/country/types";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { playConfirm } from "../audio/sound";
import { BuildingIcon } from "./BuildingIcon";

interface ActionsPanelProps {
  state: GameState;
  selectedProvinceId: string;
  dispatch: (action: (state: GameState) => GameState) => void;
}

export function ActionsPanel({ state, selectedProvinceId, dispatch }: ActionsPanelProps) {
  const provinceName = getProvinceName(selectedProvinceId);

  const buildItems: Array<{
    type: Exclude<ProjectType, "education" | "research">;
    name: string;
    cost: string;
    description: string;
    count: number;
    max: number;
    canBuild: boolean;
    onBuild: () => void;
  }> = [
    {
      type: "farm",
      name: "Farm",
      cost: `${FARM_COST} ${CURRENCY_SYMBOL} + ${FARM_WOOD_COST} Wood`,
      description: `Produces ${FOOD_PER_FARM.toLocaleString()} food/day.`,
      count: countBuildingsInProvince(state, "farm", selectedProvinceId),
      max: buildFarm.maxPerProvince,
      canBuild: buildFarm.canBuild(state, selectedProvinceId),
      onBuild: () => dispatch((s) => buildFarm(s, selectedProvinceId)),
    },
    {
      type: "factory",
      name: "Factory",
      cost: `${FACTORY_COST} ${CURRENCY_SYMBOL} + ${FACTORY_ORE_COST} Ore`,
      description: `Produces ${INDUSTRY_PER_FACTORY} industry/day (~${INDUSTRY_PER_FACTORY * INCOME_PER_INDUSTRY} ${CURRENCY_SYMBOL}/day in income).`,
      count: countBuildingsInProvince(state, "factory", selectedProvinceId),
      max: buildFactory.maxPerProvince,
      canBuild: buildFactory.canBuild(state, selectedProvinceId),
      onBuild: () => dispatch((s) => buildFactory(s, selectedProvinceId)),
    },
    {
      type: "road",
      name: "Road",
      cost: `${ROAD_COST} ${CURRENCY_SYMBOL} + ${ROAD_ORE_COST} Ore`,
      description: `+${ROAD_EFFICIENCY_BONUS * 100}% income & construction speed nationwide, per road (stacks).`,
      count: countBuildingsInProvince(state, "road", selectedProvinceId),
      max: buildRoad.maxPerProvince,
      canBuild: buildRoad.canBuild(state, selectedProvinceId),
      onBuild: () => dispatch((s) => buildRoad(s, selectedProvinceId)),
    },
  ];

  return (
    <section className="panel actions-panel">
      <h2>Actions</h2>
      <p className="actions-panel__target">
        Building in: <strong>{provinceName}</strong> <span className="actions-panel__hint">(click the map to change)</span>
      </p>

      <div className="actions-panel__group">
        <h3>Build</h3>
        {buildItems.map((item) => (
          <div className={`build-card ${!item.canBuild ? "is-disabled" : ""}`} key={item.type}>
            <div className="build-card__icon" aria-hidden="true">
              <svg viewBox="-12 -16 24 24">
                <BuildingIcon type={item.type} x={0} y={0} size={7} />
              </svg>
            </div>
            <div className="build-card__body">
              <div className="build-card__top">
                <span className="build-card__name">{item.name}</span>
                <span className="build-card__cap">
                  {item.count}/{item.max} here
                </span>
              </div>
              <div className="build-card__cost">{item.cost}</div>
              <p className="build-card__description">{item.description}</p>
              <button
                className="build-card__button"
                disabled={!item.canBuild}
                onClick={() => {
                  playConfirm();
                  item.onBuild();
                }}
              >
                Build {item.name}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
