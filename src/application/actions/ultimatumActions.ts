// Answering a neighbour's ultimatum (see domain/military/threatRules.ts):
// pay, and it is bought off and warms to you; stand firm, and its regiments
// sail for the island when the ultimatum runs out.
import { RELATIONS_TRIBUTE, TRIBUTE } from "../../domain/constants";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { getNation } from "../../domain/nations/nationRules";
import { feel } from "../../domain/neighbours/relationsRules";
import { formatDate } from "../../domain/country/calendar";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { recordAction } from "./recordAction";

export function canPayTribute(state: GameState): boolean {
  return !!state.ultimatum && !state.ultimatum.answered && state.stats.treasury >= TRIBUTE;
}

export function payTribute(state: GameState): GameState {
  if (!canPayTribute(state)) return state;
  const { nationId } = state.ultimatum!;
  const n = state.neighbours[nationId];
  const name = getNation(nationId).name;
  return recordAction(
    state,
    {
      ...state,
      ultimatum: null,
      stats: { ...state.stats, treasury: state.stats.treasury - TRIBUTE },
      neighbours: { ...state.neighbours, [nationId]: feel({ ...n, treasury: n.treasury + TRIBUTE }, RELATIONS_TRIBUTE, "You paid them off") },
      events: [{ id: generateId("event"), date: state.date, message: `You pay ${name} ${TRIBUTE} Cr, and its regiments stand down.`, severity: "info", topic: "army" }, ...state.events],
    },
    { treasury: "oneOffs" },
  );
}

export function standFirm(state: GameState): GameState {
  const u = state.ultimatum;
  if (!u || u.answered) return state;
  const name = getNation(u.nationId).name;
  return {
    ...state,
    ultimatum: { ...u, answered: true },
    events: [
      {
        id: generateId("event"),
        date: state.date,
        message: `You refuse ${name}. Its regiments will sail for ${getProvinceName(u.islandId)} on ${formatDate(u.warOn)}: look to the garrison there.`,
        severity: "warning",
        topic: "army",
      },
      ...state.events,
    ],
  };
}
