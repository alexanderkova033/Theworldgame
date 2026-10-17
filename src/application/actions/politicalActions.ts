// Spending political power directly on the country's mood: a rally lifts
// every group a little, courting one group lifts it a lot, and a crackdown
// buys order at the cost of goodwill.
import {
  COURT_POLITICAL_POWER_COST,
  COURT_SUPPORT,
  COURT_TREASURY_COST,
  CRACKDOWN_POLITICAL_POWER_COST,
  CRACKDOWN_SUPPORT,
  RALLY_POLITICAL_POWER_COST,
  RALLY_SUPPORT,
  RALLY_TREASURY_COST,
} from "../../domain/constants";
import { generateId } from "../../domain/country/id";
import type { GameState, GameEvent } from "../../domain/country/types";
import { applyUniformDelta, getFactionWeights, getWeightedPopularity } from "../../domain/parties/factionRules";
import type { Ideology } from "../../domain/parties/types";
import { crackDownProvinces } from "../../domain/provinces/provinceOrder";
import { applyCrackdown } from "../../domain/unrest/unrestRules";
import { ONE_OFF, recordAction } from "./recordAction";
import { isFeatureOpen, recordDeed } from "../../domain/chapters/chapterData";
import { getBurdenRallyFactor } from "../../domain/reign/reignRules";

function logged(state: GameState, message: string, severity: GameEvent["severity"] = "info"): GameEvent[] {
  return [{ id: generateId("event"), date: state.date, message, severity, topic: "politics" }, ...state.events];
}

// "+3", or "+2.1" once hollow rallies have worn it down.
function formatSupportLift(lift: number): string {
  return `+${Number.isInteger(lift) ? lift : lift.toFixed(1)}`;
}

export function canHoldRally(state: GameState): boolean {
  return state.stats.politicalPower >= RALLY_POLITICAL_POWER_COST && state.stats.treasury >= RALLY_TREASURY_COST;
}

export function holdRally(state: GameState): GameState {
  if (!canHoldRally(state)) return state;
  // A Long Reign's hollow rallies lift less (see domain/reign).
  const lift = RALLY_SUPPORT * getBurdenRallyFactor(state.burdens);
  const { factionApproval, popularity } = applyUniformDelta(state.factionApproval, getFactionWeights(state.nationId), lift);
  return recordAction(state, {
    ...state,
    factionApproval,
    stats: {
      ...state.stats,
      popularity,
      politicalPower: state.stats.politicalPower - RALLY_POLITICAL_POWER_COST,
      treasury: state.stats.treasury - RALLY_TREASURY_COST,
    },
    events: logged(state, `You hold a rally across the country: support ${formatSupportLift(lift)} with every group.`),
  }, ONE_OFF);
}

export function canCourtGroup(state: GameState): boolean {
  return isFeatureOpen(state, "voters") && state.stats.politicalPower >= COURT_POLITICAL_POWER_COST && state.stats.treasury >= COURT_TREASURY_COST;
}

export function courtGroup(state: GameState, ideology: Ideology): GameState {
  if (!canCourtGroup(state)) return state;
  const lift = COURT_SUPPORT * getBurdenRallyFactor(state.burdens);
  const factionApproval = { ...state.factionApproval, [ideology]: Math.min(100, state.factionApproval[ideology] + lift) };
  return recordDeed(recordAction(state, {
    ...state,
    factionApproval,
    stats: {
      ...state.stats,
      popularity: getWeightedPopularity(factionApproval, getFactionWeights(state.nationId)),
      politicalPower: state.stats.politicalPower - COURT_POLITICAL_POWER_COST,
      treasury: state.stats.treasury - COURT_TREASURY_COST,
    },
    events: logged(state, `You court the ${ideology} vote with favours and promises: their support ${formatSupportLift(lift)}.`),
  }, ONE_OFF), "courted");
}

export function canCrackDown(state: GameState): boolean {
  return isFeatureOpen(state, "unrest") && state.stats.politicalPower >= CRACKDOWN_POLITICAL_POWER_COST;
}

export function crackDown(state: GameState): GameState {
  if (!canCrackDown(state)) return state;
  const { factionApproval, popularity } = applyUniformDelta(state.factionApproval, getFactionWeights(state.nationId), CRACKDOWN_SUPPORT);
  // Police make it bite harder, and it always pulls unrest back a stage.
  const { stage, stability } = applyCrackdown(state.unrestStage, state.stats.stability, state.workforce.police);
  const gain = Math.round(stability - state.stats.stability);
  const calmed = stage !== state.unrestStage ? ` Unrest eases to ${stage}.` : "";
  return recordAction(state, {
    ...state,
    factionApproval,
    unrestStage: stage,
    provinces: crackDownProvinces(state.provinces, state.workforce.police),
    stats: {
      ...state.stats,
      popularity,
      stability,
      politicalPower: state.stats.politicalPower - CRACKDOWN_POLITICAL_POWER_COST,
    },
    events: logged(state, `You order a crackdown on unrest: stability +${gain}, support ${CRACKDOWN_SUPPORT}.${calmed}`, "warning"),
  }, { ...ONE_OFF, stability: "crackdown" });
}
