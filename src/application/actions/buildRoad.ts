import { ROAD_BUILD_DAYS, ROAD_COST, ROAD_ORE_COST, MAX_ROADS_PER_PROVINCE } from "../../domain/constants";
import { createBuildAction } from "./createBuildAction";

export const buildRoad = createBuildAction({
  type: "road",
  label: "Road",
  cost: ROAD_COST,
  buildDays: ROAD_BUILD_DAYS,
  resourceType: "ore",
  resourceCost: ROAD_ORE_COST,
  maxPerProvince: MAX_ROADS_PER_PROVINCE,
});
