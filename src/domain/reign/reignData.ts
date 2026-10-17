// How a game is played to its end. Three Terms is the campaign: win three
// elections running and you've won. The Long Reign has no finish line:
// every election won adds a burden of office, there's no going back after
// a loss, and the only measure is how long your party holds power.
import type { ModifierEffects } from "../policy/modifiers";

export type GameMode = "terms" | "long-reign";

export const MODES: GameMode[] = ["terms", "long-reign"];

export const MODE_SETTINGS: Record<GameMode, { name: string; summary: string }> = {
  terms: {
    name: "Three Terms",
    summary: "Win three elections in a row to win the game.",
  },
  "long-reign": {
    name: "Long Reign",
    summary: "No finish line and no retries. Each election you win, you take on a burden of office. How long can your party hold on?",
  },
};

// Burdens: what a government picks up the longer it stays in office. Each
// election won offers two and the player takes one; later wins add a second,
// drawn by chance. Each is permanent, and they stack. Most bend the
// country's rules the same way a law does (ModifierEffects, folded in by
// getModifiers); three act on the voters, the rival and rallies directly.
export type BurdenId =
  | "weary-voters"
  | "rival-machine"
  | "lean-years"
  | "ageing-works"
  | "hard-winters"
  | "growing-appetites"
  | "short-tempers"
  | "stubborn-assembly"
  | "dear-markets"
  | "dear-builders"
  | "bitter-hardship"
  | "crowded-cities"
  | "hollow-rallies";

export interface Burden {
  id: BurdenId;
  name: string;
  flavour: string; // one sentence on why it happens
  effects: ModifierEffects;
  expectations?: number; // added to what voters ask (see the "expectations" support driver)
  rivalSwing?: number; // the rival's campaigns hit this much harder
  rallies?: number; // what a rally or courting a group still lifts, as a share
}

export const BURDENS: Burden[] = [
  {
    id: "weary-voters",
    name: "Weary Voters",
    flavour: "People tire of the same faces in power.",
    effects: {},
    expectations: -2,
  },
  {
    id: "rival-machine",
    name: "The Rival's Machine",
    flavour: "The opposition has money and organisers now.",
    effects: {},
    rivalSwing: 1.3,
  },
  {
    id: "lean-years",
    name: "Lean Years",
    flavour: "Trade slackens across the continent.",
    effects: { incomeMultiplier: 0.93 },
  },
  {
    id: "ageing-works",
    name: "Ageing Works",
    flavour: "What was built in your first term is wearing out.",
    effects: { breakdownMultiplier: 1.4, repairCostMultiplier: 1.2 },
  },
  {
    id: "hard-winters",
    name: "Harder Winters",
    flavour: "The winters are colder than anyone remembers.",
    effects: { heatingMultiplier: 1.2, winterFarmMultiplier: 0.85 },
  },
  {
    id: "growing-appetites",
    name: "Growing Appetites",
    flavour: "A richer country eats more.",
    effects: { foodConsumptionMultiplier: 1.07 },
  },
  {
    id: "short-tempers",
    name: "Short Tempers",
    flavour: "Every tax is now your tax.",
    effects: { taxTolerance: -2 },
  },
  {
    id: "stubborn-assembly",
    name: "A Stubborn Assembly",
    flavour: "Your own benches have ambitions of their own.",
    effects: { politicalPowerMultiplier: 0.85 },
  },
  {
    id: "dear-markets",
    name: "Dear Markets",
    flavour: "Every merchant has heard the treasury is good for it.",
    effects: { buyPriceMultiplier: 1.12 },
  },
  {
    id: "dear-builders",
    name: "Dear Builders",
    flavour: "Contractors have learned what the state will pay.",
    effects: { buildCostMultiplier: 1.15 },
  },
  {
    id: "bitter-hardship",
    name: "Bitter Hardship",
    flavour: "The poor no longer give you the benefit of the doubt.",
    effects: { hardshipMultiplier: 1.2 },
  },
  {
    id: "crowded-cities",
    name: "Crowded Cities",
    flavour: "Families expect more room than their parents had.",
    effects: { housingCapacityMultiplier: 0.94 },
  },
  {
    id: "hollow-rallies",
    name: "Hollow Rallies",
    flavour: "Crowds have heard the speeches before.",
    effects: {},
    rallies: 0.7,
  },
];
