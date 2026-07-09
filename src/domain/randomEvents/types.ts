import type { EventSeverity } from "../country/types";
import type { ResourceType } from "../resources/types";

// Deltas/multipliers only, no functions — a definition is plain data, so
// the whole list can be scanned/tuned at a glance in randomEventData.ts.
export interface RandomEventEffect {
  treasuryMultiplier?: number; // e.g. 1.15 = +15%, 0.85 = -15%
  foodMultiplier?: number;
  populationMultiplier?: number;
  stabilityDelta?: number; // flat, since stability is already a 0-100 scale
  resourceMultipliers?: Partial<Record<ResourceType, number>>;
}

export interface RandomEventDefinition {
  id: string;
  name: string;
  message: string; // flavor text logged to the event log
  severity: EventSeverity;
  effect: RandomEventEffect;
}
