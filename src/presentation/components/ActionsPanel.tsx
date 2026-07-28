// Build orders for the selected province. Every card is deliberately
// glyph-first: what it makes, what it costs, and how many you already have
// are all icons, chips, pips, and bars — the only prose left is the one-line
// tooltip behind each of them.
import "./ActionsPanel.css";
import type { ReactNode } from "react";
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
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ActionsPanelProps {
  state: GameState;
  selectedProvinceId: string;
  dispatch: (action: (state: GameState) => GameState) => void;
}

// 60% of the cost is due now, the rest is drained daily over the build (see
// createBuildAction.ts's own upfrontCost) — mirrored here so the schedule bar
// and the affordability check match what's actually charged.
const UPFRONT_SHARE = 0.6;

function upfront(value: number): number {
  return Math.round(value * UPFRONT_SHARE);
}

// Rounded to one decimal — most of these per-day rates are well under 1
// unit/day, and a whole number would show "0" for a cost that's very real.
function perDay(value: number, days: number): number {
  return Math.round((value / days) * 10) / 10;
}

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

function ClockIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={13} height={13}>
      <circle cx={0} cy={0} r={7.6} fill="none" stroke="currentColor" strokeWidth={1.4} />
      <path d="M0,-4.4 L0,0.4 L3.4,2.6" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={12} height={12}>
      <rect x={-4.5} y={-1} width={9} height={7.5} rx={1.3} fill="currentColor" />
      <path d="M-2.8,-1 L-2.8,-3.8 A2.8,2.8 0 0 1 2.8,-3.8 L2.8,-1" fill="none" stroke="currentColor" strokeWidth={1.7} />
    </svg>
  );
}

function ResourceGlyph({ type, size = 15 }: { type: ResourceType; size?: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size}>
      <ResourceIcon type={type} size={7.5} />
    </svg>
  );
}

// What a building actually produces, as a glyph and a rate. Processors
// (granary/cannery) show it as a conversion — grain in, food out — which is
// the whole point of them and took a full sentence to say before.
function Yield({ children, hint }: { children: ReactNode; hint: string }) {
  return (
    <span className="build-card__yield" title={hint}>
      {children}
    </span>
  );
}

// How many of this building already stand here, out of the cap — drawn as
// filled/empty pips so "room for more" is a shape, not a fraction to read.
function CapPips({ count, max }: { count: number; max: number }) {
  return (
    <span className="build-card__pips" title={`${count} of ${max} built in this province`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`build-card__pip ${i < count ? "is-filled" : ""}`} />
      ))}
    </span>
  );
}

interface BuildItem {
  type: ProjectType;
  name: string;
  cost: number;
  resourceCost: number;
  resourceType: ResourceType;
  resourceLabel: string;
  buildDays: number;
  yields: ReactNode;
  count: number;
  max: number;
  canBuild: boolean;
  onBuild: () => void;
  lockedReason?: string;
}

export function ActionsPanel({ state, selectedProvinceId, dispatch }: ActionsPanelProps) {
  const provinceName = getProvinceName(selectedProvinceId);

  const granaryUnlocked = isBuildingUnlocked(state.enactedResearchIds, "granary");
  const canneryUnlocked = isBuildingUnlocked(state.enactedResearchIds, "cannery");

  const buildItems: BuildItem[] = [
    {
      type: "farm",
      name: "Farm",
      cost: FARM_COST,
      resourceCost: FARM_WOOD_COST,
      resourceType: "wood",
      resourceLabel: "Wood",
      buildDays: FARM_BUILD_DAYS,
      yields: (
        <Yield hint={`Produces ${FOOD_PER_FARM.toLocaleString()} food per day`}>
          <StatIcon type="food" size={15} />+{FOOD_PER_FARM.toLocaleString()}/d
        </Yield>
      ),
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
      yields: (
        <>
          <Yield hint={`Produces ${INDUSTRY_PER_FACTORY} industry per day`}>
            <StatIcon type="industry" size={15} />+{INDUSTRY_PER_FACTORY}/d
          </Yield>
          <Yield
            hint={`Worth about ${INDUSTRY_PER_FACTORY * INCOME_PER_INDUSTRY} ${CURRENCY_SYMBOL}/day — pays for itself in roughly ${Math.round(
              FACTORY_COST / (INDUSTRY_PER_FACTORY * INCOME_PER_INDUSTRY),
            ).toLocaleString()} days`}
          >
            <StatIcon type="treasury" size={15} />+{INDUSTRY_PER_FACTORY * INCOME_PER_INDUSTRY}/d
          </Yield>
        </>
      ),
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
      resourceType: "ore",
      resourceLabel: "Ore",
      buildDays: ROAD_BUILD_DAYS,
      yields: (
        <Yield hint={`+${ROAD_EFFICIENCY_BONUS * 100}% income and construction speed nationwide, per road (stacks)`}>
          <StatIcon type="treasury" size={15} />+{ROAD_EFFICIENCY_BONUS * 100}% nationwide
        </Yield>
      ),
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
      yields: (
        <Yield hint="Raises your education level: more research points per day and better odds on a research vote">
          <StatIcon type="research" size={15} />+1 education
        </Yield>
      ),
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
      yields: (
        <Yield
          hint={`Processes up to ${GRAIN_PROCESSED_PER_GRANARY} Grain/day into ${(GRAIN_PROCESSED_PER_GRANARY * FOOD_PER_GRAIN).toLocaleString()} food/day, stock permitting`}
        >
          <ResourceGlyph type="grain" />
          {GRAIN_PROCESSED_PER_GRANARY}
          <span className="build-card__yield-arrow">→</span>
          <StatIcon type="food" size={15} />
          {(GRAIN_PROCESSED_PER_GRANARY * FOOD_PER_GRAIN).toLocaleString()}/d
        </Yield>
      ),
      count: countBuildingsInProvince(state, "granary", selectedProvinceId),
      max: buildGranary.maxPerProvince,
      canBuild: buildGranary.canBuild(state, selectedProvinceId),
      onBuild: () => dispatch((s) => buildGranary(s, selectedProvinceId)),
      lockedReason: granaryUnlocked ? undefined : getResearchNode("agriculture-grain-mills")?.name,
    },
    {
      type: "cannery",
      name: "Cannery",
      cost: CANNERY_COST,
      resourceCost: CANNERY_ORE_COST,
      resourceType: "ore",
      resourceLabel: "Ore",
      buildDays: CANNERY_BUILD_DAYS,
      yields: (
        <Yield
          hint={`Processes up to ${FISH_PROCESSED_PER_CANNERY} Fish/day into ${(FISH_PROCESSED_PER_CANNERY * FOOD_PER_FISH).toLocaleString()} food/day, stock permitting`}
        >
          <ResourceGlyph type="fish" />
          {FISH_PROCESSED_PER_CANNERY}
          <span className="build-card__yield-arrow">→</span>
          <StatIcon type="food" size={15} />
          {(FISH_PROCESSED_PER_CANNERY * FOOD_PER_FISH).toLocaleString()}/d
        </Yield>
      ),
      count: countBuildingsInProvince(state, "cannery", selectedProvinceId),
      max: buildCannery.maxPerProvince,
      canBuild: buildCannery.canBuild(state, selectedProvinceId),
      onBuild: () => dispatch((s) => buildCannery(s, selectedProvinceId)),
      lockedReason: canneryUnlocked ? undefined : getResearchNode("agriculture-cannery-works")?.name,
    },
  ];

  // What's stopping this build, as an icon and a shortfall rather than a
  // sentence. Only computed for unlocked cards, so it never competes with
  // lockedReason.
  function shortfall(item: BuildItem): { icon: StatIconType | null; resource: ResourceType | null; text: string } | null {
    if (item.canBuild) return null;
    if (item.count >= item.max) return { icon: null, resource: null, text: `No room here (${item.max} max)` };
    if (!canAfford(state.stats, upfront(item.cost))) {
      return { icon: "treasury", resource: null, text: `${Math.ceil(upfront(item.cost) - state.stats.treasury).toLocaleString()} short` };
    }
    if (!canAffordResource(state.resources, item.resourceType, upfront(item.resourceCost))) {
      return {
        icon: null,
        resource: item.resourceType,
        text: `${Math.ceil(upfront(item.resourceCost) - state.resources[item.resourceType])} short`,
      };
    }
    return null;
  }

  return (
    <section className="panel actions-panel">
      <h2>Build</h2>
      <p className="actions-panel__target" title="Click a province on the map to build somewhere else">
        <PinIcon />
        <strong>{provinceName}</strong>
      </p>

      <div className="actions-panel__group">
        {buildItems.map((item) => {
          const isLocked = Boolean(item.lockedReason);
          const missing = isLocked ? null : shortfall(item);
          const dailyCost = perDay(item.cost - upfront(item.cost), item.buildDays);
          const dailyResource = perDay(item.resourceCost - upfront(item.resourceCost), item.buildDays);

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
                  {!isLocked && <CapPips count={item.count} max={item.max} />}
                </div>

                {isLocked ? (
                  <p className="build-card__locked" title={`Unlocked by ${item.lockedReason} on the Research tab`}>
                    <LockIcon />
                    {item.lockedReason}
                  </p>
                ) : (
                  <>
                    <div className="build-card__yields">{item.yields}</div>

                    <div className="build-card__cost">
                      <CostChips>
                        <TreasuryChip amount={item.cost.toLocaleString()} />
                        <ResourceChip type={item.resourceType} amount={item.resourceCost} />
                      </CostChips>
                      <span
                        className="build-card__schedule"
                        title={`${UPFRONT_SHARE * 100}% due on order (${upfront(item.cost).toLocaleString()} ${CURRENCY_SYMBOL}, ${upfront(
                          item.resourceCost,
                        )} ${item.resourceLabel}); the rest drains at ${dailyCost} ${CURRENCY_SYMBOL} and ${dailyResource} ${item.resourceLabel} per day for ${
                          item.buildDays
                        } days`}
                      >
                        <span className="build-card__schedule-bar">
                          <span className="build-card__schedule-upfront" style={{ width: `${UPFRONT_SHARE * 100}%` }} />
                        </span>
                        <ClockIcon />
                        {item.buildDays}d
                      </span>
                    </div>

                    <button
                      className="build-card__button btn-primary"
                      disabled={!item.canBuild}
                      onClick={() => {
                        playConfirm();
                        item.onBuild();
                      }}
                    >
                      {missing ? (
                        <span className="build-card__missing">
                          {missing.icon && <StatIcon type={missing.icon} size={16} />}
                          {missing.resource && <ResourceGlyph type={missing.resource} size={16} />}
                          {missing.text}
                        </span>
                      ) : (
                        `Build ${item.name}`
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
