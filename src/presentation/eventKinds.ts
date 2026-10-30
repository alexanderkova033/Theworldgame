// What an event-log entry is about, and where to go to deal with it,
// shared by the toasts and the event log so both offer the same "Go"
// button. Read from the topic the simulation tags each event with.
import type { EventTopic, GameEvent } from "../domain/country/types";
import { BUDGET, BUILDINGS, MARKET, PEOPLE, REPAIRS, SUPPORT, UNREST, type Destination } from "./navigation";

export interface EventAction extends Destination {
  label: string;
}

export interface EventKind {
  kind: string;
  plural: string; // "3 breakdowns", for folding repeats
  foldable: boolean; // repeats often enough that a run of them reads better as one line
  // Whether it pops up as a notice or only waits in the log: the player's own
  // doings (a choice, a repair) and the seasons never pop up, and political
  // actions (a rally, a sale abroad) only when they went wrong.
  toast: "always" | "warnings" | "never";
  action?: EventAction;
}

const BUY_FOOD: EventAction = { label: "Buy food", ...MARKET };
const BUY_COAL: EventAction = { label: "Buy coal", ...MARKET };
const SEE_BUDGET: EventAction = { label: "Budget", ...BUDGET };
const SEE_PEOPLE: EventAction = { label: "People", ...PEOPLE };
const POLITICS: EventAction = { label: "Politics", ...SUPPORT };
const BUILD: EventAction = { label: "Build", ...BUILDINGS };

const KINDS: Record<Exclude<EventTopic, "paused">, Omit<EventKind, "kind">> = {
  hunger: { plural: "days of food shortage", foldable: true, toast: "always", action: BUY_FOOD },
  cold: { plural: "heating warnings", foldable: true, toast: "always", action: BUY_COAL },
  homes: { plural: "warnings about homes", foldable: true, toast: "always", action: SEE_PEOPLE },
  money: { plural: "money warnings", foldable: true, toast: "always", action: SEE_BUDGET },
  unrest: { plural: "unrest changes", foldable: false, toast: "always", action: { label: "Unrest", ...UNREST } },
  provinceUnrest: { plural: "province unrest", foldable: false, toast: "always", action: SEE_PEOPLE },
  uprising: { plural: "uprisings", foldable: false, toast: "always", action: { label: "Unrest", ...UNREST } },
  army: { plural: "army reports", foldable: false, toast: "always", action: { label: "Army", panel: "army" } },
  politics: { plural: "political actions", foldable: true, toast: "warnings", action: POLITICS },
  elections: { plural: "campaign moves", foldable: true, toast: "always", action: POLITICS },
  laws: { plural: "law votes", foldable: false, toast: "always", action: { label: "Laws", panel: "laws" } },
  research: { plural: "research finished", foldable: false, toast: "always", action: { label: "Research", panel: "research" } },
  decision: { plural: "decisions", foldable: false, toast: "never", action: POLITICS },
  built: { plural: "buildings finished", foldable: true, toast: "always", action: BUILD },
  stall: { plural: "construction stalls", foldable: true, toast: "always", action: BUILD },
  breakdown: { plural: "breakdowns", foldable: true, toast: "always", action: { label: "Repair", ...REPAIRS } },
  repaired: { plural: "repairs finished", foldable: true, toast: "never" },
  venture: { plural: "ventures", foldable: false, toast: "always", action: { label: "Ventures", panel: "ventures" } },
  season: { plural: "seasons", foldable: false, toast: "never" },
  world: { plural: "world events", foldable: false, toast: "always" },
  chapter: { plural: "chapters", foldable: false, toast: "never" },
  crisis: { plural: "crises", foldable: false, toast: "always", action: SEE_PEOPLE },
  trade: { plural: "trade offers", foldable: false, toast: "always", action: { label: "Market", ...MARKET } },
};

const OTHER: EventKind = { kind: "other", plural: "events", foldable: false, toast: "always" };

export function getEventKind(event: GameEvent): EventKind {
  if (!event.topic) return OTHER;
  // A pause is never folded away, and its button goes to whatever stopped the game.
  if (event.topic === "paused") return { kind: "paused", plural: "pauses", foldable: false, toast: "always", action: event.about && event.about !== "paused" ? KINDS[event.about].action : undefined };
  return { kind: event.topic, ...KINDS[event.topic] };
}
