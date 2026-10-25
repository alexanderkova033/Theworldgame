// Answering a province's crisis letter (see domain/crises). Every answer is
// paid there and then; most set how long the crisis lasts, and a few end it
// at once (a worked-out seam whose works are retooled, or whose pits close).
import {
  CRISIS_QUIET_DAYS,
  FELLING_DAYS,
  FELLING_REPLANT_DAYS,
  FEVER_DOCTORS_DAYS,
  FEVER_LEFT_DAYS,
  FEVER_QUARANTINE_DAYS,
  FISHING_BOATS_YIELD,
  FISHING_DAYS,
  FLOOD_DIKE_DAYS,
  FLOOD_LEFT_DAYS,
  FLOOD_REBUILD_DAYS,
  SEAM_SHAFT_DAYS,
} from "../../domain/constants";
import { addDays } from "../../domain/country/calendar";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { CRISIS_ANSWERS, getAnswerCost } from "../../domain/crises/crisisRules";
import type { Crisis, CrisisAnswer } from "../../domain/crises/types";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { ONE_OFF, recordAction } from "./recordAction";

export function getCrisisAnswers(state: GameState): CrisisAnswer[] {
  const crisis = state.pendingCrisis ? state.provinces[state.pendingCrisis]?.crisis : null;
  return crisis && !crisis.answer ? CRISIS_ANSWERS[crisis.kind] : [];
}

export function canAnswerCrisis(state: GameState, answer: CrisisAnswer): boolean {
  if (!getCrisisAnswers(state).includes(answer)) return false;
  const cost = getAnswerCost(answer);
  return state.stats.treasury >= cost.treasury && state.resources.wood >= cost.wood;
}

// How long each answer leaves the crisis to run, and what share of the
// province's goods comes in meanwhile.
const RUNS: Partial<Record<CrisisAnswer, { days: number; yieldShare?: number }>> = {
  dike: { days: FLOOD_DIKE_DAYS },
  rebuild: { days: FLOOD_REBUILD_DAYS },
  leave: { days: FLOOD_LEFT_DAYS },
  shaft: { days: SEAM_SHAFT_DAYS },
  replant: { days: FELLING_REPLANT_DAYS },
  regrow: { days: FELLING_DAYS },
  doctors: { days: FEVER_DOCTORS_DAYS },
  quarantine: { days: FEVER_QUARANTINE_DAYS },
  neglect: { days: FEVER_LEFT_DAYS },
  boats: { days: FISHING_DAYS, yieldShare: FISHING_BOATS_YIELD },
  wait: { days: FISHING_DAYS },
};

const SAID: Record<CrisisAnswer, (name: string) => string> = {
  dike: (name) => `Work begins on a dike at ${name}.`,
  rebuild: (name) => `${name} is to be rebuilt as it was.`,
  leave: (name) => `${name} is left to rebuild by itself.`,
  shaft: (name) => `A deeper shaft is to be sunk at ${name}.`,
  retool: (name) => `The works at ${name} are retooled and stay open, though its pits are empty.`,
  close: (name) => `The pits at ${name} close, and with them a works: its people go looking for work.`,
  replant: (name) => `The forest of ${name} is replanted.`,
  regrow: (name) => `The forest of ${name} is left to grow back by itself.`,
  doctors: (name) => `Doctors are sent to ${name}.`,
  quarantine: (name) => `${name} is shut in until the fever passes.`,
  neglect: (name) => `The fever in ${name} is left to run its course.`,
  boats: (name) => `The boats of ${name} sail further out for their catch.`,
  wait: (name) => `${name} waits for the fish to come back.`,
};

export function answerCrisis(state: GameState, answer: CrisisAnswer): GameState {
  if (!canAnswerCrisis(state, answer)) return state;
  const id = state.pendingCrisis!;
  const province = state.provinces[id];
  const crisis = province.crisis!;
  const cost = getAnswerCost(answer);
  let next: GameState = {
    ...state,
    pendingCrisis: null,
    stats: { ...state.stats, treasury: state.stats.treasury - cost.treasury },
    resources: { ...state.resources, wood: state.resources.wood - cost.wood },
  };

  const run = RUNS[answer];
  if (run) {
    const answered: Crisis = { ...crisis, answer, until: addDays(state.date, run.days), yieldShare: run.yieldShare ?? crisis.yieldShare };
    next = { ...next, provinces: { ...next.provinces, [id]: { ...province, crisis: answered } } };
  } else {
    // The seam is worked out for good: retooled, its works stay open; closed, one shuts.
    const works = answer === "close" ? next.placedBuildings.find((b) => b.provinceId === id && b.type === "factory") : undefined;
    next = {
      ...next,
      placedBuildings: works ? next.placedBuildings.filter((b) => b !== works) : next.placedBuildings,
      factoryCount: works ? next.factoryCount - 1 : next.factoryCount,
      provinces: { ...next.provinces, [id]: { ...province, crisis: null, seamYield: 0 } },
      crisisQuietUntil: addDays(state.date, CRISIS_QUIET_DAYS),
    };
  }

  return recordAction(
    state,
    { ...next, events: [{ id: generateId("event"), date: state.date, message: SAID[answer](getProvinceName(id)), severity: "info", topic: "crisis" }, ...state.events] },
    ONE_OFF,
  );
}
