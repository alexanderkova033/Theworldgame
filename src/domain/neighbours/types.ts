import type { GameDate } from "../country/types";

// A neighbouring nation as a country of its own, run by the computer (see
// neighbourRules.ts). Lighter than the player's: whole-country numbers, no
// provinces, a month at a time.
export interface Neighbour {
  treasury: number;
  population: number;
  food: number;
  stability: number; // 0-100
  farms: number;
  factories: number;
  homes: number;
  lastVoyageMonth: number | null; // when it last sent settlers to an island
  lastDeed: string | null; // what it did last month, in plain words, for the Neighbours page
  relations: number; // -100 to 100: how it feels about you (see relationsRules.ts)
  accordUntil: GameDate | null; // an island accord with you holds until this day (see treatyRules.ts)
  feelings: Feeling[]; // why, the latest first: the few things it remembers you for
}

export interface Feeling {
  text: string; // what you did, in plain words
  change: number; // what it did to how they feel
}

// How a neighbour likes to run its country: what it builds when nothing
// presses, how much it keeps back, and how keen it is on the islands.
export interface Personality {
  temper: string; // a few plain words for the Neighbours page
  grows: "farm" | "factory"; // what it builds when it has idle hands and money to spare
  reserve: number; // Crowns it won't spend below, except for food and homes
  islandAppetite: number; // 0-1: the chance in a month it sends settlers, when it can
  industryBonus: number; // its factories' output, against the usual (Veldoria's early industry)
  order: number; // the stability it settles at while fed and housed (Caldenreich's steady administration)
}
