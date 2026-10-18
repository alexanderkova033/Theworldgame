// Uprisings: what a province that riots on its own for too long does (the
// whole country rioting is the nation's trouble instead). It rises against
// the government: its farms, factories, roads, schools and food works are
// seized and work for nobody, it pays no taxes, and it drags national
// stability down twice as hard as a rioting province. Its homes stay its
// people's, so with their work gone many drift to provinces that have some.
//
// Rebel strength (0 to 100) is the one number to watch. Each day it grows a
// little, more with people sleeping rough there; a calm country starves it,
// police hold it down, and militia companies sent in wear it down. At zero
// the uprising is over. One put down by force leaves the province aggrieved
// for half a year: it rises again sooner, and stronger.
//
// Left alone, it spreads: from strength 70 the provinces next door grow
// restless. Held at full strength for a month, it breaks away for good.
import {
  MILITIA_SUPPRESSION_PER_DAY,
  UNREST_EASE_MARGIN,
  UPRISING_BREAKAWAY_DAYS,
  UPRISING_SPREAD_STRENGTH,
  UPRISING_SPREAD_UNREST,
  UNREST_RIOTS_BELOW,
  UPRISING_GRIEVANCE_DAYS,
  UPRISING_AGGRIEVED_START_BONUS,
  UPRISING_CALM_FADE,
  UPRISING_CALM_STABILITY,
  UPRISING_GROWTH_PER_DAY,
  UPRISING_HOMELESS_GROWTH,
  UPRISING_POLICE_DAMPING,
  UPRISING_POLICE_DAMPING_CAP,
  UPRISING_AGGRIEVED_RIOT_SHARE,
  UPRISING_START_STRENGTH,
} from "../constants";
import { addDays, dayNumber } from "../country/calendar";
import type { GameDate } from "../country/types";
import { getNeighbours } from "../provinces/provinceNeighbours";
import type { PlacedBuilding, ProvinceState } from "../provinces/types";
import type { Workforce } from "../workforce/types";
import type { Uprising } from "./types";

export function isAggrieved(province: ProvinceState, today: GameDate): boolean {
  return province.aggrievedUntil !== null && dayNumber(today) < dayNumber(province.aggrievedUntil);
}

// Days of rioting on its own before this province rises: the difficulty's
// number (riotDays), or a third of it while it remembers being put down.
export function getRiotDaysToRise(province: ProvinceState, today: GameDate, riotDays: number): number {
  return isAggrieved(province, today) ? Math.ceil(riotDays * UPRISING_AGGRIEVED_RIOT_SHARE) : riotDays;
}

export function shouldRise(province: ProvinceState, today: GameDate, riotDays: number): boolean {
  return province.uprising === null && province.unrestStage === "riots" && province.riotDays >= getRiotDaysToRise(province, today, riotDays);
}

export function startUprising(province: ProvinceState, today: GameDate): Uprising {
  const strength = UPRISING_START_STRENGTH + (isAggrieved(province, today) ? UPRISING_AGGRIEVED_START_BONUS : 0);
  return { since: today, strength, militia: 0, lastTerms: null, fullSince: null };
}

export interface RebelStrengthChange {
  growth: number; // the uprising feeding itself, and on people sleeping rough
  calm: number; // a calm country starving it (negative)
  police: number; // police holding it down (negative)
  militia: number; // companies sent in wearing it down (negative)
  total: number;
}

// How rebel strength moves in a day, part by part, so the interface can say
// what is feeding it and what is wearing it down.
export function getRebelStrengthChange(uprising: Uprising, homelessShare: number, nationalStability: number, police: number): RebelStrengthChange {
  const growth = UPRISING_GROWTH_PER_DAY + homelessShare * UPRISING_HOMELESS_GROWTH;
  const calm = nationalStability >= UPRISING_CALM_STABILITY ? -UPRISING_CALM_FADE : 0;
  const policeHold = -Math.min(UPRISING_POLICE_DAMPING_CAP, police * UPRISING_POLICE_DAMPING);
  const militia = -uprising.militia * MILITIA_SUPPRESSION_PER_DAY;
  return { growth, calm, police: policeHold, militia, total: growth + calm + policeHold + militia };
}

export function getRisenProvinceIds(provinces: Record<string, ProvinceState>): string[] {
  return Object.entries(provinces)
    .filter(([, p]) => p.uprising !== null)
    .map(([id]) => id);
}

// Homes stay with the people; every other building in the province is held
// by the rebels and works for nobody until the uprising ends.
export function seizeBuildings(placed: PlacedBuilding[], provinceId: string): PlacedBuilding[] {
  return placed.map((b) => (b.provinceId === provinceId && b.type !== "housing" && b.condition === undefined ? { ...b, condition: "seized" } : b));
}

// What the rebels held comes back as it was taken: working.
export function returnBuildings(placed: PlacedBuilding[], provinceId: string): PlacedBuilding[] {
  return placed.map((b) => (b.provinceId === provinceId && b.condition === "seized" ? { ...b, condition: undefined } : b));
}

// An uprising over: the province is back, on strike rather than rioting.
// Put down by force, it remembers; ended any other way, it doesn't.
export function endUprising(province: ProvinceState, today: GameDate, byForce: boolean): ProvinceState {
  return {
    ...province,
    uprising: null,
    riotDays: 0,
    stability: UNREST_RIOTS_BELOW + UNREST_EASE_MARGIN,
    unrestStage: "strikes",
    aggrievedUntil: byForce ? addDays(today, UPRISING_GRIEVANCE_DAYS) : province.aggrievedUntil,
  };
}

// People who pay taxes: everyone but those in a risen province, or one
// whose rebels were given a year without taxes.
export function getTaxedPopulation(provinces: Record<string, ProvinceState>, nationalPopulation: number, today: GameDate): number {
  const untaxed = Object.values(provinces).reduce(
    (sum, p) => sum + (p.uprising || (p.taxReliefUntil !== null && dayNumber(today) < dayNumber(p.taxReliefUntil)) ? p.population : 0),
    0,
  );
  return Math.max(0, nationalPopulation - untaxed);
}

// A strong uprising stirs up the provinces next door: their mood sits this
// far below the nation's while it lasts.
export function getSpreadUnrest(provinces: Record<string, ProvinceState>, provinceId: string): number {
  const stirred = getNeighbours(provinceId).some((id) => (provinces[id]?.uprising?.strength ?? 0) >= UPRISING_SPREAD_STRENGTH);
  return stirred ? UPRISING_SPREAD_UNREST : 0;
}

// Held at full strength long enough, an uprising breaks away. Days left
// before it does, or null while it is short of full strength.
export function getBreakawayDaysLeft(uprising: Uprising, today: GameDate): number | null {
  if (uprising.fullSince === null) return null;
  return Math.max(0, UPRISING_BREAKAWAY_DAYS - (dayNumber(today) - dayNumber(uprising.fullSince)));
}

// Companies not already sent into a province.
export function getFreeMilitia(workforce: Workforce, provinces: Record<string, ProvinceState>): number {
  const sent = Object.values(provinces).reduce((sum, p) => sum + (p.uprising?.militia ?? 0), 0);
  return Math.max(0, workforce.militia - sent);
}

// Fewer companies on the payroll than are sent in (some were let go, or
// walked off unpaid): call back the difference, from the last provinces
// first. Same object back when nothing changes.
export function recallUnpaidMilitia(workforce: Workforce, provinces: Record<string, ProvinceState>): Record<string, ProvinceState> {
  let excess = Object.values(provinces).reduce((sum, p) => sum + (p.uprising?.militia ?? 0), 0) - workforce.militia;
  if (excess <= 0) return provinces;
  const next = { ...provinces };
  for (const id of Object.keys(next).reverse()) {
    const uprising = next[id].uprising;
    if (!uprising || uprising.militia === 0 || excess <= 0) continue;
    const recalled = Math.min(uprising.militia, excess);
    excess -= recalled;
    next[id] = { ...next[id], uprising: { ...uprising, militia: uprising.militia - recalled } };
  }
  return next;
}
