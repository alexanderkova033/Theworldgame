import { GRANARY_BUILD_DAYS, GRANARY_COST, GRANARY_WOOD_COST, MAX_GRANARIES_PER_PROVINCE } from "../../domain/constants";
import { createBuildAction } from "./createBuildAction";

export const buildGranary = createBuildAction({
  type: "granary",
  label: "Granary",
  cost: GRANARY_COST,
  buildDays: GRANARY_BUILD_DAYS,
  resourceType: "wood",
  resourceCost: GRANARY_WOOD_COST,
  maxPerProvince: MAX_GRANARIES_PER_PROVINCE,
  requiresResearch: true,
});
