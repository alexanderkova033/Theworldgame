// Treaties with the neighbours, proposed from their cards on the Neighbours
// page (see application/actions/treatyActions.ts). How a neighbour feels
// about you decides what it will sign:
//   - an island accord (Cordial or better): it sends no settlers to any
//     island for two years, and thinks better of you for asking;
//   - buying back an island it holds (Warm or better): at a price set by
//     the island's people, and the island is yours, its people with it.
import {
  ACCORD_COST,
  ACCORD_DAYS,
  ACCORD_MIN_RELATIONS,
  BUY_BACK_BASE_PRICE,
  BUY_BACK_MIN_RELATIONS,
  BUY_BACK_PRICE_PER_PERSON,
  SETTLE_PEOPLE,
} from "../constants";
import { addDays, dayNumber } from "../country/calendar";
import type { GameDate } from "../country/types";
import { getIslandData } from "../islands/islandData";
import type { Neighbour } from "./types";

export function hasAccord(n: Neighbour, today: GameDate): boolean {
  return n.accordUntil !== null && dayNumber(today) < dayNumber(n.accordUntil);
}

export function whyNoAccord(n: Neighbour, today: GameDate, treasury: number): string | null {
  if (hasAccord(n, today)) return "An accord already holds.";
  if (n.relations < ACCORD_MIN_RELATIONS) return `They must be at least Cordial (+${ACCORD_MIN_RELATIONS}) to sign.`;
  if (treasury < ACCORD_COST) return `Needs ${ACCORD_COST} Cr.`;
  return null;
}

export function signAccord(n: Neighbour, today: GameDate): Neighbour {
  return { ...n, accordUntil: addDays(today, ACCORD_DAYS) };
}

// The people on an island a neighbour holds: its own, and the settlers it sent.
export function getIslandPeople(islandId: string): number {
  return (getIslandData(islandId)?.locals?.people ?? 0) + SETTLE_PEOPLE;
}

export function getBuyBackPrice(islandId: string): number {
  return BUY_BACK_BASE_PRICE + getIslandPeople(islandId) * BUY_BACK_PRICE_PER_PERSON;
}

export function whyNoBuyBack(n: Neighbour, islandId: string, treasury: number): string | null {
  if (n.relations < BUY_BACK_MIN_RELATIONS) return `They must be Warm (+${BUY_BACK_MIN_RELATIONS}) to sell an island.`;
  if (treasury < getBuyBackPrice(islandId)) return `Needs ${getBuyBackPrice(islandId)} Cr.`;
  return null;
}
