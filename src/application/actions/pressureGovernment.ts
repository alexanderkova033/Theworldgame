// Leaning on a neighbor's politics: spends political power and shifts that
// nation's electorate toward the party you back, by an amount set by how
// strong your own government looks (see getPressureStrength) — which can be
// negative, i.e. a weak government's meddling backfires.
import { PRESSURE_POLITICAL_POWER_COST, RELATIONS_BACK_OPPOSITION, RELATIONS_BACK_RULERS } from "../../domain/constants";
import { feel } from "../../domain/neighbours/relationsRules";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { applyPressure, getPressureStrength } from "../../domain/diplomacy/diplomacyRules";
import { getNation } from "../../domain/nations/nationRules";
import { getParty } from "../../domain/parties/partyRules";
import { getModifiers } from "../../domain/policy/policyRules";
import { isFeatureOpen, recordDeed } from "../../domain/chapters/chapterData";

export function canPressureGovernment(state: GameState, nationId: string): boolean {
  return isFeatureOpen(state, "neighbours") && nationId in state.foreignPolitics && state.stats.politicalPower >= PRESSURE_POLITICAL_POWER_COST;
}

export function pressureGovernment(state: GameState, nationId: string, partyId: string): GameState {
  if (!canPressureGovernment(state, nationId)) return state;
  const gov = state.foreignPolitics[nationId];
  if (!(partyId in gov.support)) return state;

  const strength = getPressureStrength(state.stats, getModifiers(state).pressureMultiplier);
  const nation = getNation(nationId);
  const party = getParty(partyId);
  const message =
    strength >= 0
      ? `You lean on ${nation.name} in favour of the ${party.name}: support +${strength}.`
      : `Your meddling in ${nation.name} backfires. A weak government at home makes the ${party.name} look like your puppet (${strength}).`;

  // They notice: backing their rulers pleases them, their opposition doesn't.
  const backsRulers = partyId === gov.rulingPartyId;
  const neighbour = state.neighbours[nationId];
  const neighbours = neighbour
    ? {
        ...state.neighbours,
        [nationId]: feel(
          neighbour,
          backsRulers ? RELATIONS_BACK_RULERS : RELATIONS_BACK_OPPOSITION,
          backsRulers ? `You backed the ${party.name} in power` : `You backed the ${party.name} against their government`,
        ),
      }
    : state.neighbours;
  return recordDeed({
    ...state,
    neighbours,
    stats: { ...state.stats, politicalPower: state.stats.politicalPower - PRESSURE_POLITICAL_POWER_COST },
    foreignPolitics: { ...state.foreignPolitics, [nationId]: applyPressure(gov, partyId, strength) },
    events: [{ id: generateId("event"), date: state.date, message, severity: strength >= 0 ? "info" : "warning", topic: "politics" }, ...state.events],
  }, "pressed");
}
