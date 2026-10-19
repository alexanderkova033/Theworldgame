// Step 1b'' of the day: the race for the islands (see domain/islands). A
// neighbour's ship at sea sails on; one that lands claims its island for
// that country, unless your settlers got there first, and any of yours
// still bound there turn back with half their price. When a neighbour sets
// out is its own ruler's choice, made with the rest of its month (see
// day/neighbours.ts).
import { RACE_TURNED_BACK_REFUND, RELATIONS_BEATEN_TO_ISLAND } from "../../domain/constants";
import { feel } from "../../domain/neighbours/relationsRules";
import type { GameState } from "../../domain/country/types";
import { getIslandData } from "../../domain/islands/islandData";
import { getNation } from "../../domain/nations/nationRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { getSettleCost } from "../actions/settlementActions";
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
      const loser = working.neighbours[landed.nationId];
      if (loser) {
        working = {
          ...working,
          neighbours: { ...working.neighbours, [landed.nationId]: feel(loser, RELATIONS_BEATEN_TO_ISLAND, `Your settlers beat theirs to ${island}`) },
        };
      }
      log(day, { date, message: `${nation}'s settlers reach ${island}, find it already yours, and turn back. ${nation} won't forget it.`, severity: "info", topic: "venture" });
      continue;
    }
    // Yours still at sea turn back, with half what they cost (booked with
    // the day's events, by the buildings step that runs this).
    const beaten = working.settlements.filter((s) => s.islandId === landed.islandId);
    const refund = beaten.reduce((sum, s) => sum + getSettleCost(s.terms) * RACE_TURNED_BACK_REFUND, 0);
    // The island joins their country: its people, and homes for them.
    const holder = working.neighbours[landed.nationId];
    const locals = getIslandData(landed.islandId)?.locals?.people ?? 0;
    working = {
      ...working,
      neighbours: holder ? { ...working.neighbours, [landed.nationId]: { ...holder, population: holder.population + locals, homes: holder.homes + 1 } } : working.neighbours,
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

  return working;
}
