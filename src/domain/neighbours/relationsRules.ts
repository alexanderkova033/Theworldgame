// Relations: how each neighbour feels about you, from -100 to 100, and why.
// What you do moves it: backing their opposition or their rulers, beating
// them to an island, driving an island's people out. Feelings fade back
// toward neutral, or toward warm while the party you backed rules them.
//
// It matters. Warm, a neighbour campaigns for you in your elections whoever
// rules it; hostile, it funds your opposition harder and races you for the
// islands out of spite. A player who leaves the neighbours alone stays near
// neutral, so nothing changes for them.
import {
  RELATIONS_FADE_PER_MONTH,
  RELATIONS_FRIENDLY_REST,
  RELATIONS_HOSTILE,
  RELATIONS_WARM,
} from "../constants";
import type { Neighbour } from "./types";

const REMEMBERED = 4; // the few things it remembers you for

export function feel(n: Neighbour, change: number, text: string): Neighbour {
  return {
    ...n,
    relations: Math.max(-100, Math.min(100, n.relations + change)),
    feelings: [{ text, change }, ...n.feelings].slice(0, REMEMBERED),
  };
}

// A month passes: feelings drift a little toward where they rest.
export function fadeFeelings(n: Neighbour, ruledByYourParty: boolean): Neighbour {
  const rest = ruledByYourParty ? RELATIONS_FRIENDLY_REST : 0;
  const step = Math.min(RELATIONS_FADE_PER_MONTH, Math.abs(rest - n.relations));
  return { ...n, relations: n.relations + Math.sign(rest - n.relations) * step };
}

export function isWarm(n: Neighbour | undefined): boolean {
  return (n?.relations ?? 0) >= RELATIONS_WARM;
}

export function isHostile(n: Neighbour | undefined): boolean {
  return (n?.relations ?? 0) <= RELATIONS_HOSTILE;
}

// In a word, for the Neighbours page, on the same lines as what it does:
// Warm campaigns for you, Hostile works against you.
export function relationsWord(relations: number): string {
  if (relations >= RELATIONS_WARM) return "Warm";
  if (relations >= 10) return "Cordial";
  if (relations > -10) return "Indifferent";
  if (relations > RELATIONS_HOSTILE) return "Cool";
  return "Hostile";
}
