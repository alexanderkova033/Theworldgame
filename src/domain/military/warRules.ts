// War with a neighbour, fought only over the islands. You declare it, for
// political power and some support, against a neighbour holding an island;
// it turns them hostile and ends any accord. While it lasts your regiments
// may land on their islands (battleRules.ts: a battle with the garrison,
// then a siege), trade with them stops, and every month of it costs
// support. Peace keeps what each side holds, and a truce follows.
import { WAR_POLITICAL_POWER } from "../constants";
import { dayNumber } from "../country/calendar";
import type { GameDate } from "../country/types";
import type { Neighbour } from "../neighbours/types";

export interface War {
  since: GameDate;
  byThem?: string; // they declared it, for this island of yours (threatRules.ts); else you did
}

export function isInTruce(n: Neighbour, today: GameDate): boolean {
  return n.truceUntil !== null && dayNumber(today) < dayNumber(n.truceUntil);
}

// Why war can't be declared on them today, or null when it can.
export function whyNoWar(
  n: Neighbour | undefined,
  today: GameDate,
  atWar: boolean,
  holdsIsland: boolean,
  politicalPower: number,
): string | null {
  if (!n) return "No such neighbour.";
  if (atWar) return "Already at war.";
  if (isInTruce(n, today)) return "A truce holds.";
  if (!holdsIsland) return "They hold no island to fight over.";
  if (politicalPower < WAR_POLITICAL_POWER) return `Needs ${WAR_POLITICAL_POWER} political power.`;
  return null;
}
