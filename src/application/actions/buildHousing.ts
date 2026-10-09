import { HOUSING_BUILD_DAYS, HOUSING_COST, HOUSING_WOOD_COST, MAX_HOUSING_PER_PROVINCE } from "../../domain/constants";
import { createBuildAction } from "./createBuildAction";

export const buildHousing = createBuildAction({
  type: "housing",
  label: "Homes",
  cost: HOUSING_COST,
  buildDays: HOUSING_BUILD_DAYS,
  resourceType: "wood",
  resourceCost: HOUSING_WOOD_COST,
  maxPerProvince: MAX_HOUSING_PER_PROVINCE,
});
