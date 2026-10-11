// Use case: the one obvious fix for an advisor alert, if there is one —
// buy the coal, buy the food, repair what's broken, crack down, pay down
// the debt. Problems with more than one sensible answer (where to build
// homes, which workplace to add) get none: the chip still opens the tab.
// Each fix is worked out by running the real action on a copy of the
// state, so the cost shown is exactly what it will cost.
import { QUICK_FIX_COAL_DAYS, QUICK_FIX_FOOD_BATCHES } from "../domain/constants";
import type { GameState } from "../domain/country/types";
import { getBatchSize } from "../domain/market/marketRules";
import { buyGood, canBuyGood } from "./actions/marketActions";
import { canRepayLoan, getRepayAmount, repayLoan } from "./actions/loanActions";
import { canCrackDown, crackDown } from "./actions/politicalActions";
import { canRepairBuilding, repairBuilding } from "./actions/repairBuilding";
import type { AdvisorAlert } from "./getAdvisorOutlook";
import type { HeatingOutlook } from "./getHeatingOutlook";

export interface QuickFix {
  label: string; // the button: "Buy 25 coal"
  treasuryCost: number; // what it takes from the treasury (0 if nothing)
  politicalPowerCost: number;
  apply: (state: GameState) => GameState;
}

function measured(state: GameState, label: string, apply: (s: GameState) => GameState): QuickFix | null {
  const after = apply(state);
  if (after === state) return null; // nothing it could do
  return {
    label,
    treasuryCost: Math.max(0, state.stats.treasury - after.stats.treasury),
    politicalPowerCost: Math.max(0, state.stats.politicalPower - after.stats.politicalPower),
    apply,
  };
}

// The biggest number of batches (up to `wanted`) the treasury and market allow.
function affordableBatches(state: GameState, good: "coal" | "food", wanted: number): number {
  for (let n = wanted; n > 0; n--) if (canBuyGood(state, good, n)) return n;
  return 0;
}

export function getQuickFix(state: GameState, alert: AdvisorAlert, heating: HeatingOutlook): QuickFix | null {
  switch (alert.kind) {
    case "coal": {
      // Enough to heat the homes for a month of winter (or what's left of it).
      const days = heating.isWinter ? Math.min(QUICK_FIX_COAL_DAYS, heating.winterDaysLeft) : QUICK_FIX_COAL_DAYS;
      const missing = heating.fuelPerDay * days - heating.fuel;
      if (missing <= 0) return null;
      const batches = affordableBatches(state, "coal", Math.ceil(missing / getBatchSize("coal", 1)));
      if (batches === 0) return null;
      return measured(state, `Buy ${getBatchSize("coal", batches)} coal`, (s) => buyGood(s, "coal", batches));
    }
    case "food": {
      const batches = affordableBatches(state, "food", QUICK_FIX_FOOD_BATCHES);
      if (batches === 0) return null;
      return measured(state, `Buy ${Math.round(getBatchSize("food", batches) / 1000)}k food`, (s) => buyGood(s, "food", batches));
    }
    case "broken": {
      const fixable = state.placedBuildings.filter((b) => canRepairBuilding(state, b.id)).length;
      if (fixable === 0) return null;
      // Repairs one after another, as far as money and materials stretch.
      const repairAll = (s: GameState) => s.placedBuildings.reduce((acc, b) => (canRepairBuilding(acc, b.id) ? repairBuilding(acc, b.id) : acc), s);
      const done = repairAll(state).placedBuildings.filter((b) => b.condition === "repairing").length - state.placedBuildings.filter((b) => b.condition === "repairing").length;
      return measured(state, done === 1 ? "Repair it" : `Repair ${done}`, repairAll);
    }
    case "unrest":
    case "provinceUnrest":
      return canCrackDown(state) ? measured(state, "Crack down", crackDown) : null;
    case "debt":
      return canRepayLoan(state) ? measured(state, `Repay ${Math.round(getRepayAmount(state) / 100) / 10}k`, repayLoan) : null;
    default:
      return null;
  }
}
