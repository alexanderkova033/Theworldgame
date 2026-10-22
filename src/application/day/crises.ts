// The last step of the day: province crises (see domain/crises). One whose
// time is up ends; a fever left alone takes more lives each month and
// reaches a province next door; and on the first of the month, with no
// other letter waiting, one may strike.
import { CRISIS_CHANCE_PER_MONTH, CRISIS_FROM_MONTH, CRISIS_WEIGHTS, FEVER_DEATHS_PER_MONTH, FEVER_FIRST_DEATHS, FEVER_SPREAD_DAYS, FLOOD_FOOD_SHARE, FLOOD_HOMES_SHARE, SEAM_SHAFT_YIELD } from "../../domain/constants";
import { dayNumber, getSeason, isFirstDayOfMonth } from "../../domain/country/calendar";
import { generateId } from "../../domain/country/id";
import type { GameEvent, GameState } from "../../domain/country/types";
import { crisesFor } from "../../domain/crises/crisisRules";
import type { CrisisKind } from "../../domain/crises/types";
import { getHousingCapacityByProvince } from "../../domain/housing/housingRules";
import { getNeighbours } from "../../domain/provinces/provinceNeighbours";
import { getOwnedProvinceIds, getPlace, getProvinceName } from "../../domain/provinces/provinceRules";
import type { PlacedBuilding } from "../../domain/provinces/types";
import { getDifficulty } from "../../domain/difficulty/difficultyData";
import { monthNumber } from "../chapters";

const STRIKE_MESSAGES: Record<CrisisKind, (name: string) => string> = {
  flood: (name) => `The river has burst its banks in ${name}: its farms are under water and many homes are gone.`,
  seam: (name) => `The seam under ${name} is worked out: its pits give no more ore or coal.`,
  felling: (name) => `The forest of ${name} has been felled bare: it gives no more wood.`,
  fever: (name) => `Fever has broken out in the crowded streets of ${name}.`,
  fishing: (name) => `The fish have left the grounds off ${name}: its boats come home empty.`,
};

function event(state: GameState, message: string, severity: GameEvent["severity"]): GameEvent {
  return { id: generateId("event"), date: state.date, message, severity, topic: "crisis" };
}

// A crisis strikes a province: its letter waits, and the game stops for it.
export function strikeCrisis(state: GameState, provinceId: string, kind: CrisisKind): GameState {
  const p = state.provinces[provinceId];
  if (!p || p.crisis) return state;
  let placedBuildings = state.placedBuildings;
  let stats = state.stats;
  let population = p.population;
  let homesLost = 0;
  if (kind === "flood") {
    // Its farms under water, half its homes washed away, and food spoiled.
    const homes = placedBuildings.filter((b) => b.provinceId === provinceId && b.type === "housing");
    homesLost = Math.floor(homes.length * FLOOD_HOMES_SHARE);
    const washed = new Set(homes.slice(0, homesLost).map((b) => b.id));
    placedBuildings = placedBuildings
      .filter((b) => !washed.has(b.id))
      .map((b): PlacedBuilding => (b.provinceId === provinceId && b.type === "farm" && b.condition !== "seized" ? { ...b, condition: "ruined", repairDaysRemaining: undefined } : b));
    stats = { ...stats, food: stats.food * (1 - FLOOD_FOOD_SHARE) };
  }
  if (kind === "fever") {
    const dead = population * FEVER_FIRST_DEATHS;
    population -= dead;
    stats = { ...stats, population: Math.max(0, stats.population - dead) };
  }
  return {
    ...state,
    placedBuildings,
    stats,
    provinces: { ...state.provinces, [provinceId]: { ...p, population, crisis: { kind, since: state.date, answer: null, until: null, yieldShare: kind === "fever" || kind === "flood" ? 1 : 0, homesLost, spread: false } } },
    pendingCrisis: provinceId,
    isPaused: true,
    events: [event(state, STRIKE_MESSAGES[kind](getProvinceName(provinceId)), "danger"), ...state.events],
  };
}

// A crisis whose time is up ends: a flood's farms come back, and its homes
// if it was put right; a shaft sunk gives half the ore again.
function endCrisis(state: GameState, provinceId: string): GameState {
  const p = state.provinces[provinceId];
  const c = p.crisis!;
  let placedBuildings = state.placedBuildings;
  let next = { ...p, crisis: null };
  if (c.kind === "flood") {
    placedBuildings = placedBuildings.map((b) => (b.provinceId === provinceId && b.condition === "ruined" ? { ...b, condition: undefined } : b));
    if (c.answer !== "leave") {
      const homes: PlacedBuilding[] = Array.from({ length: c.homesLost }, () => ({ id: generateId("building"), provinceId, type: "housing" }));
      placedBuildings = [...placedBuildings, ...homes];
    }
    if (c.answer === "dike") next = { ...next, diked: true };
  }
  if (c.kind === "seam" && c.answer === "shaft") next = { ...next, seamYield: SEAM_SHAFT_YIELD };
  const name = getProvinceName(provinceId);
  const ended: Record<CrisisKind, string> = {
    flood: c.answer === "dike" ? `The dike at ${name} stands, its farms are back and its homes rebuilt. It will flood no more.` : c.answer === "rebuild" ? `${name} is rebuilt: its farms are back and its homes stand again.` : `The waters have gone down in ${name}, and its farms are back. Its lost homes were never rebuilt.`,
    seam: `The new shaft at ${name} is sunk: its pits give half the ore and coal they used to.`,
    felling: `The forest of ${name} has grown back: it gives wood again.`,
    fever: `The fever in ${name} has passed.`,
    fishing: `The fish are back off ${name}.`,
  };
  return { ...state, placedBuildings, provinces: { ...state.provinces, [provinceId]: next }, events: [event(state, ended[c.kind], "info"), ...state.events] };
}

export function runCrises(state: GameState): GameState {
  if (state.isGameOver) return state;
  let s = state;
  const today = dayNumber(s.date);
  for (const [id, p] of Object.entries(s.provinces)) {
    const c = p.crisis;
    if (!c || !c.answer) continue;
    if (c.until && today >= dayNumber(c.until)) {
      s = endCrisis(s, id);
      continue;
    }
    if (c.kind !== "fever" || c.answer !== "neglect") continue;
    // A fever left alone: more deaths each month, and next door after a while.
    if (isFirstDayOfMonth(s.date)) {
      const dead = s.provinces[id].population * FEVER_DEATHS_PER_MONTH;
      s = { ...s, stats: { ...s.stats, population: Math.max(0, s.stats.population - dead) }, provinces: { ...s.provinces, [id]: { ...s.provinces[id], population: s.provinces[id].population - dead } } };
    }
    if (!c.spread && !s.pendingCrisis && today - dayNumber(c.since) >= FEVER_SPREAD_DAYS) {
      const next = getNeighbours(id).find((n) => s.provinces[n] && !s.provinces[n].crisis && !s.provinces[n].uprising);
      s = { ...s, provinces: { ...s.provinces, [id]: { ...s.provinces[id], crisis: { ...c, spread: true } } } };
      if (next) s = strikeCrisis(s, next, "fever");
    }
  }
  return rollCrisis(s);
}

// On the first of the month, with no letter waiting, a crisis may strike
// somewhere its land and state lay open to one.
function rollCrisis(s: GameState): GameState {
  if (!isFirstDayOfMonth(s.date) || monthNumber(s.date) < CRISIS_FROM_MONTH) return s;
  const busy = s.pendingCrisis || s.pendingDecisionId || s.pendingDemand || s.pendingOffer || (s.ultimatum && !s.ultimatum.answered) || s.burdenOffer || s.chapters.unread.length > 0;
  if (busy || Math.random() >= CRISIS_CHANCE_PER_MONTH * getDifficulty(s.difficulty).crisisChance) return s;
  const capacity = getHousingCapacityByProvince(s);
  const season = getSeason(s.date);
  const open = getOwnedProvinceIds(s).flatMap((id) => {
    const p = s.provinces[id];
    const terrain = getPlace(id)?.terrain;
    return p && terrain ? crisesFor(p, terrain, capacity[id] ?? 0, season).map((kind) => ({ id, kind })) : [];
  });
  if (open.length === 0) return s;
  // The kind first, by its weight, then where: so the common kinds (every
  // coast can lose its fish) don't crowd out the rare ones.
  const kinds = [...new Set(open.map((o) => o.kind))];
  let roll = Math.random() * kinds.reduce((sum, k) => sum + CRISIS_WEIGHTS[k], 0);
  const kind = kinds.find((k) => (roll -= CRISIS_WEIGHTS[k]) < 0) ?? kinds[kinds.length - 1];
  // A light kind alone is no likelier for having no company.
  if (Math.random() >= CRISIS_WEIGHTS[kind] / Math.max(...Object.values(CRISIS_WEIGHTS))) return s;
  const where = open.filter((o) => o.kind === kind);
  return strikeCrisis(s, where[Math.floor(Math.random() * where.length)].id, kind);
}
