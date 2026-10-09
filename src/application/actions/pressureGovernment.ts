// Leaning on a neighbor's politics: spends political power and shifts that
// nation's electorate toward the party you back, by an amount set by how
// strong your own government looks (see getPressureStrength) — which can be
// negative, i.e. a weak government's meddling backfires.
import { PRESSURE_POLITICAL_POWER_COST } from "../../domain/constants";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { applyPressure, getPressureStrength } from "../../domain/diplomacy/diplomacyRules";
import { getNation } from "../../domain/nations/nationRules";
import { getParty } from "../../domain/parties/partyRules";

export function canPressureGovernment(state: GameState, nationId: string): boolean {
  return nationId in state.foreignPolitics && state.stats.politicalPower >= PRESSURE_POLITICAL_POWER_COST;
}

export function pressureGovernment(state: GameState, nationId: string, partyId: string): GameState {
  if (!canPressureGovernment(state, nationId)) return state;
  const gov = state.foreignPolitics[nationId];
  if (!(partyId in gov.support)) return state;

  const strength = getPressureStrength(state.stats);
  const nation = getNation(nationId);
  const party = getParty(partyId);
  const message =
    strength >= 0
      ? `You lean on ${nation.name} in favor of the ${party.name} — support +${strength}.`
      : `Your meddling in ${nation.name} backfires — a weak government at home makes the ${party.name} look like your puppet (${strength}).`;

  return {
    ...state,
    stats: { ...state.stats, politicalPower: state.stats.politicalPower - PRESSURE_POLITICAL_POWER_COST },
    foreignPolitics: { ...state.foreignPolitics, [nationId]: applyPressure(gov, partyId, strength) },
    events: [{ id: generateId("event"), date: state.date, message, severity: strength >= 0 ? "info" : "warning" }, ...state.events],
  };
}
