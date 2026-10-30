// Step 5 of the day: stability reacts to how the country is doing, unrest
// follows stability, and stability at zero brings the government down.
import type { CountryStats, GameState } from "../../domain/country/types";
import { getColdStabilityPenalty, getHomelessStabilityPenalty } from "../../domain/housing/housingRules";
import { fitCauses } from "../../domain/ledger/ledgerRules";
import { getTaxStabilityPenalty } from "../../domain/economy/economyRules";
import { getDebtStabilityPenalty } from "../../domain/loans/loanRules";
import { getProvinceRiotDrag } from "../../domain/provinces/provinceOrder";
import { getStabilityPressures, updateStability } from "../../domain/stability/stabilityRules";
import type { UnrestStage } from "../../domain/unrest/types";
import { isWorseStage, updateUnrestStage } from "../../domain/unrest/unrestRules";
import { getPoliceStabilityBonus } from "../../domain/workforce/workforceRules";
import { book, log, type Day } from "./dayContext";

// Unrest moving a stage either way (see domain/unrest).
const UNREST_WORSENS: Record<UnrestStage, string> = {
  calm: "",
  discontent: "Discontent is spreading. Stability is under 40 and industry slows.",
  strikes: "Strikes! Stability is under 25 and factories are stopping. Police keep more of them open; a crackdown calms things a stage.",
  riots: "Riots! Stability is under 12 and mobs are wrecking buildings. Crack down before the government falls.",
};
const UNREST_EASES: Record<UnrestStage, string> = {
  calm: "The country is calm again.",
  discontent: "The strikes end, but discontent lingers.",
  strikes: "The riots die down, but the strikes go on.",
  riots: "",
};

export interface Order {
  stability: number;
  unrestStage: UnrestStage;
  collapsed: boolean; // stability hit zero today: the game ends
}

export function keepOrder(
  day: Day,
  working: GameState,
  today: { statsWithFood: CountryStats; isShortage: boolean; debt: number; homelessShare: number; unheatedShare: number; police: number },
): Order {
  const date = day.start.date;
  const debtStabilityPenalty = getDebtStabilityPenalty(today.debt);
  const homelessStabilityPenalty = getHomelessStabilityPenalty(today.homelessShare);
  const coldStabilityPenalty = getColdStabilityPenalty(today.unheatedShare);
  const taxStabilityPenalty = getTaxStabilityPenalty(working.taxRate);
  const policeStabilityBonus = getPoliceStabilityBonus(today.police);
  // Provinces rioting on their own pull the whole country down.
  const provinceRiotDrag = getProvinceRiotDrag(working.provinces, working.unrestStage);
  const stability = Math.min(
    100,
    updateStability(today.statsWithFood, today.isShortage, debtStabilityPenalty + homelessStabilityPenalty + coldStabilityPenalty + provinceRiotDrag + taxStabilityPenalty) +
      policeStabilityBonus +
      day.mods.stabilityPerDay,
  );
  const pressures = getStabilityPressures(today.statsWithFood, today.isShortage);
  book(
    day,
    "ledger",
    "stability",
    fitCauses(
      {
        food: pressures.food,
        support: pressures.support,
        debt: -debtStabilityPenalty,
        taxes: -taxStabilityPenalty,
        homes: -homelessStabilityPenalty,
        cold: -coldStabilityPenalty,
        provinces: -provinceRiotDrag,
        police: policeStabilityBonus,
        policy: day.mods.stabilityPerDay,
      },
      stability - working.stats.stability,
    ),
  );

  // Unrest escalates (or eases) with stability, announced once per change
  // of stage, not every day it lasts.
  const unrestStage = updateUnrestStage(working.unrestStage, stability);
  if (unrestStage !== working.unrestStage) {
    const worse = isWorseStage(unrestStage, working.unrestStage);
    log(day, {
      date,
      message: worse ? UNREST_WORSENS[unrestStage] : UNREST_EASES[unrestStage],
      severity: !worse ? "info" : unrestStage === "discontent" ? "warning" : "danger",
      topic: "unrest",
    });
  }

  // Stability bottoming out at zero is a hard loss, the last stage after
  // riots; this only fires once, when things have fully failed.
  const collapsed = !working.isGameOver && stability <= 0;
  if (collapsed) log(day, { date, message: "The government has collapsed. Your reign ends here.", severity: "danger", topic: "unrest" });
  return { stability, unrestStage, collapsed };
}
