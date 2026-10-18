// The militia: companies raised and paid like the police, and sent into a
// province that has risen to wear its rebels down (see domain/uprising).
// Raising one costs a one-off fee and a daily wage. Sending one in is an
// order: it costs political power, and every group likes it less. A company
// comes home by itself when the uprising it was sent to is over.
import {
  MILITIA_CAP,
  MILITIA_HIRE_COST,
  MILITIA_SEND_POLITICAL_POWER,
  MILITIA_SEND_SUPPORT,
} from "../../domain/constants";
import { isFeatureOpen } from "../../domain/chapters/chapterData";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { applyUniformDelta, getFactionWeights } from "../../domain/parties/factionRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { getFreeMilitia } from "../../domain/uprising/uprisingRules";
import { ONE_OFF, recordAction } from "./recordAction";

export function canRaiseMilitia(state: GameState): boolean {
  return isFeatureOpen(state, "unrest") && state.stats.treasury >= MILITIA_HIRE_COST && state.workforce.militia < MILITIA_CAP;
}

export function raiseMilitia(state: GameState): GameState {
  if (!canRaiseMilitia(state)) return state;
  return recordAction(state, {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - MILITIA_HIRE_COST },
    workforce: { ...state.workforce, militia: state.workforce.militia + 1 },
  }, { treasury: "salaries" });
}

// Only a company at home can be stood down; one sent in comes back first.
export function canDisbandMilitia(state: GameState): boolean {
  return getFreeMilitia(state.workforce, state.provinces) > 0;
}

export function disbandMilitia(state: GameState): GameState {
  if (!canDisbandMilitia(state)) return state;
  return { ...state, workforce: { ...state.workforce, militia: state.workforce.militia - 1 } };
}

export function canSendMilitia(state: GameState, provinceId: string): boolean {
  return (
    state.provinces[provinceId]?.uprising != null &&
    getFreeMilitia(state.workforce, state.provinces) > 0 &&
    state.stats.politicalPower >= MILITIA_SEND_POLITICAL_POWER
  );
}

export function sendMilitia(state: GameState, provinceId: string): GameState {
  if (!canSendMilitia(state, provinceId)) return state;
  const province = state.provinces[provinceId];
  const uprising = province.uprising!;
  const { factionApproval, popularity } = applyUniformDelta(state.factionApproval, getFactionWeights(state.nationId), MILITIA_SEND_SUPPORT);
  return recordAction(state, {
    ...state,
    factionApproval,
    provinces: { ...state.provinces, [provinceId]: { ...province, uprising: { ...uprising, militia: uprising.militia + 1 } } },
    stats: { ...state.stats, popularity, politicalPower: state.stats.politicalPower - MILITIA_SEND_POLITICAL_POWER },
    events: [
      {
        id: generateId("event"),
        date: state.date,
        message: `A militia company marches into ${getProvinceName(provinceId)}: support ${MILITIA_SEND_SUPPORT}.`,
        severity: "warning",
        topic: "uprising",
      },
      ...state.events,
    ],
  }, ONE_OFF);
}

export function canRecallMilitia(state: GameState, provinceId: string): boolean {
  return (state.provinces[provinceId]?.uprising?.militia ?? 0) > 0;
}

export function recallMilitia(state: GameState, provinceId: string): GameState {
  if (!canRecallMilitia(state, provinceId)) return state;
  const province = state.provinces[provinceId];
  const uprising = province.uprising!;
  return { ...state, provinces: { ...state.provinces, [provinceId]: { ...province, uprising: { ...uprising, militia: uprising.militia - 1 } } } };
}
