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
import { canAfford } from "../../domain/economy/economyRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { getResearchNode, isBuildingUnlocked } from "../../domain/research/researchRules";
import { canAffordResource } from "../../domain/resources/resourceRules";
import type { ResourceType } from "../../domain/resources/types";
import { playConfirm } from "../audio/sound";
import { BuildingIcon } from "./BuildingIcon";
import { CostChips, ResourceChip, TreasuryChip } from "./CostChips";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ActionsPanelProps {
  state: GameState;
  selectedProvinceId: string;
  dispatch: (action: (state: GameState) => GameState) => void;
}

// 60% of the cost is due now, the rest is drained daily over the build (see
// createBuildAction.ts's own upfrontCost) — mirrored here so the display
// matches what's actually charged, not a stale 50/50 assumption.
const UPFRONT_SHARE = 0.6;

function upfront(value: number): number {
  return Math.round(value * UPFRONT_SHARE);
}

// Rounded to one decimal — most of these per-day rates are well under 1
// unit/day (e.g. a 60-day farm's remaining wood share is a fraction/day),
// and rounding to a whole number would show "0" for a cost that's very much
// still real.
function perDay(value: number, days: number): number {
  return Math.round((value / days) * 10) / 10;
}

// A map-pin glyph standing in for the words "Building in" — the province
// name is the thing that changes; the pin makes the row scannable as
// "location: X" at a glance instead of needing the label read every time.
function PinIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={14} height={14}>
      <path
        d="M0,-7.5 C3.6,-7.5 6.2,-4.9 6.2,-1.5 C6.2,2.8 0,8 0,8 C0,8 -6.2,2.8 -6.2,-1.5 C-6.2,-4.9 -3.6,-7.5 0,-7.5 Z"
        fill="#c9a24a"
        stroke="#7a531f"
        strokeWidth={0.7}
      />
      <circle cx={0} cy={-1.5} r={2.3} fill="#241708" />
    </svg>
  );
}

export function ActionsPanel({ state, selectedProvinceId, dispatch }: ActionsPanelProps) {
  const provinceName = getProvinceName(selectedProvinceId);

  const granaryUnlocked = isBuildingUnlocked(state.enactedResearchIds, "granary");
  const canneryUnlocked = isBuildingUnlocked(state.enactedResearchIds, "cannery");

  const buildItems: Array<{
    type: ProjectType;
    name: string;
    cost: number;
    resourceCost: number;
    resourceType: ResourceType;
    resourceLabel: string;
    buildDays: number;
    description: string;
    benefitIcon: StatIconType;
    count: number;
    max: number;
    canBuild: boolean;
    onBuild: () => void;
    lockedReason?: string;
    paybackDays?: number;
  }> = [
    {
      type: "farm",
      name: "Farm",
      cost: FARM_COST,
      resourceCost: FARM_WOOD_COST,
      resourceType: "wood",
      resourceLabel: "Wood",
      buildDays: FARM_BUILD_DAYS,
      description: `Produces ${FOOD_PER_FARM.toLocaleString()} food/day.`,
      benefitIcon: "food",
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
      resourceType: "ore",
      resourceLabel: "Ore",
      buildDays: FACTORY_BUILD_DAYS,
      description: `Produces ${INDUSTRY_PER_FACTORY} industry/day (~${INDUSTRY_PER_FACTORY * INCOME_PER_INDUSTRY} ${CURRENCY_SYMBOL}/day in income).`,
      benefitIcon: "industry",
      count: countBuildingsInProvince(state, "factory", selectedProvinceId),
      max: buildFactory.maxPerProvince,
      canBuild: buildFactory.canBuild(state, selectedProvinceId),
      onBuild: () => dispatch((s) => buildFactory(s, selectedProvinceId)),
      // The only building with a direct Cr/day return — Farm/Granary/Cannery
      // produce food (not Cr) and Road is a %, not a fixed rate, so neither
      // gets a payback number here (a misleading estimate is worse than none).
      paybackDays: Math.round(FACTORY_COST / (INDUSTRY_PER_FACTORY * INCOME_PER_INDUSTRY)),
    },
    {
      type: "road",
      name: "Road",
      cost: ROAD_COST,
      resourceCost: ROAD_ORE_COST,
      resourceType: "ore",
      resourceLabel: "Ore",
      buildDays: ROAD_BUILD_DAYS,
      description: `+${ROAD_EFFICIENCY_BONUS * 100}% income & construction speed nationwide, per road (stacks).`,
      benefitIcon: "treasury",
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
      resourceType: "wood",
      resourceLabel: "Wood",
      buildDays: EDUCATION_BUILD_DAYS,
      description: "Raises your education level — improves research pass chance and unlocks the research tree faster.",
      benefitIcon: "research",
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
      resourceType: "wood",
      resourceLabel: "Wood",
      buildDays: GRANARY_BUILD_DAYS,
      description: `Processes up to ${GRAIN_PROCESSED_PER_GRANARY} Grain/day into ${(GRAIN_PROCESSED_PER_GRANARY * FOOD_PER_GRAIN).toLocaleString()} food/day, stock permitting.`,
      benefitIcon: "food",
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
      resourceType: "ore",
      resourceLabel: "Ore",
      buildDays: CANNERY_BUILD_DAYS,
      description: `Processes up to ${FISH_PROCESSED_PER_CANNERY} Fish/day into ${(FISH_PROCESSED_PER_CANNERY * FOOD_PER_FISH).toLocaleString()} food/day, stock permitting.`,
      benefitIcon: "food",
      count: countBuildingsInProvince(state, "cannery", selectedProvinceId),
      max: buildCannery.maxPerProvince,
      canBuild: buildCannery.canBuild(state, selectedProvinceId),
      onBuild: () => dispatch((s) => buildCannery(s, selectedProvinceId)),
      lockedReason: canneryUnlocked ? undefined : `Requires ${getResearchNode("agriculture-cannery-works")?.name} (Research tab).`,
    },
  ];

  // Why a card's button is disabled, when it isn't a research lock — only
  // computed for unlocked cards, so it never overrides/duplicates lockedReason.
  function getDisabledReason(item: (typeof buildItems)[number]): string | undefined {
    if (item.canBuild) return undefined;
    if (item.count >= item.max) return `At the cap for this province (${item.max}).`;
    if (!canAfford(state.stats, upfront(item.cost))) {
      const short = upfront(item.cost) - state.stats.treasury;
      return `Needs ${Math.ceil(short).toLocaleString()} more ${CURRENCY_SYMBOL}.`;
    }
    if (!canAffordResource(state.resources, item.resourceType, upfront(item.resourceCost))) {
      const short = upfront(item.resourceCost) - state.resources[item.resourceType];
      return `Needs ${Math.ceil(short)} more ${item.resourceLabel}.`;
    }
    return undefined;
  }

  return (
    <section className="panel actions-panel">
      <h2>Actions</h2>
      <p className="actions-panel__target">
        <PinIcon />
        Building in: <strong>{provinceName}</strong> <span className="actions-panel__hint">(click the map to change)</span>
      </p>

      <div className="actions-panel__group">
        <h3>Build</h3>
        {buildItems.map((item) => {
          const upfrontCost = upfront(item.cost);
          const upfrontResource = upfront(item.resourceCost);
          const laterCost = item.cost - upfrontCost;
          const laterResource = item.resourceCost - upfrontResource;
          const dailyCost = perDay(laterCost, item.buildDays);
          const dailyResource = perDay(laterResource, item.buildDays);

          const isLocked = Boolean(item.lockedReason);
          const disabledReason = isLocked ? undefined : getDisabledReason(item);

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
                    <div className="build-card__cost build-card__cost--total">
                      <span className="build-card__cost-tag">Total</span>
                      <CostChips>
                        <TreasuryChip amount={item.cost.toLocaleString()} />
                        <ResourceChip type={item.resourceType} amount={item.resourceCost} />
                      </CostChips>
                    </div>
                    <div className="build-card__cost">
                      <span className="build-card__cost-tag">Now</span>
                      <CostChips>
                        <TreasuryChip amount={upfrontCost} />
                        <ResourceChip type={item.resourceType} amount={upfrontResource} />
                      </CostChips>
                    </div>
                    <div className="build-card__cost build-card__cost--later">
                      <span className="build-card__cost-tag">Then</span>
                      <CostChips>
                        <TreasuryChip amount={dailyCost} suffix="/d" />
                        <ResourceChip type={item.resourceType} amount={dailyResource} suffix="/d" />
                      </CostChips>
                      <span className="build-card__cost-duration">for {item.buildDays}d</span>
                    </div>
                  </>
                )}
                <p className="build-card__description">
                  <span className="build-card__description-icon">
                    <StatIcon type={item.benefitIcon} size={13} />
                  </span>
                  {item.description}
                  {item.paybackDays !== undefined && ` ≈ pays for itself in ${item.paybackDays.toLocaleString()} days after completion.`}
                </p>
                {!isLocked && disabledReason && <p className="build-card__disabled-reason">{disabledReason}</p>}
                {!isLocked && (
                  <button
                    className="build-card__button btn-primary"
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
