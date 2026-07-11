// Military and Taxes actions are temporarily removed from the UI while the
// core build/economy/food loop is being nailed down — the underlying
// domain/application code for them still exists (see application/actions/),
// so bringing them back later is just re-adding a couple of button groups
// here.
import "./ActionsPanel.css";
import { buildCannery, buildEducation, buildFactory, buildFarm, buildGranary, buildRoad, countBuildingsInProvince } from "../../application/actions";
import {
  CANNERY_BUILD_DAYS,
  CANNERY_COST,
  CANNERY_ORE_COST,
  CURRENCY_SYMBOL,
  EDUCATION_BUILD_DAYS,
  EDUCATION_COST,
  EDUCATION_WOOD_COST,
  FACTORY_BUILD_DAYS,
  FACTORY_COST,
  FACTORY_ORE_COST,
  FARM_BUILD_DAYS,
  FARM_COST,
  FARM_WOOD_COST,
  FISH_PROCESSED_PER_CANNERY,
  FOOD_PER_FARM,
  FOOD_PER_FISH,
  FOOD_PER_GRAIN,
  GRAIN_PROCESSED_PER_GRANARY,
  GRANARY_BUILD_DAYS,
  GRANARY_COST,
  GRANARY_WOOD_COST,
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
import { getResearchNode, isBuildingUnlocked } from "../../domain/research/researchRules";
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

// Rounded to one decimal — most of these per-day rates are well under 1
// unit/day (e.g. a 60-day farm's remaining 7 wood is 0.1/day), and rounding
// to a whole number would show "0" for a cost that's very much still real.
function perDay(value: number, days: number): number {
  return Math.round((value / days) * 10) / 10;
}

export function ActionsPanel({ state, selectedProvinceId, dispatch }: ActionsPanelProps) {
  const provinceName = getProvinceName(selectedProvinceId);

  const granaryUnlocked = isBuildingUnlocked(state.enactedResearchIds, "granary");
  const canneryUnlocked = isBuildingUnlocked(state.enactedResearchIds, "cannery");

  const buildItems: Array<{
    type: Exclude<ProjectType, "research">;
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
    lockedReason?: string;
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
    {
      type: "education",
      name: "School",
      cost: EDUCATION_COST,
      resourceCost: EDUCATION_WOOD_COST,
      resourceLabel: "Wood",
      buildDays: EDUCATION_BUILD_DAYS,
      description: "Raises your education level — improves research pass chance and unlocks the research tree faster.",
      count: countBuildingsInProvince(state, "education", selectedProvinceId),
      max: buildEducation.maxPerProvince,
      canBuild: buildEducation.canBuild(state, selectedProvinceId),
      onBuild: () => dispatch((s) => buildEducation(s, selectedProvinceId)),
    },
    {
      type: "granary",
      name: "Granary",
      cost: GRANARY_COST,
      resourceCost: GRANARY_WOOD_COST,
      resourceLabel: "Wood",
      buildDays: GRANARY_BUILD_DAYS,
      description: `Processes up to ${GRAIN_PROCESSED_PER_GRANARY} Grain/day into ${(GRAIN_PROCESSED_PER_GRANARY * FOOD_PER_GRAIN).toLocaleString()} food/day, stock permitting.`,
      count: countBuildingsInProvince(state, "granary", selectedProvinceId),
      max: buildGranary.maxPerProvince,
      canBuild: buildGranary.canBuild(state, selectedProvinceId),
      onBuild: () => dispatch((s) => buildGranary(s, selectedProvinceId)),
      lockedReason: granaryUnlocked ? undefined : `Requires ${getResearchNode("agriculture-grain-mills")?.name} (Research tab).`,
    },
    {
      type: "cannery",
      name: "Cannery",
      cost: CANNERY_COST,
      resourceCost: CANNERY_ORE_COST,
      resourceLabel: "Ore",
      buildDays: CANNERY_BUILD_DAYS,
      description: `Processes up to ${FISH_PROCESSED_PER_CANNERY} Fish/day into ${(FISH_PROCESSED_PER_CANNERY * FOOD_PER_FISH).toLocaleString()} food/day, stock permitting.`,
      count: countBuildingsInProvince(state, "cannery", selectedProvinceId),
      max: buildCannery.maxPerProvince,
      canBuild: buildCannery.canBuild(state, selectedProvinceId),
      onBuild: () => dispatch((s) => buildCannery(s, selectedProvinceId)),
      lockedReason: canneryUnlocked ? undefined : `Requires ${getResearchNode("agriculture-cannery-works")?.name} (Research tab).`,
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
          const dailyCost = perDay(laterCost, item.buildDays);
          const dailyResource = perDay(laterResource, item.buildDays);

          const isLocked = Boolean(item.lockedReason);

          return (
            <div className={`build-card ${!item.canBuild ? "is-disabled" : ""} ${isLocked ? "is-locked" : ""}`} key={item.type}>
              <div className="build-card__icon" aria-hidden="true">
                <svg viewBox="-12 -16 24 24">
                  <BuildingIcon type={item.type} x={0} y={0} size={7} />
                </svg>
              </div>
              <div className="build-card__body">
                <div className="build-card__top">
                  <span className="build-card__name">{item.name}</span>
                  {!isLocked && (
                    <span className="build-card__cap">
                      {item.count}/{item.max} here
                    </span>
                  )}
                </div>
                {isLocked ? (
                  <p className="build-card__locked">{item.lockedReason}</p>
                ) : (
                  <>
                    <div className="build-card__cost">
                      <span className="build-card__cost-tag">Now</span>
                      {upfrontCost} {CURRENCY_SYMBOL} + {upfrontResource} {item.resourceLabel}
                    </div>
                    <div className="build-card__cost build-card__cost--later">
                      <span className="build-card__cost-tag">Then</span>
                      {dailyCost} {CURRENCY_SYMBOL}/day + {dailyResource} {item.resourceLabel}/day, for {item.buildDays} days
                    </div>
                  </>
                )}
                <p className="build-card__description">{item.description}</p>
                {!isLocked && (
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
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
