// Step 1b'' of the day: the race for the islands (see domain/islands). A
// neighbour's ship at sea sails on; one that lands claims its island, unless
// your settlers got there first, and any of yours still bound there turn
// back with half their price. From the third year, on a steady schedule,
// the neighbours take turns setting out for the island nobody holds that
// has the most people, and the country is told at once. No dice are drawn,
// so the race never shifts the luck of anything else in the game.
import { isFeatureOpen } from "../../domain/chapters/chapterData";
import { RACE_EVERY_MONTHS, RACE_FROM_MONTH, RACE_TURNED_BACK_REFUND, RACE_VOYAGE_DAYS } from "../../domain/constants";
import { isFirstDayOfMonth } from "../../domain/country/calendar";
import type { GameState } from "../../domain/country/types";
import { pickRaceTarget } from "../../domain/islands/islandRules";
import { NATIONS } from "../../domain/nations/nationData";
import { getNation } from "../../domain/nations/nationRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { getSettleCost } from "../actions/settlementActions";
import { monthNumber } from "../chapters";
import { log, type Day } from "./dayContext";

export function runTheRace(day: Day, state: GameState): GameState {
  const date = day.start.date;
  let working = state;

  // Ships at sea sail on, and one that lands claims its island.
  const sailing = working.foreignVoyages.map((v) => ({ ...v, daysRemaining: v.daysRemaining - 1 }));
  working = { ...working, foreignVoyages: sailing.filter((v) => v.daysRemaining > 0) };
  for (const landed of sailing.filter((v) => v.daysRemaining <= 0)) {
    const nation = getNation(landed.nationId).name;
    const island = getProvinceName(landed.islandId);
    if (working.settledIslandIds.includes(landed.islandId)) {
      log(day, { date, message: `${nation}'s settlers reach ${island}, find it already yours, and turn back.`, severity: "info", topic: "venture" });
      continue;
    }
    // Yours still at sea turn back, with half what they cost (booked with
    // the day's events, by the buildings step that runs this).
    const beaten = working.settlements.filter((s) => s.islandId === landed.islandId);
    const refund = beaten.reduce((sum, s) => sum + getSettleCost(s.terms) * RACE_TURNED_BACK_REFUND, 0);
    working = {
      ...working,
      foreignIslands: { ...working.foreignIslands, [landed.islandId]: landed.nationId },
      settlements: working.settlements.filter((s) => s.islandId !== landed.islandId),
      stats: { ...working.stats, treasury: working.stats.treasury + refund },
    };
    log(day, {
      date,
      message: `${nation} has claimed ${island}.${beaten.length > 0 ? " Your settlers, still at sea, turn back, and half what they cost is refunded." : ""}`,
      severity: "warning",
      topic: "venture",
    });
  }

  // On schedule, the next neighbour in turn sets out.
  const month = monthNumber(date);
  if (
    isFeatureOpen(working, "ventures") &&
    isFirstDayOfMonth(date) &&
    month >= RACE_FROM_MONTH &&
    (month - RACE_FROM_MONTH) % RACE_EVERY_MONTHS === 0
  ) {
    const target = pickRaceTarget(working);
    const rivals = NATIONS.filter((n) => n.id !== working.nationId);
    if (target && rivals.length > 0) {
      const rival = rivals[((month - RACE_FROM_MONTH) / RACE_EVERY_MONTHS) % rivals.length];
      working = {
        ...working,
        foreignVoyages: [...working.foreignVoyages, { nationId: rival.id, islandId: target, daysRemaining: RACE_VOYAGE_DAYS, totalDays: RACE_VOYAGE_DAYS }],
      };
      log(day, {
        date,
        message: `${rival.name}'s settlers sail for ${getProvinceName(target)}. They land in about ${RACE_VOYAGE_DAYS} days: settle it first to keep it.`,
        severity: "warning",
        topic: "venture",
      });
    }
  }
  return working;
}
