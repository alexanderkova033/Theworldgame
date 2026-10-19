import { HARBOUR_BUILD_DAYS, HARBOUR_COST, HARBOUR_WOOD_COST, MAX_HARBOURS_PER_PROVINCE } from "../../domain/constants";
import { getHarbourCostShare, isHarbourSite } from "../../domain/islands/islandRules";
import { createBuildAction } from "./createBuildAction";

// A harbour links a settled island to the mainland (see domain/islands):
// one on the island and one on a coastal province of yours.
export const buildHarbour = createBuildAction({
  type: "harbour",
  label: "Harbour",
  cost: HARBOUR_COST,
  buildDays: HARBOUR_BUILD_DAYS,
  resourceType: "wood",
  resourceCost: HARBOUR_WOOD_COST,
  maxPerProvince: MAX_HARBOURS_PER_PROVINCE,
  feature: "ventures",
  allowedIn: { test: isHarbourSite, reason: "A harbour goes on the coast or on an island." },
  costShareIn: getHarbourCostShare,
});
