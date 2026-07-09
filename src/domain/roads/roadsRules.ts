// Roads improve "economic efficiency": a multiplier applied to daily income
// and to how fast construction/research projects progress.
import { ROAD_EFFICIENCY_BONUS } from "../constants";

export function calculateEfficiencyMultiplier(roadCount: number): number {
  return 1 + roadCount * ROAD_EFFICIENCY_BONUS;
}
