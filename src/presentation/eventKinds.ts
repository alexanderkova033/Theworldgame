// What an event-log message is about, and where to go to deal with it —
// shared by the toasts and the event log, so both offer the same "Go"
// button. Classified from the message text the simulation writes.
import type { EconomySection, PanelKey } from "./navigation";
import type { GameEvent } from "../domain/country/types";

export interface EventAction {
  label: string;
  panel: PanelKey;
  section?: EconomySection;
}

export interface EventKind {
  kind: string;
  plural: string; // "3 breakdowns" — for folding repeats
  foldable: boolean; // repeats often enough that a run of them reads better as one line
  action?: EventAction;
}

const RULES: Array<{ test: RegExp; kind: EventKind }> = [
  // A danger pause (see application/playDay.ts): the button goes to the fix.
  { test: /^Paused: .*food has run out/, kind: { kind: "paused", plural: "pauses", foldable: false, action: { label: "Buy food", panel: "trade" } } },
  { test: /^Paused: .*out of coal/, kind: { kind: "paused", plural: "pauses", foldable: false, action: { label: "Buy coal", panel: "trade" } } },
  { test: /^Paused: .*debt is past/, kind: { kind: "paused", plural: "pauses", foldable: false, action: { label: "Budget", panel: "economy", section: "budget" } } },
  { test: /^Paused: (strikes|the country)/, kind: { kind: "paused", plural: "pauses", foldable: false, action: { label: "Politics", panel: "politics" } } },
  { test: /^Paused: .* is rioting/, kind: { kind: "paused", plural: "pauses", foldable: false, action: { label: "People", panel: "economy", section: "people" } } },
  { test: /has broken down/, kind: { kind: "breakdown", plural: "breakdowns", foldable: true, action: { label: "Repair", panel: "economy", section: "build" } } },
  { test: /is repaired and back in service/, kind: { kind: "repaired", plural: "repairs finished", foldable: true } },
  { test: /construction (has stalled|resumes)/, kind: { kind: "stall", plural: "construction stalls", foldable: true, action: { label: "Build", panel: "economy", section: "build" } } },
  { test: /construction complete/, kind: { kind: "built", plural: "buildings finished", foldable: true, action: { label: "Build", panel: "economy", section: "build" } } },
  { test: /^(Riots|Strikes) in |riots in .* die down/, kind: { kind: "provinceUnrest", plural: "province unrest", foldable: false, action: { label: "People", panel: "economy", section: "people" } } },
  { test: /sleeping rough|homes are full/i, kind: { kind: "homes", plural: "housing warnings", foldable: true, action: { label: "People", panel: "economy", section: "people" } } },
  { test: /No coal or wood/, kind: { kind: "cold", plural: "heating warnings", foldable: true, action: { label: "Buy coal", panel: "trade" } } },
  { test: /Food shortage/, kind: { kind: "hunger", plural: "days of food shortage", foldable: true, action: { label: "Buy food", panel: "trade" } } },
  { test: /Debt has grown dangerous|walk off the job/, kind: { kind: "money", plural: "money warnings", foldable: true, action: { label: "Budget", panel: "economy", section: "budget" } } },
  { test: /^(Discontent|Strikes!|Riots!|The country is calm|The strikes end|The riots die down)/, kind: { kind: "unrest", plural: "unrest changes", foldable: false, action: { label: "Politics", panel: "politics" } } },
  { test: /crackdown|rally|court the/i, kind: { kind: "politics", plural: "political actions", foldable: true, action: { label: "Politics", panel: "politics" } } },
  { test: /general election|campaigns|funding your opposition|changes government/, kind: { kind: "elections", plural: "campaign moves", foldable: true, action: { label: "Politics", panel: "politics" } } },
  { test: /is complete[:,] /, kind: { kind: "research", plural: "research finished", foldable: false, action: { label: "Research", panel: "research" } } },
  { test: /passes the vote|comes into force|fails to pass/, kind: { kind: "laws", plural: "law votes", foldable: false, action: { label: "Laws", panel: "laws" } } },
  { test: /^Venture to /, kind: { kind: "venture", plural: "ventures", foldable: false, action: { label: "Ventures", panel: "ventures" } } },
  { test: /: chose to "/, kind: { kind: "decision", plural: "decisions", foldable: false, action: { label: "Politics", panel: "politics" } } },
];

const OTHER: EventKind = { kind: "other", plural: "events", foldable: false };

export function getEventKind(event: GameEvent): EventKind {
  return RULES.find((rule) => rule.test.test(event.message))?.kind ?? OTHER;
}
