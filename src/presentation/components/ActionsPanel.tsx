// Build orders for one kind of building (the rail in BuildPanel picks which):
// pick the province at the top or on the map, then each building is a row
// with its picture, what it gives, pips for how many stand here, and its
// costs in green (enough), amber (enough to start) or red (not enough). What
// it does in a sentence is in its name's tip; when it can't be built, the
// row says exactly why.
import "./ActionsPanel.css";
import { getModifiers } from "../../domain/policy/policyRules";
import type { ReactNode } from "react";
import { getProvinceStatus, type ProvinceOverview } from "../../application/getProvinceOverview";
import { buildCannery, buildEducation, buildFactory, buildFarm, buildGranary, buildHarbour, buildHousing, buildRoad, buyAndBuild, countBuildingsInProvince, planBuyAndBuild } from "../../application/actions";
import { getBuildCostIn, type BuildAction } from "../../application/actions/createBuildAction";
import { describeWait, getDaysToSave } from "../../application/getDaysToSave";
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
  HARBOUR_BUILD_DAYS,
  HARBOUR_COST,
  HARBOUR_WOOD_COST,
  HEATING_FUEL_PER_HOME,
  HOUSING_BUILD_DAYS,
  HOUSING_COST,
  HOUSING_WOOD_COST,
  PEOPLE_PER_HOME,
  INCOME_PER_INDUSTRY,
  INDUSTRY_PER_FACTORY,
  ROAD_BUILD_DAYS,
  ROAD_COST,
  ROAD_EFFICIENCY_BONUS,
  ROAD_ORE_COST,
  SUPPLY_FEE_PER_DAY,
} from "../../domain/constants";
import type { ProjectType } from "../../domain/construction/types";
import { getSeason, type Season } from "../../domain/country/calendar";
import type { GameState } from "../../domain/country/types";
import { produceFood, type FoodModifiers } from "../../domain/food/foodRules";
import { getJobsPerBuilding, type JobBuilding } from "../../domain/labour/labourRules";
import { isWorking } from "../../domain/maintenance/maintenanceRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { getResearchNode, isBuildingUnlocked } from "../../domain/research/researchRules";
import type { ResourceType } from "../../domain/resources/types";
import { playBuild } from "../audio/sound";
import { formatAmount } from "../formatNumber";
import { BuildingIcon } from "./BuildingIcon";
import { WrenchIcon } from "./RepairsPanel";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";
import { BuildingGlyph, LockIcon } from "./CauseIcon";
import { chapterFor, isFeatureOpen } from "../../domain/chapters/chapterData";
import { BUILD_GROUPS, type BuildGroup } from "../buildGroups";

interface ActionsPanelProps {
  state: GameState;
  group: BuildGroup;
  selectedProvinceId: string;
  dispatch: (action: (state: GameState) => GameState) => void;
  provinces: ProvinceOverview[];
  onSelectProvince: (provinceId: string) => void;
  netPerDay: number; // the treasury's daily balance, for how long a shortfall takes to save
}

// 60% of the cost is due now, the rest is drained daily over the build (see
// createBuildAction.ts's own upfrontCost) — mirrored here so the red
// "can't afford" chips match what's actually charged on order.
const UPFRONT_SHARE = 0.6;

function upfront(value: number): number {
  return Math.round(value * UPFRONT_SHARE);
}

function HourglassIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={12} height={12}>
      <path d="M-5,-7 L5,-7 L5,-5.5 L1.2,0 L5,5.5 L5,7 L-5,7 L-5,5.5 L-1.2,0 L-5,-5.5 Z" fill="currentColor" />
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


interface BuildItem {
  type: ProjectType;
  group: BuildGroup;
  summary: string; // what it's for, in a few plain words — always on screen
  name: string;
  action: BuildAction;
  cost: number;
  resourceCost: number;
  resourceType: ResourceType;
  buildDays: number;
  yields: ReactNode | ((season: Season, mods: FoodModifiers) => ReactNode); // glyph + a short number; the full sentence is `hint`
  hint: string;
  unlockedBy?: string; // research node name, for buildings still locked behind the Research tree
}

const BUILD_ITEMS: BuildItem[] = [
  {
    type: "housing",
    group: "people",
    summary: "Homes for your people. Burns coal or wood in winter.",
    name: "Homes",
    action: buildHousing,
    cost: HOUSING_COST,
    resourceCost: HOUSING_WOOD_COST,
    resourceType: "wood",
    buildDays: HOUSING_BUILD_DAYS,
    yields: (
      <>
        <StatIcon type="population" size={16} />+{formatAmount(PEOPLE_PER_HOME)}
      </>
    ),
    hint: `Houses ${formatAmount(PEOPLE_PER_HOME)} people (more with Homes research). Burns ${HEATING_FUEL_PER_HOME} coal (or wood) a day in winter`,
  },
  {
    type: "farm",
    group: "food",
    summary: "Grows food: most at harvest, little in winter.",
    name: "Farm",
    action: buildFarm,
    cost: FARM_COST,
    resourceCost: FARM_WOOD_COST,
    resourceType: "wood",
    buildDays: FARM_BUILD_DAYS,
    // Today's seasonal yield, not the nominal one — a farm built in winter
    // should say so.
    yields: (season, mods) => (
      <>
        <StatIcon type="food" size={16} />+{formatAmount(produceFood(1, season, mods))}
        {season === "winter" && <span className="build-tile__season">❄</span>}
      </>
    ),
    hint: `Produces ${formatAmount(FOOD_PER_FARM)} food per day, more at harvest and far less in winter`,
  },
  {
    type: "factory",
    group: "industry",
    summary: "Makes industry, which earns money every day.",
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
    group: "industry",
    summary: "Faster income and building across the country.",
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
    group: "people",
    summary: "Raises education: more research every day.",
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
    group: "food",
    summary: "Mills stored grain into food.",
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
        <StatIcon type="food" size={16} />+{formatAmount(GRAIN_PROCESSED_PER_GRANARY * FOOD_PER_GRAIN)}
      </>
    ),
    hint: `Turns up to ${GRAIN_PROCESSED_PER_GRANARY} Grain/day into ${formatAmount((GRAIN_PROCESSED_PER_GRANARY * FOOD_PER_GRAIN))} food/day, stock permitting`,
    unlockedBy: "agriculture-grain-mills",
  },
  {
    type: "cannery",
    group: "food",
    summary: "Cans stored fish into food.",
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
        <StatIcon type="food" size={16} />+{formatAmount(FISH_PROCESSED_PER_CANNERY * FOOD_PER_FISH)}
      </>
    ),
    hint: `Turns up to ${FISH_PROCESSED_PER_CANNERY} Fish/day into ${formatAmount((FISH_PROCESSED_PER_CANNERY * FOOD_PER_FISH))} food/day, stock permitting`,
    unlockedBy: "agriculture-cannery-works",
  },
  {
    type: "harbour",
    group: "sea",
    summary: "Links a settled island to the mainland. Needs one on each side.",
    name: "Harbour",
    action: buildHarbour,
    cost: HARBOUR_COST,
    resourceCost: HARBOUR_WOOD_COST,
    resourceType: "wood",
    buildDays: HARBOUR_BUILD_DAYS,
    yields: (
      <>
        <BuildingGlyph type="harbour" size={16} />
        link
      </>
    ),
    hint: `On the coast or an island. With one on a settled island and one on a coastal province of yours, people cross between them as they would by land, and the island needs no ships chartered to supply it (${SUPPLY_FEE_PER_DAY} Cr a day saved).`,
  },
];

// Why this building can't go up right now — the first thing in the way,
// in words. Null when it can.
function blockedReason(item: BuildItem, cost: number, state: GameState, provinceId: string, provinceName: string, count: number, max: number, unlockName: string | undefined, isLocked: boolean, netPerDay: number, shutUntil?: string): string | null {
  if (shutUntil) return `Locked. ${shutUntil}.`;
  if (isLocked) return `Locked. Research “${unlockName ?? "a new technique"}” first.`;
  if (item.action.config.allowedIn && !item.action.config.allowedIn.test(provinceId)) return item.action.config.allowedIn.reason;
  if (count >= max) return `No room: all ${max} are built or underway in ${provinceName}.`;
  const moneyShort = upfront(cost) - state.stats.treasury;
  if (moneyShort > 0) {
    const days = getDaysToSave(state, moneyShort, netPerDay);
    const short = `${formatAmount(Math.ceil(moneyShort))} ${CURRENCY_SYMBOL}`;
    return days !== null ? `Enough money ${describeWait(days)} at today's income (${short} short).` : `Need ${short} more to start.`;
  }
  const resourceShort = upfront(item.resourceCost) - state.resources[item.resourceType];
  if (resourceShort > 0) return `Need ${Math.ceil(resourceShort)} more ${item.resourceType} to start, and the money to buy it.`;
  return null;
}

// A province's one most pressing need, as a short flag on its picker chip.
function provinceFlag(overview: ProvinceOverview): { text: string; urgent: boolean } | null {
  const status = getProvinceStatus(overview);
  if (status.homes === "over") return { text: "Homeless", urgent: true };
  if (status.jobs === "jobless") return { text: "Jobless", urgent: true };
  if (status.homes === "full") return { text: "Homes full", urgent: false };
  if (status.jobs === "short") return { text: "Needs workers", urgent: false };
  return null;
}

// How many stand here out of the most there can be, as filled pips.
function Pips({ count, max }: { count: number; max: number }) {
  return (
    <span className="build-row__pips" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < count ? "is-built" : ""} />
      ))}
    </span>
  );
}

export function ActionsPanel({ state, group, selectedProvinceId, dispatch, provinces, onSelectProvince, netPerDay }: ActionsPanelProps) {
  const season = getSeason(state.date);
  const mods = getModifiers(state);
  const jobsPer = getJobsPerBuilding(state);
  const provinceName = getProvinceName(selectedProvinceId);

  return (
    <section className="panel actions-panel">
      {/* Where to build: every province of yours, with its most pressing
          need, so the right one is easy to pick. */}
      <div className="actions-panel__where">
        <span className="actions-panel__where-label" id="build-where-label">
          Build in
          <span className="actions-panel__where-hint">or click the map</span>
        </span>
        <div className="actions-panel__provinces" role="radiogroup" aria-labelledby="build-where-label">
          {provinces.map((province) => {
            const flag = provinceFlag(province);
            const selected = province.id === selectedProvinceId;
            return (
              <button
                key={province.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`actions-panel__province ${selected ? "is-selected" : ""}`}
                onClick={() => onSelectProvince(province.id)}
                // Picked on the map: brought into view along the line.
                ref={selected ? (el) => el?.scrollIntoView({ block: "nearest", inline: "nearest" }) : undefined}
              >
                <span className="actions-panel__province-name">
                  {province.isCapital && <span aria-label="Capital">★ </span>}
                  {province.name}
                </span>
                {flag && <span className={`actions-panel__province-flag ${flag.urgent ? "is-urgent" : ""}`}>{flag.text}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {BUILD_GROUPS.filter((g) => g.key === group).map((group) => (
        <div key={group.key} className="build-group">
          <h3 className="build-group__title">{group.title}</h3>
          <ul className="build-list">
            {BUILD_ITEMS.filter((item) => item.group === group.key).map((item) => {
              // Shut until a research step (granaries, canneries) or a chapter (schools) opens it.
              const feature = item.action.config.feature;
              const shutUntil = feature && !isFeatureOpen(state, feature) ? chapterFor(feature).until : undefined;
              const isLocked = shutUntil !== undefined || (item.unlockedBy !== undefined && !isBuildingUnlocked(state.enactedResearchIds, item.type));
              const count = countBuildingsInProvince(state, item.type, selectedProvinceId);
              const max = item.action.maxPerProvince;
              const canBuild = !isLocked && item.action.canBuild(state, selectedProvinceId);
              const cost = getBuildCostIn(state, item.action.config, selectedProvinceId);
              const treasury = Math.floor(state.stats.treasury);
              const stock = Math.floor(state.resources[item.resourceType]);
              // Short: can't even start. Partial: can start, but today's
              // stock won't cover the rest as the build goes on.
              const treasuryShort = treasury < upfront(cost);
              const treasuryPartial = !treasuryShort && treasury < cost;
              const resourceShort = stock < upfront(item.resourceCost);
              const resourcePartial = !resourceShort && stock < item.resourceCost;
              const unlockName = item.unlockedBy ? getResearchNode(item.unlockedBy)?.name : undefined;
              const brokenHere = state.placedBuildings.filter((b) => b.type === item.type && b.provinceId === selectedProvinceId && !isWorking(b)).length;
              // Short only of material that money can cover: buy it and build in one click.
              const plan = !isLocked && !canBuild ? planBuyAndBuild(state, item.action, selectedProvinceId) : null;
              const reason = state.provinces[selectedProvinceId]?.uprising
                ? `Rebels hold ${provinceName}. Nothing can be built there until the uprising ends.`
                : plan
                ? `Need ${Math.ceil(upfront(item.resourceCost) - state.resources[item.resourceType])} more ${item.resourceType}. Buy & build gets ${Math.round(plan.amount)} for ${formatAmount(Math.round(plan.goodsCost))} ${CURRENCY_SYMBOL}.`
                : blockedReason(item, cost, state, selectedProvinceId, provinceName, count, max, unlockName, isLocked, netPerDay, shutUntil);
              const workers = item.type in jobsPer ? jobsPer[item.type as JobBuilding] : 0;

              return (
                <li key={item.type} className={`build-row ${isLocked ? "is-locked" : ""} ${canBuild ? "" : "is-blocked"}`}>
                  <span className="build-row__art" aria-hidden="true">
                    <svg viewBox="-12 -16 24 24">
                      <BuildingIcon type={item.type} x={0} y={0} size={7} />
                    </svg>
                    {isLocked && (
                      <span className="build-row__lock">
                        <LockIcon size={18} />
                      </span>
                    )}
                  </span>

                  <span className="build-row__main">
                    <span className="build-row__title">
                      <span className="build-row__name" title={item.summary}>
                        {item.name}
                      </span>
                      {!isLocked && (
                        <span className="build-row__yield" title={item.hint}>
                          {typeof item.yields === "function" ? item.yields(season, mods) : item.yields}
                        </span>
                      )}
                      {!isLocked && (
                        <span className="build-row__count" title={`${count} of ${max} built or underway in ${provinceName}`}>
                          <Pips count={count} max={max} />
                        </span>
                      )}
                    </span>

                    {!isLocked && (
                      <span className="build-row__costs">
                        {/* What you have against what it costs, so the gap reads at a glance. */}
                        <span
                          className={`build-row__cost ${treasuryShort ? "is-short" : treasuryPartial ? "is-partial" : ""}`}
                          title={`You have ${formatAmount(treasury)} ${CURRENCY_SYMBOL}. It costs ${formatAmount(cost)} in all: ${formatAmount(upfront(cost))} when ordered, the rest during the build.`}
                        >
                          <StatIcon type="treasury" size={14} />
                          {formatAmount(cost)}
                        </span>
                        <span
                          className={`build-row__cost ${resourceShort ? "is-short" : resourcePartial ? "is-partial" : ""}`}
                          title={`You have ${formatAmount(stock)} ${item.resourceType}. It takes ${item.resourceCost} in all: ${upfront(item.resourceCost)} when ordered, the rest during the build.`}
                        >
                          <ResourceGlyph type={item.resourceType} />
                          {item.resourceCost}
                        </span>
                        <span className="build-row__cost build-row__cost--plain" title={`${item.buildDays} days to build`}>
                          <HourglassIcon />
                          {item.buildDays}d
                        </span>
                        {workers > 0 && (
                          <span className="build-row__cost build-row__cost--plain" title={`Needs ${formatAmount(workers)} workers from your population. Without them it runs below capacity.`}>
                            <StatIcon type="population" size={14} />
                            {formatAmount(workers)}
                          </span>
                        )}
                      </span>
                    )}

                    {reason && (
                      <span className={`build-row__reason ${plan ? "is-solvable" : ""}`}>
                        {!plan && (
                          <span className="build-row__reason-mark" aria-hidden="true">
                            !
                          </span>
                        )}
                        {reason}
                      </span>
                    )}
                    {brokenHere > 0 && (
                      <span className="build-row__broken">
                        <WrenchIcon size={12} />
                        {brokenHere} broken here. See Repairs.
                      </span>
                    )}
                  </span>

                  <span className="build-row__action">
                    <button
                      type="button"
                      className="btn-primary build-row__button"
                      disabled={!canBuild && !plan}
                      aria-label={canBuild ? `Build ${item.name} in ${provinceName}` : plan ? `Buy ${item.resourceType} and build ${item.name} in ${provinceName}` : `${item.name}: ${reason}`}
                      title={plan ? `Buys ${Math.round(plan.amount)} ${item.resourceType} for ${formatAmount(Math.round(plan.goodsCost))} ${CURRENCY_SYMBOL}, then orders the ${item.name.toLowerCase()}` : undefined}
                      onClick={() => {
                        playBuild();
                        dispatch((s) => (item.action.canBuild(s, selectedProvinceId) ? item.action(s, selectedProvinceId) : buyAndBuild(s, item.action, selectedProvinceId)));
                      }}
                    >
                      {isLocked ? "Locked" : plan ? "Buy & build" : "Build"}
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
