import type { Feature } from "../chapters/chapterData";
import type { ProjectType } from "../construction/types";
import type { GameDate, GameState } from "../country/types";
import type { CrisisKind } from "../crises/types";
import type { Ideology } from "../parties/types";
import type { ModifierEffects } from "../policy/modifiers";

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

// What a story letter's answer does beyond the numbers above (see
// application/storyOutcome.ts): enough to change the country, not just nudge it.
export interface StoryOutcome {
  groups?: Partial<Record<Ideology, number>>; // a group's backing moves by this many points
  politicalPower?: number;
  build?: Array<{ provinceId: string; type: ProjectType; count: number }>; // raised at once, free
  pullDown?: Array<{ provinceId: string; type: ProjectType; count: number }>;
  order?: Array<{ provinceId: string; change: number }>; // its local order, now
  lasting?: { effects: ModifierEffects; days: number; why: string }; // on the whole country, for a while
  rises?: string; // this province rises against the government
  crisis?: { provinceId: string; kind: CrisisKind }; // a crisis strikes there, letter and all
  taxRelief?: { provinceId: string; days: number }; // it pays no taxes for a while
}

export interface DecisionOption {
  id: string;
  label: string;
  effects: DecisionEffects;
  outcome?: StoryOutcome;
}

export interface DecisionDefinition {
  id: string;
  title: string;
  prompt: string; // one short sentence — the popup leads with icons, not paragraphs
  icon: string; // a StatIconType name (or "coal"/"housing") — kept as a plain string so domain/ doesn't depend on presentation/
  options: DecisionOption[]; // two; a story letter may have three
  // Situational decisions come out of how the country is doing (a coal
  // shortage, a housing protest...) and can only fire while this holds —
  // and are picked well ahead of the generic ones when they can (see
  // pickDecision). Decisions without one can fire any time.
  condition?: (state: GameState) => boolean;
  // A letter about a system that arrives in a later chapter (see
  // domain/chapters) waits until that chapter has opened.
  needs?: Feature;
  // A story letter is sent only by its story chapter, never drawn at
  // random, and the choice made on it is remembered (domain/chapters).
  story?: boolean;
}

export interface DecisionHistoryEntry {
  id: string;
  decisionId: string;
  optionId: string;
  date: GameDate;
}
