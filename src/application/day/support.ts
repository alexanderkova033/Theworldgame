// Step 6 of the day: support drifts toward a target built from how the
// country is run (taxes, food, homes, heat, jobs, stability; see
// politicsRules.ts), and heavy debt costs some. Applied group by group,
// then summed back into the one support number.
import { POPULARITY_BASE_TARGET, POPULARITY_DRIFT_RATE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { fitCauses } from "../../domain/ledger/ledgerRules";
import { getDebtPopularityPenalty } from "../../domain/loans/loanRules";
import { getFactionWeights } from "../../domain/parties/factionRules";
import { getPopularityDrivers, getPopularityTarget, updateFactionPopularity, type PopularityConditions } from "../../domain/politics/politicsRules";
import { book, type Day } from "./dayContext";

export interface Support {
  factionApproval: GameState["factionApproval"];
  popularity: number;
  factionWeights: ReturnType<typeof getFactionWeights>;
}

export function moveSupport(
  day: Day,
  working: GameState,
  today: { isShortage: boolean; homelessShare: number; unheatedShare: number; unemploymentShare: number; stability: number; debt: number },
): Support {
  const factionWeights = getFactionWeights(working.nationId);
  const conditions: PopularityConditions = {
    taxRate: working.taxRate,
    isFoodShortage: today.isShortage,
    homelessShare: today.homelessShare,
    unheatedShare: today.unheatedShare,
    unemploymentShare: today.unemploymentShare,
    stability: today.stability,
    taxTolerance: day.mods.taxTolerance,
    hardship: day.mods.hardshipMultiplier,
    policy: day.mods.supportTarget,
  };
  const target = getPopularityTarget(conditions);
  const debtPenalty = getDebtPopularityPenalty(today.debt);
  const { factionApproval, popularity } = updateFactionPopularity(working.factionApproval, factionWeights, target, debtPenalty);
  // Opinion moves a share of the way to its target each day, so each driver
  // moves it by that share of what it adds to the target (scaled down if the
  // target was capped). What's left is opinion easing back toward neutral.
  const drivers = getPopularityDrivers(conditions);
  const rawPush = drivers.reduce((sum, d) => sum + d.value, 0);
  const pushScale = rawPush !== 0 ? (target - POPULARITY_BASE_TARGET) / rawPush : 0;
  book(
    day,
    "ledger",
    "support",
    fitCauses(
      {
        ...Object.fromEntries(drivers.map((d) => [d.key, d.value * pushScale * POPULARITY_DRIFT_RATE])),
        settling: (POPULARITY_BASE_TARGET - working.stats.popularity) * POPULARITY_DRIFT_RATE,
        debt: -debtPenalty,
      },
      popularity - working.stats.popularity,
    ),
  );
  return { factionApproval, popularity, factionWeights };
}
