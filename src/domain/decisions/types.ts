import type { GameDate, GameState } from "../country/types";

// Political decisions: unlike laws (deliberate, tree-gated) or random world
// events (automatic, no choice), a decision pops up unpredictably and
// forces an immediate pick between two short-term options — see
// decisionRules.ts for the trigger and simulateDay.ts for where it fires.
export interface DecisionEffects {
  treasuryDelta?: number;
  foodDelta?: number;
  stabilityDelta?: number;
  populationDelta?: number;
  popularityDelta?: number;
}

export interface DecisionOption {
  id: string;
  label: string;
  effects: DecisionEffects;
}

export interface DecisionDefinition {
  id: string;
  title: string;
  prompt: string; // one short sentence — the popup leads with icons, not paragraphs
  icon: string; // a StatIconType name (or "coal"/"housing") — kept as a plain string so domain/ doesn't depend on presentation/
  options: DecisionOption[]; // always exactly two
  // Situational decisions come out of how the country is doing (a coal
  // shortage, a housing protest...) and can only fire while this holds —
  // and are picked well ahead of the generic ones when they can (see
  // pickDecision). Decisions without one can fire any time.
  condition?: (state: GameState) => boolean;
}

export interface DecisionHistoryEntry {
  id: string;
  decisionId: string;
  optionId: string;
  date: GameDate;
}
