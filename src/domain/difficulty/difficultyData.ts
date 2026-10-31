// How hard a game is, chosen before it starts. Difficulty changes the
// pressure on the player and nothing hidden: every change is listed on the
// start screen in plain words (`changes`). The levels are measured by the
// scripted players in tests/balance.test.ts, so each means something. Out
// of 27 five-year games, a sloppy player (late, never ahead of trouble) and
// a careful one win: Easy 15 and 27, Normal 4 and 26, Hard 0 and 13,
// Ruthless 0 and 3 (measured 2026-10-31). The scripted players build none of
// the larger buildings, mines or sawmills, so a good human player should do
// better. Not every country can be saved on Ruthless, but some can.

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
    changes: ["Start with 1,500 Cr", "Elections need 50%, 53%, 56%", "Voters are easy to please: support settles 1 point above neutral", "15% more political power", "The rival campaigns less, and softer", "Bad years take half as much", "Buildings break down a quarter as often", "A province rises only after two months of rioting on its own", "Crises strike half as often", "5 retries from a checkpoint"],
    electionThresholds: [50, 53, 56],
    expectations: 1,
    politicalPowerMultiplier: 1.15,
    startingTreasury: 1500,
    startingFoodShare: 1,
    rivalSwing: 0.6,
    rivalChance: 0.7,
    badEventScale: 0.5,
    breakdownMultiplier: 0.25,
    uprisingRiotDays: 60,
    crisisChance: 0.5,
    retries: 5,
  },
  normal: {
    name: "Normal",
    title: "Minister",
    summary: "The game as designed. A careful player wins.",
    changes: ["Elections need 52%, 56%, 60%", "Voters expect more: support settles 5 points below neutral", "10% less political power", "A tenth less of the usual food in store", "3 retries from a checkpoint"],
    electionThresholds: [52, 56, 60],
    expectations: -5,
    politicalPowerMultiplier: 0.9,
    startingTreasury: 0,
    startingFoodShare: 0.9,
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
    summary: "A careful player wins about half the time. Every season counts.",
    changes: ["A third less of the usual food in store", "Elections need 54%, 58%, 62%", "Voters expect a lot: support settles 8 points below neutral", "25% less political power", "The rival campaigns more, and harder", "Bad years take half as much again", "Buildings break down 1.5 times as often", "A province rises after 25 days of rioting on its own", "Crises strike a quarter more often", "1 retry from a checkpoint"],
    electionThresholds: [54, 58, 62],
    expectations: -8,
    politicalPowerMultiplier: 0.75,
    startingTreasury: 0,
    startingFoodShare: 0.67,
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
    changes: ["Half the usual food stores", "Elections need 56%, 59%, 62%", "Voters expect even more: support settles 9 points below neutral", "35% less political power", "The rival campaigns often, and hard", "Bad years take twice as much", "Buildings break down twice as often", "A province rises after 20 days of rioting on its own", "Crises strike half as often again", "No retries"],
    electionThresholds: [56, 59, 62],
    expectations: -9,
    politicalPowerMultiplier: 0.65,
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
