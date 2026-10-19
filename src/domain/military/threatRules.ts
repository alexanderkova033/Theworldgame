// A neighbour making war on you. Only a hostile one, out of truce, and only
// when its regiments are clearly stronger than the garrison on an island of
// yours: then, on its own dice, it sends an ultimatum first (a letter you
// must answer). Pay, and it is bought off and warms to you; stand firm, and
// its regiments sail when the ultimatum runs out. It wants that one island:
// once it has it, it makes peace.
import { RELATIONS_HOSTILE, THREAT_CHANCE, THREAT_STRENGTH_RATIO } from "../constants";
import type { GameDate } from "../country/types";
import { neighbourDice } from "../neighbours/neighbourRules";
import type { Neighbour } from "../neighbours/types";
import { isReady } from "./militaryRules";
import type { Regiment } from "./types";
import { isInTruce } from "./warRules";

export interface Ultimatum {
  nationId: string;
  islandId: string; // the island it wants
  warOn: GameDate; // when its regiments sail, unless bought off
  answered: boolean; // stood firm: the letter is read, the date stands
}

// What a neighbour could send: its ready regiments' strength, keeping the
// strongest at home.
export function getStrikingStrength(theirs: Regiment[]): number {
  const ready = theirs.filter(isReady).map((r) => r.strength).sort((a, b) => b - a);
  return ready.slice(1).reduce((sum, s) => sum + s, 0);
}

// The island a hostile neighbour would threaten this month, or null. Your
// islands come with the strength of your regiments standing on each.
export function chooseThreat(
  n: Neighbour,
  nationId: string,
  month: number,
  today: GameDate,
  theirs: Regiment[],
  yourIslands: Array<{ islandId: string; garrison: number }>,
): string | null {
  if (n.relations > RELATIONS_HOSTILE || isInTruce(n, today) || yourIslands.length === 0) return null;
  const weakest = yourIslands.reduce((a, b) => (b.garrison < a.garrison ? b : a));
  const striking = getStrikingStrength(theirs);
  if (striking < 100 || striking < weakest.garrison * THREAT_STRENGTH_RATIO) return null;
  return neighbourDice(nationId, month, "threat") < THREAT_CHANCE ? weakest.islandId : null;
}
