import { CANNERY_BUILD_DAYS, CANNERY_COST, CANNERY_ORE_COST, MAX_CANNERIES_PER_PROVINCE } from "../../domain/constants";
import { createBuildAction } from "./createBuildAction";

export const buildCannery = createBuildAction({
  type: "cannery",
  label: "Cannery",
  cost: CANNERY_COST,
  buildDays: CANNERY_BUILD_DAYS,
  resourceType: "ore",
  resourceCost: CANNERY_ORE_COST,
  maxPerProvince: MAX_CANNERIES_PER_PROVINCE,
  requiresResearch: true,
});
