import { getRecruitmentCost, getRecruitmentStrength } from "../../domain/army/armyRules";
import { canAfford } from "../../domain/economy/economyRules";
import type { GameState } from "../../domain/country/types";

// Recruitment is instant (no project/timer) — treasury is spent immediately
// and army strength rises right away. Ongoing upkeep is handled daily by
// domain/economy.
export function recruitSoldiers(state: GameState): GameState {
  const cost = getRecruitmentCost();
  if (!canAfford(state.stats, cost)) return state;

  return {
    ...state,
    stats: {
      ...state.stats,
      treasury: state.stats.treasury - cost,
      armyStrength: state.stats.armyStrength + getRecruitmentStrength(),
    },
  };
}
