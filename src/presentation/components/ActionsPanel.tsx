// Build orders for the selected province, as a grid of picture tiles. Each
// tile *is* the build button: the building's illustration, what it yields,
// and what it costs — all glyphs. Anything you're short on turns red right
// on its chip; the explanations live in hover tooltips, not on the card.
import "./ActionsPanel.css";
import type { CSSProperties, ReactNode } from "react";
import { buildCannery, buildEducation, buildFactory, buildFarm, buildGranary, buildRoad, countBuildingsInProvince } from "../../application/actions";
import type { BuildAction } from "../../application/actions/createBuildAction";
import {
  CANNERY_BUILD_DAYS,
  CANNERY_COST,
  CANNERY_ORE_COST,
  CURRENCY_SYMBOL,
  FARM_SEASON_MULTIPLIER,
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
import { getSeason, type Season } from "../../domain/country/calendar";
import type { GameState } from "../../domain/country/types";
import { isWorking } from "../../domain/maintenance/maintenanceRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { getResearchNode, isBuildingUnlocked } from "../../domain/research/researchRules";
import type { ResourceType } from "../../domain/resources/types";
import { playConfirm } from "../audio/sound";
import { formatCompact } from "../formatNumber";
import { BUILDING_COLORS, BuildingIcon } from "./BuildingIcon";
import { WrenchIcon } from "./RepairsPanel";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";

interface ActionsPanelProps {
  state: GameState;
  selectedProvinceId: string;
  dispatch: (action: (state: GameState) => GameState) => void;
}

// 60% of the cost is due now, the rest is drained daily over the build (see
// createBuildAction.ts's own upfrontCost) — mirrored here so the red
// "can't afford" chips match what's actually charged on order.
const UPFRONT_SHARE = 0.6;

function upfront(value: number): number {
  return Math.round(value * UPFRONT_SHARE);
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

function HourglassIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={12} height={12}>
      <path d="M-5,-7 L5,-7 L5,-5.5 L1.2,0 L5,5.5 L5,7 L-5,7 L-5,5.5 L-1.2,0 L-5,-5.5 Z" fill="currentColor" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={18} height={18}>
      <rect x={-4.5} y={-1} width={9} height={7.5} rx={1.3} fill="currentColor" />
      <path d="M-2.8,-1 L-2.8,-3.8 A2.8,2.8 0 0 1 2.8,-3.8 L2.8,-1" fill="none" stroke="currentColor" strokeWidth={1.7} />
    </svg>
  );
}

function ResourceGlyph({ type, size = 14 }: { type: ResourceType; size?: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size}>
      <ResourceIcon type={type} size={7.5} />
    </svg>
  );
}

// How many of this building already stand here, out of the cap — filled vs
// empty pips, so "room for more" is a shape, not a fraction to read.
function CapPips({ count, max }: { count: number; max: number }) {
  return (
    <span className="build-tile__pips" title={`${count} of ${max} built in this province`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`build-tile__pip ${i < count ? "is-filled" : ""}`} />
      ))}
    </span>
  );
}

// One cost on a tile, red when that's the thing you can't cover yet.
// The "!" matters as much as the red: a colour-blind player gets the same
// signal from the shape alone.
function CostPip({ icon, amount, short, hint }: { icon: ReactNode; amount: string; short: boolean; hint: string }) {
  return (
    <span className={`build-tile__cost ${short ? "is-short" : ""}`} title={short ? `Not enough — ${hint}` : hint}>
      {short && (
        <span className="build-tile__short-mark" aria-label="not enough">
          !
        </span>
      )}
      {icon}
      {amount}
    </span>
  );
}

interface BuildItem {
  type: ProjectType;
  name: string;
  action: BuildAction;
  cost: number;
  resourceCost: number;
  resourceType: ResourceType;
  buildDays: number;
  yields: ReactNode | ((season: Season) => ReactNode); // glyph + a short number — the full sentence is `hint`
  hint: string;
  unlockedBy?: string; // research node name, for buildings still locked behind the Research tree
}

const BUILD_ITEMS: BuildItem[] = [
  {
    type: "farm",
    name: "Farm",
    action: buildFarm,
    cost: FARM_COST,
    resourceCost: FARM_WOOD_COST,
    resourceType: "wood",
    buildDays: FARM_BUILD_DAYS,
    // Today's seasonal yield, not the nominal one — a farm built in winter
    // should say so.
    yields: (season) => (
      <>
        <StatIcon type="food" size={16} />+{formatCompact(FOOD_PER_FARM * FARM_SEASON_MULTIPLIER[season])}
        {season === "winter" && <span className="build-tile__season">❄</span>}
      </>
    ),
    hint: `Produces ${FOOD_PER_FARM.toLocaleString()} food per day — more at harvest, far less in winter`,
  },
  {
    type: "factory",
    name: "Factory",
    action: buildFactory,
    cost: FACTORY_COST,
    resourceCost: FACTORY_ORE_COST,
    resourceType: "ore",
    buildDays: FACTORY_BUILD_DAYS,
    yields: (
      <>
        <StatIcon type="industry" size={16} />+{INDUSTRY_PER_FACTORY}
      </>
    ),
    hint: `Produces ${INDUSTRY_PER_FACTORY} industry per day, worth about ${INDUSTRY_PER_FACTORY * INCOME_PER_INDUSTRY} ${CURRENCY_SYMBOL}/day`,
  },
  {
    type: "road",
    name: "Road",
    action: buildRoad,
    cost: ROAD_COST,
    resourceCost: ROAD_ORE_COST,
    resourceType: "ore",
    buildDays: ROAD_BUILD_DAYS,
    yields: (
      <>
        <StatIcon type="treasury" size={16} />+{ROAD_EFFICIENCY_BONUS * 100}%
      </>
    ),
    hint: `+${ROAD_EFFICIENCY_BONUS * 100}% income and construction speed nationwide, per road (stacks)`,
  },
  {
    type: "education",
    name: "School",
    action: buildEducation,
    cost: EDUCATION_COST,
    resourceCost: EDUCATION_WOOD_COST,
    resourceType: "wood",
    buildDays: EDUCATION_BUILD_DAYS,
    yields: (
      <>
        <StatIcon type="research" size={16} />+1
      </>
    ),
    hint: "+1 education level: more research points per day and better odds on research votes",
  },
  {
    type: "granary",
    name: "Granary",
    action: buildGranary,
    cost: GRANARY_COST,
    resourceCost: GRANARY_WOOD_COST,
    resourceType: "wood",
    buildDays: GRANARY_BUILD_DAYS,
    yields: (
      <>
        <ResourceGlyph type="grain" />
        <span className="build-tile__arrow">→</span>
        <StatIcon type="food" size={16} />+{formatCompact(GRAIN_PROCESSED_PER_GRANARY * FOOD_PER_GRAIN)}
      </>
    ),
    hint: `Turns up to ${GRAIN_PROCESSED_PER_GRANARY} Grain/day into ${(GRAIN_PROCESSED_PER_GRANARY * FOOD_PER_GRAIN).toLocaleString()} food/day, stock permitting`,
    unlockedBy: "agriculture-grain-mills",
  },
  {
    type: "cannery",
    name: "Cannery",
    action: buildCannery,
    cost: CANNERY_COST,
    resourceCost: CANNERY_ORE_COST,
    resourceType: "ore",
    buildDays: CANNERY_BUILD_DAYS,
    yields: (
      <>
        <ResourceGlyph type="fish" />
        <span className="build-tile__arrow">→</span>
        <StatIcon type="food" size={16} />+{formatCompact(FISH_PROCESSED_PER_CANNERY * FOOD_PER_FISH)}
      </>
    ),
    hint: `Turns up to ${FISH_PROCESSED_PER_CANNERY} Fish/day into ${(FISH_PROCESSED_PER_CANNERY * FOOD_PER_FISH).toLocaleString()} food/day, stock permitting`,
    unlockedBy: "agriculture-cannery-works",
  },
];

export function ActionsPanel({ state, selectedProvinceId, dispatch }: ActionsPanelProps) {
  const season = getSeason(state.date);
  return (
    <section className="panel actions-panel">
      <div className="actions-panel__header">
        <h2>Build</h2>
        <span className="actions-panel__target" title="Click a province on the map to build somewhere else">
          <PinIcon />
          {getProvinceName(selectedProvinceId)}
        </span>
      </div>

      <div className="actions-panel__grid">
        {BUILD_ITEMS.map((item) => {
          const isLocked = item.unlockedBy !== undefined && !isBuildingUnlocked(state.enactedResearchIds, item.type);
          const count = countBuildingsInProvince(state, item.type, selectedProvinceId);
          const max = item.action.maxPerProvince;
          const isFull = count >= max;
          const canBuild = !isLocked && item.action.canBuild(state, selectedProvinceId);
          const treasuryShort = state.stats.treasury < upfront(item.cost);
          const resourceShort = state.resources[item.resourceType] < upfront(item.resourceCost);
          const unlockName = item.unlockedBy ? getResearchNode(item.unlockedBy)?.name : undefined;
          const brokenHere = state.placedBuildings.filter((b) => b.type === item.type && b.provinceId === selectedProvinceId && !isWorking(b)).length;

          const title = isLocked
            ? `${item.name} — unlocked by ${unlockName ?? "research"} (Research tab)`
            : isFull
              ? `${item.name} — no room left in this province (${max} max)`
              : `Build ${item.name}: ${item.hint}. ${UPFRONT_SHARE * 100}% of the cost is due on order, the rest over ${item.buildDays} days.`;

          return (
            <button
              type="button"
              key={item.type}
              className={`build-tile ${isLocked ? "is-locked" : ""} ${isFull ? "is-full" : ""}`}
              style={{ "--tint": BUILDING_COLORS[item.type] } as CSSProperties}
              disabled={!canBuild}
              title={title}
              aria-label={title}
              onClick={() => {
                playConfirm();
                dispatch((s) => item.action(s, selectedProvinceId));
              }}
            >
              {!isLocked && <CapPips count={count} max={max} />}

              <span className="build-tile__art" aria-hidden="true">
                <svg viewBox="-12 -16 24 24">
                  <BuildingIcon type={item.type} x={0} y={0} size={7} />
                </svg>
                {brokenHere > 0 && (
                  <span className="build-tile__broken" title={`${brokenHere} broken here — repair from the Repairs panel`}>
                    <WrenchIcon size={11} />
                    {brokenHere}
                  </span>
                )}
                {isLocked && (
                  <span className="build-tile__lock">
                    <LockIcon />
                  </span>
                )}
              </span>

              <span className="build-tile__name">{item.name}</span>

              {isLocked ? (
                <span className="build-tile__unlock">
                  <StatIcon type="research" size={16} />
                  {unlockName}
                </span>
              ) : (
                <>
                  <span className="build-tile__yield">{typeof item.yields === "function" ? item.yields(season) : item.yields}</span>
                  <span className="build-tile__costs">
                    <CostPip
                      icon={<StatIcon type="treasury" size={14} />}
                      amount={formatCompact(item.cost)}
                      short={treasuryShort}
                      hint={`${item.cost.toLocaleString()} ${CURRENCY_SYMBOL} (${upfront(item.cost).toLocaleString()} up front)`}
                    />
                    <CostPip
                      icon={<ResourceGlyph type={item.resourceType} />}
                      amount={String(item.resourceCost)}
                      short={resourceShort}
                      hint={`${item.resourceCost} ${item.resourceType} (${upfront(item.resourceCost)} up front)`}
                    />
                    <span className="build-tile__cost build-tile__cost--days" title={`${item.buildDays} days to build`}>
                      <HourglassIcon />
                      {item.buildDays}d
                    </span>
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
