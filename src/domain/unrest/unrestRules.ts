// Unrest: what falling stability does before it hits zero. The country
// slides through stages — discontent, strikes, riots — and each one costs
// something real: industry slows, factories stop, mobs wreck buildings.
// Collapse is still stability reaching 0 (see simulateDay.ts). A stage sets
// in the moment stability drops under its line, but only eases once
// stability is back a little above it, so it doesn't flicker on the line.
// Police soften strikes and riots; a crackdown pulls the country back one
// stage outright.
import {
  CRACKDOWN_POLICE_BONUS_CAP,
  CRACKDOWN_STABILITY,
  CRACKDOWN_STABILITY_PER_POLICE,
  DISCONTENT_INDUSTRY_PENALTY,
  RIOT_DAMAGE_CHANCE_PER_DAY,
  STRIKE_FACTORY_STOPPAGE,
  STRIKE_STOPPAGE_MIN,
  STRIKE_STOPPAGE_PER_POLICE,
  UNREST_DISCONTENT_BELOW,
  UNREST_EASE_MARGIN,
  UNREST_RIOTS_BELOW,
  UNREST_STRIKES_BELOW,
} from "../constants";
import { isWorking } from "../maintenance/maintenanceRules";
import type { PlacedBuilding } from "../provinces/types";
import { getPoliceBreakdownReduction } from "../workforce/workforceRules";
import type { UnrestStage } from "./types";

export const UNREST_STAGES: UnrestStage[] = ["calm", "discontent", "strikes", "riots"];

// Stability under this line puts the country in that stage.
export const UNREST_STAGE_LINES: Record<UnrestStage, number> = {
  calm: 100,
  discontent: UNREST_DISCONTENT_BELOW,
  strikes: UNREST_STRIKES_BELOW,
  riots: UNREST_RIOTS_BELOW,
};

function severity(stage: UnrestStage): number {
  return UNREST_STAGES.indexOf(stage);
}

export function isWorseStage(a: UnrestStage, b: UnrestStage): boolean {
  return severity(a) > severity(b);
}

// Where stability alone puts the country, with no memory of yesterday.
export function getStageForStability(stability: number): UnrestStage {
  if (stability < UNREST_RIOTS_BELOW) return "riots";
  if (stability < UNREST_STRIKES_BELOW) return "strikes";
  if (stability < UNREST_DISCONTENT_BELOW) return "discontent";
  return "calm";
}

export function updateUnrestStage(current: UnrestStage, stability: number): UnrestStage {
  const target = getStageForStability(stability);
  if (isWorseStage(target, current)) return target;
  let stage = current;
  while (isWorseStage(stage, target) && stability >= UNREST_STAGE_LINES[stage] + UNREST_EASE_MARGIN) {
    stage = UNREST_STAGES[severity(stage) - 1];
  }
  return stage;
}

export function getCalmerStage(stage: UnrestStage): UnrestStage {
  return UNREST_STAGES[Math.max(0, severity(stage) - 1)];
}

// Share of factory work lost to strikes — police on the payroll keep more
// of the works open.
export function getStrikeStoppage(police: number): number {
  return Math.max(STRIKE_STOPPAGE_MIN, STRIKE_FACTORY_STOPPAGE - police * STRIKE_STOPPAGE_PER_POLICE);
}

// What unrest leaves of industrial output: discontent slows it, strikes
// also stop part of the factories.
export function getUnrestIndustryMultiplier(stage: UnrestStage, police: number): number {
  if (stage === "calm") return 1;
  const discontent = 1 - DISCONTENT_INDUSTRY_PENALTY;
  return stage === "discontent" ? discontent : discontent * (1 - getStrikeStoppage(police));
}

export function getRiotDamageChance(police: number): number {
  return RIOT_DAMAGE_CHANCE_PER_DAY * (1 - getPoliceBreakdownReduction(police));
}

// A riot day: maybe one working building is wrecked, through the same
// broken/repair system as wear and tear. Same array back when nothing happens.
export function rollRiotDamage(placedBuildings: PlacedBuilding[], police: number): { placedBuildings: PlacedBuilding[]; wrecked: PlacedBuilding | null } {
  if (Math.random() >= getRiotDamageChance(police)) return { placedBuildings, wrecked: null };
  const targets = placedBuildings.filter(isWorking);
  if (targets.length === 0) return { placedBuildings, wrecked: null };
  const target = targets[Math.floor(Math.random() * targets.length)];
  const wrecked: PlacedBuilding = { ...target, condition: "broken" };
  return { placedBuildings: placedBuildings.map((b) => (b.id === target.id ? wrecked : b)), wrecked };
}

// How much order a crackdown buys: more with police to carry it out...
export function getCrackdownStability(police: number): number {
  return CRACKDOWN_STABILITY + Math.min(CRACKDOWN_POLICE_BONUS_CAP, police * CRACKDOWN_STABILITY_PER_POLICE);
}

// ...and always enough to pull the country back one stage.
export function applyCrackdown(stage: UnrestStage, stability: number, police: number): { stage: UnrestStage; stability: number } {
  const raised = stability + getCrackdownStability(police);
  if (stage === "calm") return { stage, stability: Math.min(100, raised) };
  return { stage: getCalmerStage(stage), stability: Math.min(100, Math.max(raised, UNREST_STAGE_LINES[stage] + UNREST_EASE_MARGIN)) };
}
