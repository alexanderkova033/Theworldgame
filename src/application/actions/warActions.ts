// Declaring war on a neighbour, and making peace (see
// domain/military/warRules.ts). War is declared from the Army window, for
// political power and some support; it turns them hostile and ends any
// accord. Peace can be made at any time: each side keeps what it holds, any
// regiments of yours on their islands come home, and a truce follows.
import { RELATIONS_HOSTILE, RELATIONS_WAR_ALARM, TRUCE_DAYS, WAR_DECLARE_SUPPORT, WAR_POLITICAL_POWER, WAR_RELATIONS } from "../../domain/constants";
import { addDays } from "../../domain/country/calendar";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { whyNoWar } from "../../domain/military/warRules";
import { getNation } from "../../domain/nations/nationRules";
import { applyUniformDelta, getFactionWeights } from "../../domain/parties/factionRules";
import { feel } from "../../domain/neighbours/relationsRules";
import { recordAction } from "./recordAction";

export function holdsIsland(state: GameState, nationId: string): boolean {
  return Object.values(state.foreignIslands).includes(nationId);
}

export function whyNoWarWith(state: GameState, nationId: string): string | null {
  return whyNoWar(state.neighbours[nationId], state.date, !!state.wars[nationId], holdsIsland(state, nationId), state.stats.politicalPower);
}

export function canDeclareWar(state: GameState, nationId: string): boolean {
  return whyNoWarWith(state, nationId) === null;
}

export function declareWar(state: GameState, nationId: string): GameState {
  if (!canDeclareWar(state, nationId)) return state;
  const n = state.neighbours[nationId];
  const name = getNation(nationId).name;
  const { factionApproval, popularity } = applyUniformDelta(state.factionApproval, getFactionWeights(state.nationId), WAR_DECLARE_SUPPORT);
  // However they felt, they are your enemy now.
  const hostile = feel({ ...n, accordUntil: null }, Math.min(0, WAR_RELATIONS - n.relations), "You declared war on them");
  // The others take note.
  const alarmed = Object.fromEntries(
    Object.entries(state.neighbours).map(([id, other]) => [id, id === nationId ? hostile : feel(other, RELATIONS_WAR_ALARM, `You made war on ${name}`)]),
  );
  return recordAction(
    state,
    {
      ...state,
      wars: { ...state.wars, [nationId]: { since: state.date } },
      neighbours: alarmed,
      factionApproval,
      stats: { ...state.stats, politicalPower: state.stats.politicalPower - WAR_POLITICAL_POWER, popularity },
      pendingOffer: state.pendingOffer?.nationId === nationId ? null : state.pendingOffer,
      events: [
        { id: generateId("event"), date: state.date, message: `You declare war on ${name}! Your regiments may now land on the islands it holds.`, severity: "warning", topic: "army" },
        ...state.events,
      ],
    },
    { support: "war" },
  );
}

export function canMakePeace(state: GameState, nationId: string): boolean {
  return !!state.wars[nationId];
}

export function makePeace(state: GameState, nationId: string): GameState {
  if (!canMakePeace(state, nationId)) return state;
  const n = state.neighbours[nationId];
  const name = getNation(nationId).name;
  const wars = { ...state.wars };
  delete wars[nationId];
  // Your regiments on their islands come home, to the capital.
  const theirIslands = new Set(Object.keys(state.foreignIslands).filter((id) => state.foreignIslands[id] === nationId));
  const capital = getNation(state.nationId).capitalProvinceId;
  const regiments = state.regiments.map((r) =>
    r.nationId === state.nationId && (theirIslands.has(r.provinceId) || r.march?.route.some((id) => theirIslands.has(id))) ? { ...r, provinceId: capital, march: null } : r,
  );
  const sieges = Object.fromEntries(Object.entries(state.sieges).filter(([id]) => !theirIslands.has(id)));
  return {
    ...state,
    wars,
    sieges,
    regiments,
    neighbours: { ...state.neighbours, [nationId]: { ...n, relations: Math.min(n.relations, RELATIONS_HOSTILE), truceUntil: addDays(state.date, TRUCE_DAYS) } },
    events: [
      { id: generateId("event"), date: state.date, message: `Peace with ${name}. Each side keeps what it holds, and there will be no war between you for a year.`, severity: "info", topic: "army" },
      ...state.events,
    ],
  };
}
