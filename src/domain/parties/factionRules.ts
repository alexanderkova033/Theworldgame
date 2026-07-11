// The coalition math: turns a flat popularityDelta into 6 per-faction
// deltas, using the same alignment engine that already drives the rival's
// stance on laws/research (see rivalRules.ts) — so a policy that helps
// industry doesn't just cost "5 popularity," it costs the Agrarian/Labor
// wings specifically, while the Commercial/Nationalist wings may actually
// gain. Overall popularity is always the electorate-weighted average of the
// 6 factions, never mutated directly.
import { FACTION_SENSITIVITY } from "../constants";
import { FACTIONS, getFactionWeights } from "./factionData";
import { getAlignmentScore, type StanceEffects } from "./rivalRules";
import type { Ideology } from "./types";

export { getFactionWeights };

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function getWeightedPopularity(factionApproval: Record<Ideology, number>, weights: Record<Ideology, number>): number {
  const raw = FACTIONS.reduce((sum, f) => sum + factionApproval[f] * weights[f], 0);
  return clamp(raw);
}

export interface FactionUpdateResult {
  factionApproval: Record<Ideology, number>;
  popularity: number;
}

// The general case: every faction moves by the flat baseDelta, further
// nudged up or down by how strongly its ideology aligns with what actually
// changed (effects) — see getAlignmentScore. Passing `effects = {}` (via
// applyUniformDelta below) makes every faction move by exactly baseDelta,
// which is mathematically identical to today's flat single-number update.
export function applyFactionEffects(
  factionApproval: Record<Ideology, number>,
  weights: Record<Ideology, number>,
  effects: StanceEffects,
  baseDelta: number,
): FactionUpdateResult {
  const nextApproval = { ...factionApproval };
  for (const faction of FACTIONS) {
    nextApproval[faction] = clamp(factionApproval[faction] + baseDelta + getAlignmentScore(faction, effects) * FACTION_SENSITIVITY);
  }
  return { factionApproval: nextApproval, popularity: getWeightedPopularity(nextApproval, weights) };
}

// A delta with no ideological direction behind it (a failed vote's flat
// penalty, a generic campaign-trail swing) — every faction moves the same
// amount, so the weighted average moves by exactly `delta`.
export function applyUniformDelta(
  factionApproval: Record<Ideology, number>,
  weights: Record<Ideology, number>,
  delta: number,
): FactionUpdateResult {
  return applyFactionEffects(factionApproval, weights, {}, delta);
}
