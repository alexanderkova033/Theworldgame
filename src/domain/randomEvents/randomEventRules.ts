import type { CountryStats } from "../country/types";
import type { ResourceBundle } from "../resources/types";
import { RANDOM_EVENTS } from "./randomEventData";
import type { RandomEventDefinition, RandomEventEffect } from "./types";

export function pickRandomEvent(): RandomEventDefinition {
  const index = Math.floor(Math.random() * RANDOM_EVENTS.length);
  return RANDOM_EVENTS[index];
}

// Applies an event's effect to a copy of stats/resources — pure, so the
// application layer can call it and fold the result into the day's tick.
export function applyRandomEventEffect(
  stats: CountryStats,
  resources: ResourceBundle,
  effect: RandomEventEffect,
): { stats: CountryStats; resources: ResourceBundle } {
  const nextStats: CountryStats = {
    ...stats,
    treasury: stats.treasury * (effect.treasuryMultiplier ?? 1),
    food: stats.food * (effect.foodMultiplier ?? 1),
    population: stats.population * (effect.populationMultiplier ?? 1),
    stability: Math.min(100, Math.max(0, stats.stability + (effect.stabilityDelta ?? 0))),
  };

  let nextResources = resources;
  if (effect.resourceMultipliers) {
    nextResources = { ...resources };
    for (const [type, multiplier] of Object.entries(effect.resourceMultipliers)) {
      nextResources[type as keyof ResourceBundle] *= multiplier as number;
    }
  }

  return { stats: nextStats, resources: nextResources };
}

// An event's losses made harsher (scale > 1) or milder (< 1); its gains
// stay as they are. Difficulty uses this (see domain/difficulty).
export function scaleEventLosses(effect: RandomEventEffect, scale: number): RandomEventEffect {
  if (scale === 1) return effect;
  const loss = (m: number | undefined) => (m !== undefined && m < 1 ? Math.max(0, 1 - (1 - m) * scale) : m);
  return {
    ...effect,
    treasuryMultiplier: loss(effect.treasuryMultiplier),
    foodMultiplier: loss(effect.foodMultiplier),
    populationMultiplier: loss(effect.populationMultiplier),
    stabilityDelta: effect.stabilityDelta !== undefined && effect.stabilityDelta < 0 ? effect.stabilityDelta * scale : effect.stabilityDelta,
    resourceMultipliers: effect.resourceMultipliers
      ? Object.fromEntries(Object.entries(effect.resourceMultipliers).map(([type, m]) => [type, loss(m as number)]))
      : undefined,
  };
}
