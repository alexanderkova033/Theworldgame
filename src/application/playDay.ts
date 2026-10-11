// Use case: one day of play — the simulation's day, then a check for
// dangers appearing for the first time this season. The first time the
// country slips into strikes or riots, a province riots on its own, the
// homes go cold, the food runs out or debt turns dangerous, the game
// pauses with a notice saying why — once per danger per season, and never
// at 1x speed, where the player is already watching every day.
import { getSeason } from "../domain/country/calendar";
import { generateId } from "../domain/country/id";
import type { GameDate, GameState } from "../domain/country/types";
import { getHeatingDemand } from "../domain/housing/housingRules";
import { isDebtDangerous } from "../domain/loans/loanRules";
import { getProvincesRiotingAlone } from "../domain/provinces/provinceOrder";
import { getProvinceName } from "../domain/provinces/provinceRules";
import { isWorseStage } from "../domain/unrest/unrestRules";
import { simulateDay } from "./simulateDay";

// A season that doesn't split at New Year: December belongs to the winter
// that runs into January and February.
function seasonKey(date: GameDate): string {
  const season = getSeason(date);
  return `${season === "winter" && date.month === 12 ? date.year + 1 : date.year}-${season}`;
}

function isCold(state: GameState): boolean {
  const demand = getHeatingDemand(state, getSeason(state.date));
  return demand > 0 && state.resources.coal + state.resources.wood < demand;
}

// Dangers that appeared between yesterday and today, with why it matters.
function newDangers(before: GameState, after: GameState): Array<{ kind: string; reason: string }> {
  const dangers: Array<{ kind: string; reason: string }> = [];
  if ((after.unrestStage === "strikes" || after.unrestStage === "riots") && isWorseStage(after.unrestStage, before.unrestStage)) {
    dangers.push({ kind: `unrest-${after.unrestStage}`, reason: after.unrestStage === "riots" ? "the country is rioting" : "strikes have broken out" });
  }
  const riotingBefore = getProvincesRiotingAlone(before.provinces, before.unrestStage);
  const newlyRioting = getProvincesRiotingAlone(after.provinces, after.unrestStage).filter((id) => !riotingBefore.includes(id));
  if (newlyRioting.length > 0) dangers.push({ kind: "provinceRiots", reason: `${getProvinceName(newlyRioting[0])} is rioting` });
  if (isCold(after) && !isCold(before)) dangers.push({ kind: "cold", reason: "the homes have run out of coal and wood" });
  if (after.stats.food <= 0 && before.stats.food > 0) dangers.push({ kind: "hunger", reason: "the food has run out" });
  if (isDebtDangerous(after.debt) && !isDebtDangerous(before.debt)) dangers.push({ kind: "debt", reason: "debt is past the danger line" });
  return dangers;
}

export function applyDangerPause(before: GameState, after: GameState): GameState {
  if (after.isGameOver) return after;
  const season = seasonKey(after.date);
  const seen = after.dangerPauses.filter((key) => key.startsWith(`${season}:`)); // last season's are forgotten
  const fresh = newDangers(before, after).filter((d) => !seen.includes(`${season}:${d.kind}`));
  if (fresh.length === 0) return seen.length === after.dangerPauses.length ? after : { ...after, dangerPauses: seen };

  const dangerPauses = [...seen, ...fresh.map((d) => `${season}:${d.kind}`)];
  // At 1x the player sees every day go by: note it, don't stop the clock.
  if (after.speed === 1 || after.isPaused) return { ...after, dangerPauses };
  const reasons = fresh.map((d) => d.reason).join(", and ");
  return {
    ...after,
    dangerPauses,
    isPaused: true,
    events: [
      {
        id: generateId("event"),
        date: after.date,
        message: `Paused: ${reasons}. Resume when you're ready (Space).`,
        severity: "danger",
      },
      ...after.events,
    ],
  };
}

export function playDay(state: GameState): GameState {
  return applyDangerPause(state, simulateDay(state));
}
