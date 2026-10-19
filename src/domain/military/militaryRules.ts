// Regiments on the map: how many a country can keep, how they march, and
// how a computer ruler raises its own.
//
// A regiment marches from a province to one next to it in a few days, and
// sails between a coast and an island in a few weeks (faster between two
// harbours). The way there is the quickest, through places it may enter.
import {
  GARRISON_ORDER,
  GARRISON_ORDER_CAP,
  POPULATION_PER_REGIMENT,
  REGIMENT_MARCH_DAYS,
  REGIMENT_RAISE_COST,
  REGIMENT_SAIL_DAYS,
  REGIMENT_SAIL_DAYS_LINKED,
  REGIMENT_SALARY,
  REGIMENT_TRAINING_DAYS,
} from "../constants";
import { generateId } from "../country/id";
import { isHarbourSite, isIsland } from "../islands/islandRules";
import { getNation } from "../nations/nationRules";
import { getPersonality } from "../neighbours/neighbourData";
import type { Neighbour } from "../neighbours/types";
import { getNeighbours } from "../provinces/provinceNeighbours";
import { MAP_GEOMETRY } from "../provinces/provinceData";
import type { March, Regiment } from "./types";

export function getRegimentCap(population: number): number {
  return Math.floor(population / POPULATION_PER_REGIMENT);
}

// A country's regiments' pay, a day.
export function getArmyPay(regiments: Regiment[], nationId: string): number {
  return regimentsOf(regiments, nationId).length * REGIMENT_SALARY;
}

// A country's garrisons: how many of its regiments stand ready in each
// province (drilled, and not on the march).
export function getGarrisons(regiments: Regiment[], nationId: string): Record<string, number> {
  const garrisons: Record<string, number> = {};
  for (const r of regiments) if (r.nationId === nationId && isReady(r)) garrisons[r.provinceId] = (garrisons[r.provinceId] ?? 0) + 1;
  return garrisons;
}

// The local order a garrison brings.
export function getGarrisonOrder(regiments: number): number {
  return Math.min(GARRISON_ORDER_CAP, regiments) * GARRISON_ORDER;
}

export function newRegiment(nationId: string, provinceId: string): Regiment {
  return { id: generateId("regiment"), nationId, provinceId, strength: 100, trainingDays: REGIMENT_TRAINING_DAYS, march: null };
}

export function isReady(r: Regiment): boolean {
  return r.trainingDays <= 0 && r.march === null;
}

export function regimentsOf(regiments: Regiment[], nationId: string): Regiment[] {
  return regiments.filter((r) => r.nationId === nationId);
}

const COASTS = MAP_GEOMETRY.provinces.filter((p) => isHarbourSite(p.id)).map((p) => p.id);
const ISLAND_IDS = MAP_GEOMETRY.islands.map((i) => i.id);

// Where a regiment can go in one leg, and how long it takes: next door by
// land, or across the sea between a coast and an island.
function legsFrom(provinceId: string, linked: ReadonlySet<string>): Array<[string, number]> {
  const sail = (island: string) => (linked.has(island) ? REGIMENT_SAIL_DAYS_LINKED : REGIMENT_SAIL_DAYS);
  if (isIsland(provinceId)) return COASTS.map((coast) => [coast, sail(provinceId)]);
  const land: Array<[string, number]> = getNeighbours(provinceId).map((id) => [id, REGIMENT_MARCH_DAYS]);
  return isHarbourSite(provinceId) ? [...land, ...ISLAND_IDS.map((island): [string, number] => [island, sail(island)])] : land;
}

// The quickest way from one place to another through places it may enter
// (the start excepted): the provinces to reach, in order, with the days
// each leg takes. Null when there is no way.
export function findRoute(
  from: string,
  to: string,
  canEnter: (provinceId: string) => boolean,
  linkedIslands: ReadonlySet<string> = new Set(),
): Array<{ provinceId: string; days: number }> | null {
  if (from === to || !canEnter(to)) return null;
  const best = new Map<string, number>([[from, 0]]);
  const came = new Map<string, { prev: string; days: number }>();
  const open = new Set([from]);
  while (open.size > 0) {
    const here = [...open].reduce((a, b) => (best.get(a)! <= best.get(b)! ? a : b));
    open.delete(here);
    if (here === to) break;
    for (const [next, days] of legsFrom(here, linkedIslands)) {
      if (!canEnter(next)) continue;
      const total = best.get(here)! + days;
      if (total < (best.get(next) ?? Infinity)) {
        best.set(next, total);
        came.set(next, { prev: here, days });
        open.add(next);
      }
    }
  }
  if (!came.has(to)) return null;
  const route: Array<{ provinceId: string; days: number }> = [];
  for (let at = to; at !== from; at = came.get(at)!.prev) route.unshift({ provinceId: at, days: came.get(at)!.days });
  return route;
}

export function routeDays(route: Array<{ days: number }>): number {
  return route.reduce((sum, leg) => sum + leg.days, 0);
}

// Setting out: the first leg begins. Leg lengths after the first are worked
// out as it reaches each place (see advanceRegiment).
export function startMarch(r: Regiment, route: Array<{ provinceId: string; days: number }>): Regiment {
  if (route.length === 0) return r;
  const march: March = { route: route.map((leg) => leg.provinceId), legDays: route[0].days, daysLeft: route[0].days };
  return { ...r, march };
}

// A day of drill or of marching.
export function advanceRegiment(r: Regiment, linkedIslands: ReadonlySet<string>): Regiment {
  if (r.trainingDays > 0) return { ...r, trainingDays: r.trainingDays - 1 };
  if (!r.march) return r;
  if (r.march.daysLeft > 1) return { ...r, march: { ...r.march, daysLeft: r.march.daysLeft - 1 } };
  // It reaches the next place, and sets out on the leg after.
  const [reached, ...rest] = r.march.route;
  if (rest.length === 0) return { ...r, provinceId: reached, march: null };
  const days = legsFrom(reached, linkedIslands).find(([id]) => id === rest[0])?.[1] ?? REGIMENT_MARCH_DAYS;
  return { ...r, provinceId: reached, march: { route: rest, legDays: days, daysLeft: days } };
}

// A neighbour's ruler keeps a garrison on each island it holds: one
// regiment in peace, more in war. It sends ready regiments from its own
// land by the quickest way, keeping one at home. Returns its regiments,
// with any new marches begun.
export function garrisonIslands(nationId: string, regiments: Regiment[], islands: string[], wanted: number): Regiment[] {
  if (islands.length === 0) return regiments;
  const own = regimentsOf(regiments, nationId);
  const home = new Set(getNation(nationId).provinceIds);
  const canEnter = (id: string) => home.has(id) || islands.includes(id);
  const bound = (r: Regiment) => (r.march ? r.march.route[r.march.route.length - 1] : r.provinceId);
  const spare = own.filter((r) => isReady(r) && home.has(r.provinceId));
  const moving = new Map<string, Regiment>();
  for (const island of islands) {
    let there = own.filter((r) => bound(r) === island).length;
    while (there < wanted && spare.length > 1) {
      const r = spare.shift()!;
      const route = findRoute(r.provinceId, island, canEnter);
      if (!route) continue;
      moving.set(r.id, startMarch(r, route));
      there++;
    }
  }
  return moving.size === 0 ? regiments : regiments.map((r) => moving.get(r.id) ?? r);
}

// A neighbour's ruler keeps a share of the regiments its people could
// support, by temper, and raises one a month while it has fewer and the
// money beyond its reserve. Each new one drills in whichever of its
// provinces has fewest, so they spread along its land.
// At war it keeps all it can, and spends its reserve to.
export function chooseRecruit(n: Neighbour, nationId: string, regiments: Regiment[], atWar = false): { neighbour: Neighbour; recruit: Regiment | null } {
  const own = regimentsOf(regiments, nationId);
  const cap = getRegimentCap(n.population);
  const wanted = atWar ? cap : Math.floor(cap * getPersonality(nationId).martial);
  const reserve = atWar ? 0 : getPersonality(nationId).reserve;
  if (own.length >= wanted || n.treasury - REGIMENT_RAISE_COST < reserve) return { neighbour: n, recruit: null };
  const provinces = getNation(nationId).provinceIds;
  const where = provinces.reduce((a, b) => (own.filter((r) => r.provinceId === b).length < own.filter((r) => r.provinceId === a).length ? b : a));
  return { neighbour: { ...n, treasury: n.treasury - REGIMENT_RAISE_COST }, recruit: newRegiment(nationId, where) };
}
