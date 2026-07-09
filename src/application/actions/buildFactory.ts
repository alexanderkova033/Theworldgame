import { FACTORY_BUILD_DAYS, FACTORY_COST, FACTORY_ORE_COST, MAX_FACTORIES_PER_PROVINCE } from "../../domain/constants";
import { createBuildAction } from "./createBuildAction";

export const buildFactory = createBuildAction({
  type: "factory",
  label: "Factory",
  cost: FACTORY_COST,
  buildDays: FACTORY_BUILD_DAYS,
  resourceType: "ore",
  resourceCost: FACTORY_ORE_COST,
  maxPerProvince: MAX_FACTORIES_PER_PROVINCE,
});
