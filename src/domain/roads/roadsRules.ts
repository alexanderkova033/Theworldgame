// Roads carry everything a little faster: a small rise in income and building
// speed, more goods reaching the stores, people moving more readily between
// provinces, and a cheaper market. The first few count most.
import { ROAD_EFFICIENCY_BONUS, ROAD_FULL_BONUS_COUNT, ROAD_LATE_SHARE, ROAD_MARKET_DISCOUNT, ROAD_MIGRATION_BONUS, ROAD_PRODUCTION_BONUS } from "../constants";

// Roads as they count: every one up to the limit, then a fraction of each.
function effectiveRoads(roadCount: number): number {
  return Math.min(roadCount, ROAD_FULL_BONUS_COUNT) + Math.max(0, roadCount - ROAD_FULL_BONUS_COUNT) * ROAD_LATE_SHARE;
}

// Income and building speed.
export function calculateEfficiencyMultiplier(roadCount: number): number {
  return 1 + effectiveRoads(roadCount) * ROAD_EFFICIENCY_BONUS;
}

export function getRoadProductionMultiplier(roadCount: number): number {
  return 1 + effectiveRoads(roadCount) * ROAD_PRODUCTION_BONUS;
}

export function getRoadMigrationMultiplier(roadCount: number): number {
  return 1 + effectiveRoads(roadCount) * ROAD_MIGRATION_BONUS;
}

// What the market charges, as a share of its price.
export function getRoadMarketMultiplier(roadCount: number): number {
  return 1 - effectiveRoads(roadCount) * ROAD_MARKET_DISCOUNT;
}
