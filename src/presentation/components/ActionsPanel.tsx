// Build orders, for the province chosen on the map. Each building is a row
// with its picture, what it gives, pips for how many stand here, and its
// costs in green (enough), amber (enough to start) or red (not enough), each
// with the first payment beside it. What it does in a sentence is in its
// name's tip; when it can't be built, the row says why in a few words, and
// the whole of it is in that reason's tip.
import "./ActionsPanel.css";
import { getModifiers } from "../../domain/policy/policyRules";
import type { ReactNode } from "react";
import { getProvinceStatus, type ProvinceOverview } from "../../application/getProvinceOverview";
import { buildCannery, buildEducation, buildEstate, buildFactory, buildFarm, buildFoundry, buildGranary, buildHarbour, buildHousing, buildMine, buildModelFarm, buildRoad, buildSawmill, buildSteelworks, buildTenement, buildTower, buyAndBuild, countBuildingsInProvince, planBuyAndBuild } from "../../application/actions";
import { getBuildCostIn, upfrontCost, type BuildAction } from "../../application/actions/createBuildAction";
import { describeWait, getDaysToSave, type SavingIncome } from "../../application/getDaysToSave";
import { getWorkerSource } from "../../application/getWorkerSource";
import {
  CANNERY_BUILD_DAYS,
  COAL_PER_MINE,
  ESTATE_BUILD_DAYS,
  ESTATE_COST,
  ESTATE_WOOD_COST,
  FACTORIES_PER_FOUNDRY,
  FACTORIES_PER_STEELWORKS,
  FARMS_PER_ESTATE,
  FARMS_PER_MODEL_FARM,
  FOUNDRY_BUILD_DAYS,
  FOUNDRY_COST,
  FOUNDRY_ORE_COST,
  HOMES_PER_TENEMENT,
  HOMES_PER_TOWER,
  MINE_BUILD_DAYS,
  MINE_COST,
  MINE_WOOD_COST,
  MODEL_FARM_BUILD_DAYS,
  MODEL_FARM_COST,
  MODEL_FARM_WOOD_COST,
  ORE_PER_MINE,
  SAWMILL_BUILD_DAYS,
  SAWMILL_COST,
  SAWMILL_WOOD_COST,
  STEELWORKS_BUILD_DAYS,
  STEELWORKS_COST,
  STEELWORKS_ORE_COST,
  TENEMENT_BUILD_DAYS,
  TENEMENT_COST,
  TENEMENT_WOOD_COST,
  TOWER_BUILD_DAYS,
  TOWER_COST,
  TOWER_ORE_COST,
  WOOD_PER_SAWMILL,
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
  WOOD_PER_COAL_HEAT,
  HOUSING_BUILD_DAYS,
  HOUSING_COST,
  HOUSING_WOOD_COST,
  PEOPLE_PER_HOME,
  INCOME_PER_INDUSTRY,
  INDUSTRY_PER_FACTORY,
  ROAD_BUILD_DAYS,
  ROAD_COST,
  ROAD_EFFICIENCY_BONUS,
  ROAD_FULL_BONUS_COUNT,
  ROAD_LATE_SHARE,
  ROAD_MARKET_DISCOUNT,
  ROAD_MIGRATION_BONUS,
  ROAD_PRODUCTION_BONUS,
  ROAD_ORE_COST,
  SUPPLY_FEE_PER_DAY,
} from "../../domain/constants";
import type { ProjectType } from "../../domain/construction/types";
import { getBuildingHeatDemand } from "../../domain/housing/housingRules";
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
import { counted } from "../../domain/plural";

interface ActionsPanelProps {
  state: GameState;
  selectedProvinceId: string;
  dispatch: (action: (state: GameState) => GameState) => void;
  provinces: ProvinceOverview[];
  income: SavingIncome; // the treasury's daily balance, for how long a shortfall takes to save
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
  summary: string; // what it's for, in a few plain words: the tip on its name
  name: string;
  action: BuildAction;
  cost: number;
  resourceCost: number;
  resourceType: ResourceType;
  buildDays: number;
  yields: ReactNode | ((season: Season, mods: FoodModifiers, roads: number) => ReactNode); // glyph + a short number; the full sentence is `hint`
  hint: string;
  unlockedBy?: string; // research node name, for buildings still locked behind the Research tree
}

// What a building burns on a winter day, with the country's laws and research.
function winterBurn(type: ProjectType, heatingMultiplier: number): string {
  const coal = getBuildingHeatDemand(type) * heatingMultiplier;
  return `Burns ${Math.round(coal * 100) / 100} coal a day in winter, or ${Math.round(coal * WOOD_PER_COAL_HEAT * 100) / 100} wood`;
}

const BUILD_ITEMS: BuildItem[] = [
  {
    type: "tenement",
    group: "people",
    summary: `Houses as many as ${HOMES_PER_TENEMENT} homes on one plot, and burns less than they would.`,
    name: "Tenement",
    action: buildTenement,
    cost: TENEMENT_COST,
    resourceCost: TENEMENT_WOOD_COST,
    resourceType: "wood",
    buildDays: TENEMENT_BUILD_DAYS,
    yields: (
      <>
        <StatIcon type="population" size={16} />+{formatAmount(PEOPLE_PER_HOME * HOMES_PER_TENEMENT)}
      </>
    ),
    hint: `Houses ${formatAmount(PEOPLE_PER_HOME * HOMES_PER_TENEMENT)} people.`,
  },
  {
    type: "tower",
    group: "people",
    summary: `Houses as many as ${HOMES_PER_TOWER} homes. Iron-framed, costs ore, and holds its heat best.`,
    name: "Apartment Block",
    action: buildTower,
    cost: TOWER_COST,
    resourceCost: TOWER_ORE_COST,
    resourceType: "ore",
    buildDays: TOWER_BUILD_DAYS,
    yields: (
      <>
        <StatIcon type="population" size={16} />+{formatAmount(PEOPLE_PER_HOME * HOMES_PER_TOWER)}
      </>
    ),
    hint: `Houses ${formatAmount(PEOPLE_PER_HOME * HOMES_PER_TOWER)} people.`,
    unlockedBy: "housing-back-to-backs",
  },
  {
    type: "estate",
    group: "food",
    summary: `Grows as much as ${FARMS_PER_ESTATE} farms, with far fewer hands.`,
    name: "Estate",
    action: buildEstate,
    cost: ESTATE_COST,
    resourceCost: ESTATE_WOOD_COST,
    resourceType: "wood",
    buildDays: ESTATE_BUILD_DAYS,
    yields: (season, mods) => (
      <>
        <StatIcon type="food" size={16} />+{formatAmount(produceFood(FARMS_PER_ESTATE, season, mods))}
        {season === "winter" && <span className="build-tile__season">❄</span>}
      </>
    ),
    hint: `Produces ${formatAmount(FOOD_PER_FARM * FARMS_PER_ESTATE)} food per day, more at harvest and far less in winter`,
  },
  {
    type: "modelFarm",
    group: "food",
    summary: `Grows as much as ${FARMS_PER_MODEL_FARM} farms.`,
    name: "Model Farm",
    action: buildModelFarm,
    cost: MODEL_FARM_COST,
    resourceCost: MODEL_FARM_WOOD_COST,
    resourceType: "wood",
    buildDays: MODEL_FARM_BUILD_DAYS,
    yields: (season, mods) => (
      <>
        <StatIcon type="food" size={16} />+{formatAmount(produceFood(FARMS_PER_MODEL_FARM, season, mods))}
        {season === "winter" && <span className="build-tile__season">❄</span>}
      </>
    ),
    hint: `Produces ${formatAmount(FOOD_PER_FARM * FARMS_PER_MODEL_FARM)} food per day, more at harvest and far less in winter`,
    unlockedBy: "agriculture-steam-ploughs",
  },
  {
    type: "foundry",
    group: "industry",
    summary: `Makes as much as ${FACTORIES_PER_FOUNDRY} factories, with far fewer hands.`,
    name: "Foundry",
    action: buildFoundry,
    cost: FOUNDRY_COST,
    resourceCost: FOUNDRY_ORE_COST,
    resourceType: "ore",
    buildDays: FOUNDRY_BUILD_DAYS,
    yields: (
      <>
        <StatIcon type="industry" size={16} />+{INDUSTRY_PER_FACTORY * FACTORIES_PER_FOUNDRY}
      </>
    ),
    hint: `Produces ${INDUSTRY_PER_FACTORY * FACTORIES_PER_FOUNDRY} industry per day, worth about ${INDUSTRY_PER_FACTORY * FACTORIES_PER_FOUNDRY * INCOME_PER_INDUSTRY} ${CURRENCY_SYMBOL}/day`,
  },
  {
    type: "steelworks",
    group: "industry",
    summary: `Makes as much as ${FACTORIES_PER_STEELWORKS} factories.`,
    name: "Steelworks",
    action: buildSteelworks,
    cost: STEELWORKS_COST,
    resourceCost: STEELWORKS_ORE_COST,
    resourceType: "ore",
    buildDays: STEELWORKS_BUILD_DAYS,
    yields: (
      <>
        <StatIcon type="industry" size={16} />+{INDUSTRY_PER_FACTORY * FACTORIES_PER_STEELWORKS}
      </>
    ),
    hint: `Produces ${INDUSTRY_PER_FACTORY * FACTORIES_PER_STEELWORKS} industry per day, worth about ${INDUSTRY_PER_FACTORY * FACTORIES_PER_STEELWORKS * INCOME_PER_INDUSTRY} ${CURRENCY_SYMBOL}/day`,
    unlockedBy: "industry-automated-foundries",
  },
  {
    type: "mine",
    group: "land",
    summary: "Gets more ore and coal out of the hills.",
    name: "Mine",
    action: buildMine,
    cost: MINE_COST,
    resourceCost: MINE_WOOD_COST,
    resourceType: "wood",
    buildDays: MINE_BUILD_DAYS,
    yields: (
      <>
        <ResourceGlyph type="ore" />+{ORE_PER_MINE}
        <ResourceGlyph type="coal" />+{COAL_PER_MINE}
      </>
    ),
    hint: `+${ORE_PER_MINE} ore and +${COAL_PER_MINE} coal a day, in the hills, as long as the seam lasts`,
  },
  {
    type: "sawmill",
    group: "land",
    summary: "Gets more wood out of the forest.",
    name: "Sawmill",
    action: buildSawmill,
    cost: SAWMILL_COST,
    resourceCost: SAWMILL_WOOD_COST,
    resourceType: "wood",
    buildDays: SAWMILL_BUILD_DAYS,
    yields: (
      <>
        <ResourceGlyph type="wood" />+{WOOD_PER_SAWMILL}
      </>
    ),
    hint: `+${WOOD_PER_SAWMILL} wood a day, in the forest`,
  },
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
    hint: `Houses ${formatAmount(PEOPLE_PER_HOME)} people (more with Homes research).`,
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
    yields: (_season, _mods, roads) => (
      <>
        <StatIcon type="treasury" size={16} />+{Math.round((roads < ROAD_FULL_BONUS_COUNT ? ROAD_EFFICIENCY_BONUS : ROAD_EFFICIENCY_BONUS * ROAD_LATE_SHARE) * 1000) / 10}%
      </>
    ),
    hint: `Each of your first ${ROAD_FULL_BONUS_COUNT} roads, nationwide: +${ROAD_EFFICIENCY_BONUS * 100}% income and building speed, +${ROAD_PRODUCTION_BONUS * 100}% goods, +${ROAD_MIGRATION_BONUS * 100}% people moving between provinces, and ${ROAD_MARKET_DISCOUNT * 100}% off market prices. Later roads add ${ROAD_LATE_SHARE * 100}% of that.`,
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

// Plain first, then larger, then what's only useful later.
const ORDER_IN_GROUP: ProjectType[] = ["housing", "tenement", "tower", "education", "farm", "estate", "modelFarm", "granary", "cannery", "factory", "foundry", "steelworks", "road", "mine", "sawmill", "harbour"];

// What's in the way: a few words for the row, the whole of it for the tip.
interface Reason {
  short: string;
  full: string;
}

// Why this building can't go up right now: the first thing in the way. Null
// when it can.
function blockedReason(item: BuildItem, cost: number, state: GameState, provinceId: string, provinceName: string, count: number, max: number, unlockName: string | undefined, isLocked: boolean, income: SavingIncome, shutUntil?: string): Reason | null {
  if (shutUntil) return { short: "Not open yet.", full: `Locked. ${shutUntil}.` };
  if (isLocked) {
    const short = `Research “${unlockName ?? "a new technique"}” first.`;
    return { short, full: `Locked. ${short}` };
  }
  if (item.action.config.allowedIn && !item.action.config.allowedIn.test(provinceId)) {
    const reason = item.action.config.allowedIn.reason;
    return { short: reason, full: reason };
  }
  if (count >= max) return { short: "No room here.", full: `No room: all ${max} are built or underway in ${provinceName}.` };
  const moneyShort = upfrontCost(cost) - state.stats.treasury;
  if (moneyShort > 0) {
    const days = getDaysToSave(state, moneyShort, income);
    const short = `${formatAmount(Math.ceil(moneyShort))} ${CURRENCY_SYMBOL} short`;
    return { short: `${short}.`, full: days !== null ? `Enough money ${describeWait(days)} at today's income (${short}).` : `${short} of the first payment.` };
  }
  const resourceShort = upfrontCost(item.resourceCost) - state.resources[item.resourceType];
  if (resourceShort > 0) return { short: `${Math.ceil(resourceShort)} ${item.resourceType} short.`, full: `Need ${Math.ceil(resourceShort)} more ${item.resourceType} to start, and the money to buy it.` };
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

export function ActionsPanel({ state, selectedProvinceId, dispatch, provinces, income }: ActionsPanelProps) {
  const season = getSeason(state.date);
  const mods = getModifiers(state);
  const jobsPer = getJobsPerBuilding(state);
  const provinceName = getProvinceName(selectedProvinceId);
  const selected = provinces.find((p) => p.id === selectedProvinceId);
  const flag = selected ? provinceFlag(selected) : null;

  return (
    <section className="panel actions-panel">
      {/* Where these go: the province chosen on the map, and its most
          pressing need. */}
      <p className="actions-panel__where" title="Click a province on the map to build there">
        {selected?.isCapital && <span aria-label="Capital">★ </span>}
        <strong>{provinceName}</strong>
        {flag && <span className={`actions-panel__province-flag ${flag.urgent ? "is-urgent" : ""}`}>{flag.text}</span>}
      </p>

      {/* Every building, in groups ruled off from one another. */}
      {BUILD_GROUPS.map((group) => (
        <div key={group.key} className="build-group" data-rail={group.key} role="group" aria-label={group.title}>
          <ul className="build-list">
            {BUILD_ITEMS.filter((item) => item.group === group.key)
              .sort((a, b) => ORDER_IN_GROUP.indexOf(a.type) - ORDER_IN_GROUP.indexOf(b.type))
              .map((item) => {
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
              const treasuryShort = treasury < upfrontCost(cost);
              const treasuryPartial = !treasuryShort && treasury < cost;
              const resourceShort = stock < upfrontCost(item.resourceCost);
              const resourcePartial = !resourceShort && stock < item.resourceCost;
              const unlockName = item.unlockedBy ? getResearchNode(item.unlockedBy)?.name : undefined;
              const brokenHere = state.placedBuildings.filter((b) => b.type === item.type && b.provinceId === selectedProvinceId && !isWorking(b)).length;
              // Short only of material that money can cover: buy it and build in one click.
              const plan = !isLocked && !canBuild ? planBuyAndBuild(state, item.action, selectedProvinceId) : null;
              const reason: Reason | null = state.provinces[selectedProvinceId]?.uprising
                ? { short: `Rebels hold ${provinceName}.`, full: `Rebels hold ${provinceName}. Nothing can be built there until the uprising ends.` }
                : plan
                ? { short: `Short of ${item.resourceType}.`, full: `Short of ${item.resourceType}: buys ${Math.round(plan.amount)} for ${formatAmount(Math.round(plan.goodsCost))} ${CURRENCY_SYMBOL}, plus ${formatAmount(upfrontCost(cost))} ${CURRENCY_SYMBOL} to start.` }
                : blockedReason(item, cost, state, selectedProvinceId, provinceName, count, max, unlockName, isLocked, income, shutUntil);
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
                      <span className="build-row__name" data-tip={item.summary}>
                        {item.name}
                      </span>
                      {!isLocked && (
                        <span className="build-row__yield" data-tip={getBuildingHeatDemand(item.type) > 0 ? `${item.hint} ${winterBurn(item.type, mods.heatingMultiplier)}` : item.hint}>
                          {typeof item.yields === "function" ? item.yields(season, mods, state.placedBuildings.filter((b) => b.type === "road").length) : item.yields}
                        </span>
                      )}
                      {!isLocked && (
                        <span className="build-row__count" data-tip={`${count} of ${max} built or underway in ${provinceName}`}>
                          <Pips count={count} max={max} />
                        </span>
                      )}
                      {brokenHere > 0 && (
                        <span className="build-row__broken" data-tip={`${brokenHere} broken here. See Repairs.`}>
                          <WrenchIcon size={12} />
                          {brokenHere}
                        </span>
                      )}
                    </span>

                    {!isLocked && (
                      <span className="build-row__costs">
                        {/* The whole price and the first payment. These two tips stay plain
                            titles: what you have ticks over, and only a title follows that
                            while it's pointed at (Tooltips.tsx). */}
                        <span
                          className={`build-row__cost ${treasuryShort ? "is-short" : treasuryPartial ? "is-partial" : ""}`}
                          title={`You have ${formatAmount(treasury)} ${CURRENCY_SYMBOL}. It costs ${formatAmount(cost)} in all: ${formatAmount(upfrontCost(cost))} when ordered, the rest during the build.`}
                        >
                          <StatIcon type="treasury" size={14} />
                          {formatAmount(cost)}
                          <span className="build-row__first">({formatAmount(upfrontCost(cost))} now)</span>
                        </span>
                        <span
                          className={`build-row__cost ${resourceShort ? "is-short" : resourcePartial ? "is-partial" : ""}`}
                          title={`You have ${formatAmount(stock)} ${item.resourceType}. It takes ${item.resourceCost} in all: ${upfrontCost(item.resourceCost)} when ordered, the rest during the build.`}
                        >
                          <ResourceGlyph type={item.resourceType} />
                          {item.resourceCost}
                          <span className="build-row__first">({upfrontCost(item.resourceCost)} now)</span>
                        </span>
                        <span className="build-row__cost build-row__cost--plain" data-tip={`${counted(item.buildDays, "day")} to build`}>
                          <HourglassIcon />
                          {item.buildDays}d
                        </span>
                        {workers > 0 && (
                          <span className="build-row__cost build-row__cost--plain" data-tip={getWorkerSource(state, item.type) ?? `Needs ${formatAmount(workers)} workers from your population. Without them it runs below capacity.`}>
                            <StatIcon type="population" size={14} />
                            {formatAmount(workers)}
                          </span>
                        )}
                      </span>
                    )}

                    {reason && (
                      <span className={`build-row__reason ${plan ? "is-solvable" : ""}`} data-tip={reason.full === reason.short ? undefined : reason.full}>
                        {!plan && (
                          <span className="build-row__reason-mark" aria-hidden="true">
                            !
                          </span>
                        )}
                        {reason.short}
                      </span>
                    )}
                  </span>

                  <span className="build-row__action">
                    <button
                      type="button"
                      className="btn-primary build-row__button"
                      disabled={!canBuild && !plan}
                      aria-label={canBuild ? `Build ${item.name} in ${provinceName}` : plan ? `Buy ${item.resourceType} and build ${item.name} in ${provinceName}` : `${item.name}: ${reason?.full}`}
                      data-tip={plan ? `${formatAmount(Math.round(plan.goodsCost))} ${CURRENCY_SYMBOL} for ${Math.round(plan.amount)} ${item.resourceType} on the market, and ${formatAmount(upfrontCost(cost))} ${CURRENCY_SYMBOL} down on the ${item.name.toLowerCase()}. The rest of its price comes out daily as it goes up.` : undefined}
                      onClick={() => {
                        playBuild();
                        dispatch((s) => (item.action.canBuild(s, selectedProvinceId) ? item.action(s, selectedProvinceId) : buyAndBuild(s, item.action, selectedProvinceId)));
                      }}
                    >
                      {isLocked ? "Locked" : plan ? "Buy & build" : "Build"}
                      {plan && (
                        <span className="build-row__button-price">
                          <StatIcon type="treasury" size={14} />
                          {formatAmount(Math.round(plan.goodsCost + upfrontCost(cost)))} now
                        </span>
                      )}
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
