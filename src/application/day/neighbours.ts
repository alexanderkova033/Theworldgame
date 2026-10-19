// Step 8b of the day, on the first of each month: the neighbours live a
// month and their computer rulers choose (see domain/neighbours): one thing
// to build, and perhaps settlers for the island nobody holds with the most
// people. Building is quiet (the Neighbours page shows it); a voyage is
// news, and the country is told at once, since it is a race.
import { isFeatureOpen } from "../../domain/chapters/chapterData";
import { RACE_VOYAGE_DAYS, SETTLE_COST } from "../../domain/constants";
import { isFirstDayOfMonth } from "../../domain/country/calendar";
import type { GameDate, GameState } from "../../domain/country/types";
import { pickRaceTarget } from "../../domain/islands/islandRules";
import { chooseBuilding, chooseVoyage, liveMonth } from "../../domain/neighbours/neighbourRules";
import { getNation } from "../../domain/nations/nationRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { fadeFeelings } from "../../domain/neighbours/relationsRules";
import { draftOffer } from "../../domain/neighbours/tradeRules";
import { nationHasPort } from "../../domain/market/marketRules";
import { isFriendly } from "../../domain/diplomacy/diplomacyRules";
import { monthNumber } from "../chapters";
import { log, type Day } from "./dayContext";

export function runNeighbours(day: Day, working: GameState, date: GameDate): Pick<GameState, "neighbours" | "foreignVoyages" | "pendingOffer"> {
  if (!isFirstDayOfMonth(date)) return { neighbours: working.neighbours, foreignVoyages: working.foreignVoyages, pendingOffer: working.pendingOffer };
  const month = monthNumber(date);
  let foreignVoyages = working.foreignVoyages;
  let pendingOffer = working.pendingOffer;
  const neighbours: GameState["neighbours"] = {};
  // A trade offer waits until no other letter does, and the market is open.
  const canOffer = isFeatureOpen(working, "market") && !working.pendingDecisionId && !working.pendingDemand;
  const hasPort = nationHasPort(getNation(working.nationId));

  for (const [nationId, before] of Object.entries(working.neighbours)) {
    // Feelings fade, toward warm while the party you backed rules them.
    const gov = working.foreignPolitics[nationId];
    const faded = fadeFeelings(before, gov ? isFriendly(gov) : false);
    const { neighbour, deed } = chooseBuilding(liveMonth(faded, nationId, date), nationId);
    // The islands are only raced for once the player can answer (ventures open).
    const target = isFeatureOpen(working, "ventures") ? pickRaceTarget({ ...working, foreignVoyages }) : null;
    if (chooseVoyage(neighbour, nationId, month, target)) {
      foreignVoyages = [...foreignVoyages, { nationId, islandId: target!, daysRemaining: RACE_VOYAGE_DAYS, totalDays: RACE_VOYAGE_DAYS }];
      neighbours[nationId] = { ...neighbour, treasury: neighbour.treasury - SETTLE_COST, lastVoyageMonth: month, lastDeed: `Sent settlers to ${getProvinceName(target!)}` };
      log(day, {
        date,
        message: `${getNation(nationId).name}'s settlers sail for ${getProvinceName(target!)}. They land in about ${RACE_VOYAGE_DAYS} days: settle it first to keep it.`,
        severity: "warning",
        topic: "venture",
      });
    } else {
      neighbours[nationId] = { ...neighbour, lastDeed: deed };
    }
    if (canOffer && !pendingOffer) pendingOffer = draftOffer(neighbours[nationId], nationId, month, working.market, hasPort, working.resources);
  }
  return { neighbours, foreignVoyages, pendingOffer };
}
