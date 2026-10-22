// What a story letter's answer does to the country beyond its numbers (see
// StoryOutcome in domain/decisions/types.ts): a group's backing moved hard,
// buildings raised or pulled down in a named province, its order changed,
// an effect laid on the country for a while, a province risen, a crisis
// begun, or taxes let off. Applied by resolveDecision, after the numbers.
import { addDays } from "../domain/country/calendar";
import { generateId } from "../domain/country/id";
import type { GameState } from "../domain/country/types";
import type { StoryOutcome } from "../domain/decisions/types";
import { getFactionWeights, getWeightedPopularity } from "../domain/parties/factionRules";
import type { Ideology } from "../domain/parties/types";
import { getProvinceName } from "../domain/provinces/provinceRules";
import { seizeBuildings, startUprising } from "../domain/uprising/uprisingRules";
import { placeBuilding, pullDownBuilding } from "./applyProjectCompletion";
import { strikeCrisis } from "./day/crises";

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

export function applyStoryOutcome(state: GameState, outcome: StoryOutcome): GameState {
  let s = state;

  if (outcome.groups) {
    const factionApproval = { ...s.factionApproval };
    for (const [group, change] of Object.entries(outcome.groups) as Array<[Ideology, number]>) factionApproval[group] = clamp(factionApproval[group] + change);
    s = { ...s, factionApproval, stats: { ...s.stats, popularity: getWeightedPopularity(factionApproval, getFactionWeights(s.nationId)) } };
  }

  if (outcome.politicalPower) s = { ...s, stats: { ...s.stats, politicalPower: Math.max(0, s.stats.politicalPower + outcome.politicalPower) } };

  // Only where the country still holds the province.
  const held = (id: string) => !!s.provinces[id];

  for (const { provinceId, type, count } of outcome.build ?? []) {
    if (!held(provinceId)) continue;
    for (let i = 0; i < count; i++) s = placeBuilding(s, { id: generateId("building"), provinceId, type });
  }

  for (const { provinceId, type, count } of outcome.pullDown ?? []) {
    const doomed = s.placedBuildings.filter((b) => b.provinceId === provinceId && b.type === type).slice(0, count);
    for (const b of doomed) s = pullDownBuilding(s, b.id);
  }

  for (const { provinceId, change } of outcome.order ?? []) {
    if (!held(provinceId)) continue;
    const p = s.provinces[provinceId];
    s = { ...s, provinces: { ...s.provinces, [provinceId]: { ...p, stability: clamp(p.stability + change) } } };
  }

  if (outcome.lasting) {
    s = { ...s, lasting: [...s.lasting, { why: outcome.lasting.why, effects: outcome.lasting.effects, until: addDays(s.date, outcome.lasting.days) }] };
  }

  if (outcome.taxRelief && held(outcome.taxRelief.provinceId)) {
    const { provinceId, days } = outcome.taxRelief;
    s = { ...s, provinces: { ...s.provinces, [provinceId]: { ...s.provinces[provinceId], taxReliefUntil: addDays(s.date, days) } } };
  }

  if (outcome.rises && held(outcome.rises) && !s.provinces[outcome.rises].uprising) {
    const id = outcome.rises;
    const p = s.provinces[id];
    s = {
      ...s,
      placedBuildings: seizeBuildings(s.placedBuildings, id),
      provinces: { ...s.provinces, [id]: { ...p, unrestStage: "riots", uprising: startUprising(p, s.date) } },
      events: [{ id: generateId("event"), date: s.date, message: `${getProvinceName(id)} has risen against the government!`, severity: "danger", topic: "uprising" }, ...s.events],
    };
  }

  if (outcome.crisis && held(outcome.crisis.provinceId)) s = strikeCrisis(s, outcome.crisis.provinceId, outcome.crisis.kind);

  return s;
}
