// The larger buildings: tenements and towers, estates and model farms,
// foundries and steelworks. The first of each pair is open from the start, the
// second takes research. Then what gets more out of the land: mines in the
// hills, sawmills in the forest.
import {
  ESTATE_BUILD_DAYS,
  ESTATE_COST,
  ESTATE_WOOD_COST,
  FOUNDRY_BUILD_DAYS,
  FOUNDRY_COST,
  FOUNDRY_ORE_COST,
  MAX_ESTATES_PER_PROVINCE,
  MAX_FOUNDRIES_PER_PROVINCE,
  MAX_MINES_PER_PROVINCE,
  MAX_MODEL_FARMS_PER_PROVINCE,
  MAX_SAWMILLS_PER_PROVINCE,
  MAX_STEELWORKS_PER_PROVINCE,
  MAX_TENEMENTS_PER_PROVINCE,
  MAX_TOWERS_PER_PROVINCE,
  MINE_BUILD_DAYS,
  MINE_COST,
  MINE_WOOD_COST,
  MODEL_FARM_BUILD_DAYS,
  MODEL_FARM_COST,
  MODEL_FARM_WOOD_COST,
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
} from "../../domain/constants";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import type { Terrain } from "../../domain/provinces/types";
import { createBuildAction } from "./createBuildAction";

const onTerrain = (terrain: Terrain) => (provinceId: string) => [...MAP_GEOMETRY.provinces, ...MAP_GEOMETRY.islands].some((p) => p.id === provinceId && p.terrain === terrain);

export const buildTenement = createBuildAction({ type: "tenement", label: "Tenement", cost: TENEMENT_COST, buildDays: TENEMENT_BUILD_DAYS, resourceType: "wood", resourceCost: TENEMENT_WOOD_COST, maxPerProvince: MAX_TENEMENTS_PER_PROVINCE });
export const buildTower = createBuildAction({ type: "tower", label: "Apartment Block", cost: TOWER_COST, buildDays: TOWER_BUILD_DAYS, resourceType: "ore", resourceCost: TOWER_ORE_COST, maxPerProvince: MAX_TOWERS_PER_PROVINCE, requiresResearch: true });
export const buildEstate = createBuildAction({ type: "estate", label: "Estate", cost: ESTATE_COST, buildDays: ESTATE_BUILD_DAYS, resourceType: "wood", resourceCost: ESTATE_WOOD_COST, maxPerProvince: MAX_ESTATES_PER_PROVINCE });
export const buildModelFarm = createBuildAction({ type: "modelFarm", label: "Model Farm", cost: MODEL_FARM_COST, buildDays: MODEL_FARM_BUILD_DAYS, resourceType: "wood", resourceCost: MODEL_FARM_WOOD_COST, maxPerProvince: MAX_MODEL_FARMS_PER_PROVINCE, requiresResearch: true });
export const buildFoundry = createBuildAction({ type: "foundry", label: "Foundry", cost: FOUNDRY_COST, buildDays: FOUNDRY_BUILD_DAYS, resourceType: "ore", resourceCost: FOUNDRY_ORE_COST, maxPerProvince: MAX_FOUNDRIES_PER_PROVINCE });
export const buildSteelworks = createBuildAction({ type: "steelworks", label: "Steelworks", cost: STEELWORKS_COST, buildDays: STEELWORKS_BUILD_DAYS, resourceType: "ore", resourceCost: STEELWORKS_ORE_COST, maxPerProvince: MAX_STEELWORKS_PER_PROVINCE, requiresResearch: true });
export const buildMine = createBuildAction({
  type: "mine",
  label: "Mine",
  cost: MINE_COST,
  buildDays: MINE_BUILD_DAYS,
  resourceType: "wood",
  resourceCost: MINE_WOOD_COST,
  maxPerProvince: MAX_MINES_PER_PROVINCE,
  allowedIn: { test: onTerrain("hills"), reason: "A mine goes in the hills." },
});
export const buildSawmill = createBuildAction({
  type: "sawmill",
  label: "Sawmill",
  cost: SAWMILL_COST,
  buildDays: SAWMILL_BUILD_DAYS,
  resourceType: "wood",
  resourceCost: SAWMILL_WOOD_COST,
  maxPerProvince: MAX_SAWMILLS_PER_PROVINCE,
  allowedIn: { test: onTerrain("forest"), reason: "A sawmill goes in the forest." },
});
