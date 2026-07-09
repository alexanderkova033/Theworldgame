import { FARM_BUILD_DAYS, FARM_COST, FARM_WOOD_COST, MAX_FARMS_PER_PROVINCE } from "../../domain/constants";
import { createBuildAction } from "./createBuildAction";

export const buildFarm = createBuildAction({
  type: "farm",
  label: "Farm",
  cost: FARM_COST,
  buildDays: FARM_BUILD_DAYS,
  resourceType: "wood",
  resourceCost: FARM_WOOD_COST,
  maxPerProvince: MAX_FARMS_PER_PROVINCE,
});
