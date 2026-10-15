// What an event-log entry is about, and where to go to deal with it,
// shared by the toasts and the event log so both offer the same "Go"
// button. Read from the topic the simulation tags each event with.
import type { EventTopic, GameEvent } from "../domain/country/types";
import { BUDGET, BUILDINGS, MARKET, PEOPLE, SUPPORT, UNREST, type Destination } from "./navigation";

export interface EventAction extends Destination {
  label: string;
}

export interface EventKind {
  kind: string;
  plural: string; // "3 breakdowns", for folding repeats
  foldable: boolean; // repeats often enough that a run of them reads better as one line
  action?: EventAction;
}

const BUY_FOOD: EventAction = { label: "Buy food", ...MARKET };
const BUY_COAL: EventAction = { label: "Buy coal", ...MARKET };
const SEE_BUDGET: EventAction = { label: "Budget", ...BUDGET };
const SEE_PEOPLE: EventAction = { label: "People", ...PEOPLE };
const POLITICS: EventAction = { label: "Politics", ...SUPPORT };
const BUILD: EventAction = { label: "Build", ...BUILDINGS };

const KINDS: Record<Exclude<EventTopic, "paused">, Omit<EventKind, "kind">> = {
  hunger: { plural: "days of food shortage", foldable: true, action: BUY_FOOD },
  cold: { plural: "heating warnings", foldable: true, action: BUY_COAL },
  homes: { plural: "housing warnings", foldable: true, action: SEE_PEOPLE },
  money: { plural: "money warnings", foldable: true, action: SEE_BUDGET },
  unrest: { plural: "unrest changes", foldable: false, action: { label: "Unrest", ...UNREST } },
  provinceUnrest: { plural: "province unrest", foldable: false, action: SEE_PEOPLE },
  politics: { plural: "political actions", foldable: true, action: POLITICS },
  elections: { plural: "campaign moves", foldable: true, action: POLITICS },
  laws: { plural: "law votes", foldable: false, action: { label: "Laws", panel: "laws" } },
  research: { plural: "research finished", foldable: false, action: { label: "Research", panel: "research" } },
  decision: { plural: "decisions", foldable: false, action: POLITICS },
  built: { plural: "buildings finished", foldable: true, action: BUILD },
  stall: { plural: "construction stalls", foldable: true, action: BUILD },
  breakdown: { plural: "breakdowns", foldable: true, action: { ...BUILD, label: "Repair" } },
  repaired: { plural: "repairs finished", foldable: true },
  venture: { plural: "ventures", foldable: false, action: { label: "Ventures", panel: "ventures" } },
  season: { plural: "seasons", foldable: false },
  world: { plural: "world events", foldable: false },
};

const OTHER: EventKind = { kind: "other", plural: "events", foldable: false };

export function getEventKind(event: GameEvent): EventKind {
  if (!event.topic) return OTHER;
  // A pause is never folded away, and its button goes to whatever stopped the game.
  if (event.topic === "paused") return { kind: "paused", plural: "pauses", foldable: false, action: event.about && event.about !== "paused" ? KINDS[event.about].action : undefined };
  return { kind: event.topic, ...KINDS[event.topic] };
}
