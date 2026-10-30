// Roads improve "economic efficiency": a multiplier applied to daily income
// and to how fast construction/research projects progress.
import { ROAD_EFFICIENCY_BONUS, ROAD_FULL_BONUS_COUNT, ROAD_LATE_BONUS } from "../constants";

export function calculateEfficiencyMultiplier(roadCount: number): number {
  return 1 + Math.min(roadCount, ROAD_FULL_BONUS_COUNT) * ROAD_EFFICIENCY_BONUS + Math.max(0, roadCount - ROAD_FULL_BONUS_COUNT) * ROAD_LATE_BONUS;
}
