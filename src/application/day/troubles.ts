// Most months something goes wrong somewhere: a walkout, a scandal, a tax
// collector run out of town. A province's order drops at once, so a strike
// shows on the map, and climbs back as it drifts toward where it stood, unless
// it's already in a bad way. No letter: the player sees it and acts, or doesn't.
import { TROUBLE_FROM_MONTH, TROUBLE_STABILITY_HIT } from "../../domain/constants";
import { isFirstDayOfMonth, monthNumber } from "../../domain/country/calendar";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { getDifficulty } from "../../domain/difficulty/difficultyData";
import { getOwnedProvinceIds, getProvinceName } from "../../domain/provinces/provinceRules";
import { updateUnrestStage } from "../../domain/unrest/unrestRules";

const TROUBLES: Array<(name: string) => string> = [
  (name) => `Workers in ${name} have walked out over pay.`,
  (name) => `Bakers in ${name} have shut their shops over the price of flour.`,
  (name) => `A tax collector has been run out of ${name}.`,
  (name) => `A scandal in ${name}: the governor's ledgers don't add up.`,
  (name) => `Crowds in ${name} are demanding the mayor's dismissal.`,
  (name) => `Pamphlets against the government are all over ${name}.`,
];

export function runTroubles(state: GameState): GameState {
  if (state.isGameOver || !isFirstDayOfMonth(state.date) || monthNumber(state.date) < TROUBLE_FROM_MONTH) return state;
  if (Math.random() >= getDifficulty(state.difficulty).troubleChance) return state;
  const open = getOwnedProvinceIds(state).filter((id) => state.provinces[id] && !state.provinces[id].uprising && !state.provinces[id].crisis);
  if (open.length === 0) return state;
  const id = open[Math.floor(Math.random() * open.length)];
  const p = state.provinces[id];
  const stability = Math.max(0, p.stability - TROUBLE_STABILITY_HIT);
  const message = TROUBLES[Math.floor(Math.random() * TROUBLES.length)](getProvinceName(id));
  return {
    ...state,
    provinces: { ...state.provinces, [id]: { ...p, stability, unrestStage: updateUnrestStage(p.unrestStage, stability) } },
    events: [{ id: generateId("event"), date: state.date, message, severity: "warning", topic: "unrest" }, ...state.events],
  };
}
