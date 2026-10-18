// Answering a province's letter (see domain/uprising/demandRules.ts). A
// pay rise is granted (wages for a year, a calmer province) or refused (a
// dispute for four months). Rebels' terms are met with an amnesty or a year
// without taxes, either of which ends the uprising in peace, or refused,
// which hardens it. A letter must be answered: there is no putting it aside.
import {
  AMNESTY_POLITICAL_POWER,
  AMNESTY_SUPPORT,
  DEMAND_DISPUTE_DAYS,
  DEMAND_GRANT_STABILITY,
  DEMAND_PAY_RISE_DAYS,
  DEMAND_PAY_RISE_PER_DAY,
  DEMAND_REFUSE_STABILITY,
  REBEL_TERMS_REFUSED_STRENGTH,
  TAX_RELIEF_DAYS,
} from "../../domain/constants";
import { addDays } from "../../domain/country/calendar";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { applyUniformDelta, getFactionWeights } from "../../domain/parties/factionRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import type { ProvinceState } from "../../domain/provinces/types";
import type { DemandAnswer } from "../../domain/uprising/types";
import { endUprising, returnBuildings } from "../../domain/uprising/uprisingRules";
import { ONE_OFF, recordAction } from "./recordAction";

// The answers a letter offers, in the order it shows them.
export function getDemandAnswers(state: GameState): DemandAnswer[] {
  const demand = state.pendingDemand;
  if (!demand) return [];
  return demand.kind === "payRise" ? ["grant", "refuse"] : ["amnesty", "taxRelief", "refuse"];
}

export function canAnswerDemand(state: GameState, answer: DemandAnswer): boolean {
  if (!getDemandAnswers(state).includes(answer)) return false;
  if (answer === "amnesty") return state.stats.politicalPower >= AMNESTY_POLITICAL_POWER;
  return true;
}

export function answerDemand(state: GameState, answer: DemandAnswer): GameState {
  if (!canAnswerDemand(state, answer)) return state;
  const demand = state.pendingDemand!;
  const id = demand.provinceId;
  const name = getProvinceName(id);
  const province = state.provinces[id];
  const today = state.date;
  const weights = getFactionWeights(state.nationId);
  let next: GameState = { ...state, pendingDemand: null };
  let message: string;

  const withProvince = (p: ProvinceState) => ({ ...next.provinces, [id]: p });
  // Terms met: the rebels lay down their arms and the buildings come back.
  const peace = (p: ProvinceState) => {
    next = { ...next, placedBuildings: returnBuildings(next.placedBuildings, id) };
    return endUprising(p, today, false);
  };

  if (answer === "grant") {
    // It pleases the province's own workers, not the whole country.
    next = {
      ...next,
      provinces: withProvince({ ...province, payRiseUntil: addDays(today, DEMAND_PAY_RISE_DAYS), stability: Math.min(100, province.stability + DEMAND_GRANT_STABILITY) }),
    };
    message = `You grant the workers of ${name} their pay rise: ${DEMAND_PAY_RISE_PER_DAY} Cr a day in wages for a year.`;
  } else if (answer === "amnesty") {
    const { factionApproval, popularity } = applyUniformDelta(next.factionApproval, weights, AMNESTY_SUPPORT);
    next = {
      ...next,
      factionApproval,
      stats: { ...next.stats, popularity, politicalPower: next.stats.politicalPower - AMNESTY_POLITICAL_POWER },
    };
    next = { ...next, provinces: withProvince(peace(province)) };
    message = `You pardon the rebels of ${name}, and the uprising is over: support ${AMNESTY_SUPPORT}.`;
  } else if (answer === "taxRelief") {
    next = { ...next, provinces: withProvince({ ...peace(province), taxReliefUntil: addDays(today, TAX_RELIEF_DAYS) }) };
    message = `You promise ${name} a year without taxes, and the uprising is over.`;
  } else if (demand.kind === "payRise") {
    next = {
      ...next,
      provinces: withProvince({ ...province, disputeUntil: addDays(today, DEMAND_DISPUTE_DAYS), stability: Math.max(0, province.stability + DEMAND_REFUSE_STABILITY) }),
    };
    message = `You refuse the workers of ${name} their pay rise. They down tools: a dispute for four months.`;
  } else {
    const uprising = province.uprising!;
    next = { ...next, provinces: withProvince({ ...province, uprising: { ...uprising, strength: Math.min(100, uprising.strength + REBEL_TERMS_REFUSED_STRENGTH) } }) };
    message = `You refuse the rebels of ${name} their terms, and the uprising hardens.`;
  }

  return recordAction(state, {
    ...next,
    events: [{ id: generateId("event"), date: today, message, severity: answer === "refuse" ? "warning" : "info", topic: "uprising" }, ...state.events],
  }, ONE_OFF);
}
