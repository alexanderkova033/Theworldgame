// Your regiments (see domain/military): raised in the capital, where they
// drill for a month, then marched anywhere in the country, and shipped to
// its islands. A regiment costs a fee to raise and pay every day; standing
// one down saves the pay but not the fee.
import { isFeatureOpen } from "../../domain/chapters/chapterData";
import { REGIMENT_RAISE_COST } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getLinkedIslands } from "../../domain/islands/islandRules";
import { findRoute, getRegimentCap, isReady, newRegiment, regimentsOf, startMarch } from "../../domain/military/militaryRules";
import { getNation } from "../../domain/nations/nationRules";
import { getOwnedProvinceIds } from "../../domain/provinces/provinceRules";
import { recordAction } from "./recordAction";

export function getYourRegiments(state: GameState) {
  return regimentsOf(state.regiments, state.nationId);
}

export function canRaiseRegiment(state: GameState): boolean {
  return (
    isFeatureOpen(state, "army") &&
    state.stats.treasury >= REGIMENT_RAISE_COST &&
    getYourRegiments(state).length < getRegimentCap(state.stats.population)
  );
}

export function raiseRegiment(state: GameState): GameState {
  if (!canRaiseRegiment(state)) return state;
  return recordAction(
    state,
    {
      ...state,
      stats: { ...state.stats, treasury: state.stats.treasury - REGIMENT_RAISE_COST },
      regiments: [...state.regiments, newRegiment(state.nationId, getNation(state.nationId).capitalProvinceId)],
    },
    { treasury: "army" },
  );
}

export function disbandRegiment(state: GameState, regimentId: string): GameState {
  const r = state.regiments.find((x) => x.id === regimentId);
  if (!r || r.nationId !== state.nationId) return state;
  return { ...state, regiments: state.regiments.filter((x) => x.id !== regimentId) };
}

// Where your regiments may go: anywhere that is yours, and the provinces
// that broke away, to take them back.
export function canEnterAsYou(state: GameState): (provinceId: string) => boolean {
  const open = new Set([...getOwnedProvinceIds(state), ...Object.keys(state.freeProvinces)]);
  return (id) => open.has(id);
}

// The way from one of your provinces to another, for the regiments ready there.
export function getMarchRoute(state: GameState, from: string, to: string) {
  return findRoute(from, to, canEnterAsYou(state), getLinkedIslands(state));
}

// Your regiments standing ready in a province: the ones a march order moves.
export function getReadyRegimentsIn(state: GameState, provinceId: string) {
  return getYourRegiments(state).filter((r) => r.provinceId === provinceId && isReady(r));
}

export function canMarch(state: GameState, from: string, to: string): boolean {
  return getReadyRegimentsIn(state, from).length > 0 && getMarchRoute(state, from, to) !== null;
}

// Every regiment ready in a province sets out for another, by the quickest way.
export function marchRegiments(state: GameState, from: string, to: string): GameState {
  const route = getMarchRoute(state, from, to);
  if (!route) return state;
  const moving = new Set(getReadyRegimentsIn(state, from).map((r) => r.id));
  if (moving.size === 0) return state;
  return { ...state, regiments: state.regiments.map((r) => (moving.has(r.id) ? startMarch(r, route) : r)) };
}

// A regiment on the march turns back where it stands: it finishes the leg
// it is on, and stops there.
export function haltRegiments(state: GameState, regimentIds: string[]): GameState {
  const halting = new Set(regimentIds);
  return {
    ...state,
    regiments: state.regiments.map((r) =>
      halting.has(r.id) && r.nationId === state.nationId && r.march ? { ...r, march: { ...r.march, route: r.march.route.slice(0, 1) } } : r,
    ),
  };
}
