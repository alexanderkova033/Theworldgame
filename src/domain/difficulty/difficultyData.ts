// How hard a game is, chosen before it starts. Difficulty changes the
// pressure on the player and nothing hidden: every change is listed on the
// start screen in plain words (`changes`). The levels are measured by the
// scripted players in tests/balance.test.ts, so each means something. Out
// of 9 five-year games, a sloppy player (late, never ahead of trouble) and
// a careful one win: Easy 9 and 9, Normal 2 and 9, Hard 0 and 8, Ruthless
// 0 and 2 (measured 2026-10-18; crises since, 2026-10-22, leave Normal at 1
// and 9). Not every country can be saved on
// Ruthless, but some can. A careful player never sees a province rise; a
// sloppy one does in about half its games, more on the harder levels.

export type Difficulty = "easy" | "normal" | "hard" | "ruthless";

export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard", "ruthless"];

export interface DifficultySettings {
  name: string;
  title: string; // what history calls a winner at this level (the end screen)
  summary: string;
  changes: string[]; // every way it differs from Normal, in plain words
  electionThresholds: number[]; // support needed for the first, second and third election
  expectations: number; // points added to where support settles: voters ask more on harder levels
  politicalPowerMultiplier: number; // political power earned each day, against Normal
  startingTreasury: number;
  startingFoodShare: number; // of the usual stores
  rivalSwing: number; // how hard the rival's campaigns hit, against Normal
  rivalChance: number; // how often the rival campaigns, against Normal
  badEventScale: number; // how much a bad world event takes, against Normal
  breakdownMultiplier: number; // how often buildings break down, against Normal
  uprisingRiotDays: number; // days a province riots on its own before it rises (see domain/uprising)
  crisisChance: number; // how often a crisis strikes a province, against Normal (see domain/crises)
  retries: number; // times a lost game can go back to its last checkpoint
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: {
    name: "Easy",
    title: "Steward",
    summary: "Room to learn. Mistakes cost less, and you can go back more often.",
    changes: ["Start with 2,000 Cr", "Elections need 50%, 52%, 54%", "Voters are easy to please: support settles 3 points above neutral", "15% more political power", "The rival campaigns less, and softer", "Bad years take half as much", "Buildings break down half as often", "A province rises only after two months of rioting on its own", "Crises strike half as often", "5 retries from a checkpoint"],
    electionThresholds: [50, 52, 54],
    expectations: 3,
    politicalPowerMultiplier: 1.15,
    startingTreasury: 2000,
    startingFoodShare: 1,
    rivalSwing: 0.6,
    rivalChance: 0.7,
    badEventScale: 0.5,
    breakdownMultiplier: 0.5,
    uprisingRiotDays: 60,
    crisisChance: 0.5,
    retries: 5,
  },
  normal: {
    name: "Normal",
    title: "Minister",
    summary: "The game as designed. A careful player wins.",
    changes: ["Elections need 50%, 54%, 58%", "Voters expect more: support settles 3 points below neutral", "3 retries from a checkpoint"],
    electionThresholds: [50, 54, 58],
    expectations: -3,
    politicalPowerMultiplier: 1,
    startingTreasury: 0,
    startingFoodShare: 1,
    rivalSwing: 1,
    rivalChance: 1,
    badEventScale: 1,
    breakdownMultiplier: 1,
    uprisingRiotDays: 30,
    crisisChance: 1,
    retries: 3,
  },
  hard: {
    name: "Hard",
    title: "Chancellor",
    summary: "A careful player only just wins. Every season counts.",
    changes: ["Elections need 52%, 56%, 60%", "Voters expect a lot: support settles 6 points below neutral", "15% less political power", "The rival campaigns more, and harder", "Bad years take half as much again", "Buildings break down 1.5 times as often", "A province rises after 25 days of rioting on its own", "Crises strike a quarter more often", "1 retry from a checkpoint"],
    electionThresholds: [52, 56, 60],
    expectations: -6,
    politicalPowerMultiplier: 0.85,
    startingTreasury: 0,
    startingFoodShare: 1,
    rivalSwing: 1.3,
    rivalChance: 1.25,
    badEventScale: 1.5,
    breakdownMultiplier: 1.5,
    uprisingRiotDays: 25,
    crisisChance: 1.25,
    retries: 1,
  },
  ruthless: {
    name: "Ruthless",
    title: "Iron Chancellor",
    summary: "Not every country can be saved. Win here and it means something.",
    changes: ["Half the usual food stores", "Elections need 54%, 58%, 62%", "Voters expect even more: support settles 8 points below neutral", "30% less political power", "The rival campaigns often, and hard", "Bad years take twice as much", "Buildings break down twice as often", "A province rises after 20 days of rioting on its own", "Crises strike half as often again", "No retries"],
    electionThresholds: [54, 58, 62],
    expectations: -8,
    politicalPowerMultiplier: 0.7,
    startingTreasury: 0,
    startingFoodShare: 0.5,
    rivalSwing: 1.6,
    rivalChance: 1.5,
    badEventScale: 2,
    breakdownMultiplier: 2,
    uprisingRiotDays: 20,
    crisisChance: 1.5,
    retries: 0,
  },
};

export function getDifficulty(difficulty: Difficulty | undefined): DifficultySettings {
  return DIFFICULTY_SETTINGS[difficulty ?? "normal"];
}
