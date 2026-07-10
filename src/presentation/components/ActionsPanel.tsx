// Development, Military, and Taxes actions are temporarily removed from the
// UI while the core build/economy/food loop is being nailed down — the
// underlying domain/application code for them still exists (see
// application/actions/), so bringing them back later is just re-adding a
// couple of button groups here.
import "./ActionsPanel.css";
import { buildFactory, buildFarm, buildRoad, countBuildingsInProvince } from "../../application/actions";
import {
  CURRENCY_SYMBOL,
  FACTORY_BUILD_DAYS,
  FACTORY_COST,
  FACTORY_ORE_COST,
  FARM_BUILD_DAYS,
  FARM_COST,
  FARM_WOOD_COST,
  FOOD_PER_FARM,
  INCOME_PER_INDUSTRY,
  INDUSTRY_PER_FACTORY,
  ROAD_BUILD_DAYS,
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

// Half the cost is due now, half is drained daily over the build (see
// createBuildAction.ts) — split the display to match instead of quoting one
// combined number that isn't actually what gets charged up front.
function half(value: number): number {
  return Math.round(value / 2);
}

export function ActionsPanel({ state, selectedProvinceId, dispatch }: ActionsPanelProps) {
  const provinceName = getProvinceName(selectedProvinceId);

  const buildItems: Array<{
    type: Exclude<ProjectType, "education" | "research">;
    name: string;
    cost: number;
    resourceCost: number;
    resourceLabel: string;
    buildDays: number;
    description: string;
    count: number;
    max: number;
    canBuild: boolean;
    onBuild: () => void;
  }> = [
    {
      type: "farm",
      name: "Farm",
      cost: FARM_COST,
      resourceCost: FARM_WOOD_COST,
      resourceLabel: "Wood",
      buildDays: FARM_BUILD_DAYS,
      description: `Produces ${FOOD_PER_FARM.toLocaleString()} food/day.`,
      count: countBuildingsInProvince(state, "farm", selectedProvinceId),
      max: buildFarm.maxPerProvince,
      canBuild: buildFarm.canBuild(state, selectedProvinceId),
      onBuild: () => dispatch((s) => buildFarm(s, selectedProvinceId)),
    },
    {
      type: "factory",
      name: "Factory",
      cost: FACTORY_COST,
      resourceCost: FACTORY_ORE_COST,
      resourceLabel: "Ore",
      buildDays: FACTORY_BUILD_DAYS,
      description: `Produces ${INDUSTRY_PER_FACTORY} industry/day (~${INDUSTRY_PER_FACTORY * INCOME_PER_INDUSTRY} ${CURRENCY_SYMBOL}/day in income).`,
      count: countBuildingsInProvince(state, "factory", selectedProvinceId),
      max: buildFactory.maxPerProvince,
      canBuild: buildFactory.canBuild(state, selectedProvinceId),
      onBuild: () => dispatch((s) => buildFactory(s, selectedProvinceId)),
    },
    {
      type: "road",
      name: "Road",
      cost: ROAD_COST,
      resourceCost: ROAD_ORE_COST,
      resourceLabel: "Ore",
      buildDays: ROAD_BUILD_DAYS,
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
        {buildItems.map((item) => {
          const upfrontCost = half(item.cost);
          const upfrontResource = half(item.resourceCost);
          const laterCost = item.cost - upfrontCost;
          const laterResource = item.resourceCost - upfrontResource;

          return (
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
                <div className="build-card__cost">
                  {upfrontCost} {CURRENCY_SYMBOL} + {upfrontResource} {item.resourceLabel}
                  <span className="build-card__cost-tag">now</span>
                </div>
                <div className="build-card__cost build-card__cost--later">
                  +{laterCost} {CURRENCY_SYMBOL} + {laterResource} {item.resourceLabel}
                  <span className="build-card__cost-tag">over {item.buildDays}d</span>
                </div>
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
          );
        })}
      </div>
    </section>
  );
}
