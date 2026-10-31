// A country with none of the mess a real game starts in and none of the wear
// that follows: for tests of one mechanic (an uprising, a pay demand) that need
// a calm place to begin. Normal's other rules hold. Each test file runs on its
// own, so this changes nothing outside the files that import it.
import { startNewGame } from "../../src/application/startNewGame";
import type { GameState } from "../../src/domain/country/types";
import { DIFFICULTY_SETTINGS } from "../../src/domain/difficulty/difficultyData";

Object.assign(DIFFICULTY_SETTINGS.normal, {
  startingBroken: 0,
  startingHomesShare: 1,
  startingDebt: 0,
  startingStability: 60,
  startingSupport: 55,
  startingFoodShare: 1,
  electionThresholds: [50, 54, 58],
  expectations: -3,
  wearPerDay: 0,
  troubleChance: 0,
  breakdownMultiplier: 0, // a broken home in the province under test would change what it shows
  crisisChance: 0.63,
});

export function calmStart(nation: string, party: string): GameState {
  return startNewGame(nation, party, "normal");
}
