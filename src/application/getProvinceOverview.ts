// Use case: each of the player's provinces as a place — people and homes,
// workers and jobs, order and who's moving in or out — for the map's
// tooltip and info bar and the People panel. Read-only; the same rules
// the daily tick runs (labourRules, provinceMigration, provinceOrder).
import {
  PROVINCE_FLAG_FULL_SHARE,
  PROVINCE_FLAG_HOMELESS_SHARE,
  PROVINCE_FLAG_JOBLESS_SHARE,
  PROVINCE_FLAG_SHORT_SHARE,
} from "../domain/constants";
import type { GameDate, GameState } from "../domain/country/types";
import { isInForce } from "../domain/uprising/demandRules";
import { getHousingCapacityByProvince } from "../domain/housing/housingRules";
import { getLabourSituation, type Sector, type SectorJobs } from "../domain/labour/labourRules";
import { getNation } from "../domain/nations/nationRules";
import { planMigration } from "../domain/provinces/provinceMigration";
import { getProvinceName } from "../domain/provinces/provinceRules";
import type { UnrestStage } from "../domain/unrest/types";
import { getRebelStrengthChange, getRiotDaysToRise, type RebelStrengthChange } from "../domain/uprising/uprisingRules";
import { getDifficulty } from "../domain/difficulty/difficultyData";

export interface ProvinceOverview {
  id: string;
  name: string;
  isCapital: boolean;
  population: number;
  capacity: number; // people its working homes hold
  homeless: number;
  workers: number;
  jobs: number;
  unemployed: number;
  openJobs: number; // jobs nobody fills
  commutersOut: number;
  stability: number;
  unrestStage: UnrestStage;
  migration: number; // net people moving in (+) or out (−) per day
  sectors: Record<Sector, SectorJobs>; // jobs here by kind — farms and food first, then schools, then factories
  riotDays: number; // days in a row it has rioted...
  riotDaysToRise: number; // ...and how many it takes to rise (see domain/uprising)
  uprising: { strength: number; change: RebelStrengthChange; militia: number } | null; // risen, with rebel strength and its daily change
  // Answers to its letters still in force, each with the day it runs out
  // (see domain/uprising/demandRules.ts); null when not in force.
  payRiseUntil: GameDate | null;
  disputeUntil: GameDate | null;
  taxReliefUntil: GameDate | null;
}

// What the map flags, coarse on purpose: it only changes when a province
// tips from one state to another, so the map isn't redrawn every day.
export interface ProvinceStatus {
  homes: "ok" | "full" | "over";
  jobs: "ok" | "short" | "jobless";
  stage: UnrestStage;
  risen: boolean;
}

export function getProvinceOverview(state: GameState): ProvinceOverview[] {
  const nation = getNation(state.nationId);
  const capacity = getHousingCapacityByProvince(state);
  const labour = getLabourSituation(state);
  const migration = planMigration(state.provinces, capacity, labour.provinces);
  return nation.provinceIds.map((id) => {
    const p = state.provinces[id];
    const l = labour.provinces[id];
    const population = p?.population ?? 0;
    return {
      id,
      name: getProvinceName(id),
      isCapital: id === nation.capitalProvinceId,
      population,
      capacity: capacity[id] ?? 0,
      homeless: Math.max(0, population - (capacity[id] ?? 0)),
      workers: l?.workers ?? 0,
      jobs: l?.jobs ?? 0,
      unemployed: l?.unemployed ?? 0,
      openJobs: l?.openJobs ?? 0,
      commutersOut: l?.commutersOut ?? 0,
      stability: p?.stability ?? state.stats.stability,
      unrestStage: p?.unrestStage ?? "calm",
      migration: migration[id] ?? 0,
      sectors: l?.sectors ?? { food: { jobs: 0, hired: 0 }, school: { jobs: 0, hired: 0 }, industry: { jobs: 0, hired: 0 } },
      riotDays: p?.riotDays ?? 0,
      riotDaysToRise: p ? getRiotDaysToRise(p, state.date, getDifficulty(state.difficulty).uprisingRiotDays) : 0,
      uprising: p?.uprising
        ? {
            strength: p.uprising.strength,
            change: getRebelStrengthChange(p.uprising, population > 0 ? Math.max(0, population - (capacity[id] ?? 0)) / population : 0, state.stats.stability, state.workforce.police),
            militia: p.uprising.militia,
          }
        : null,
      payRiseUntil: p && isInForce(p.payRiseUntil, state.date) ? p.payRiseUntil : null,
      disputeUntil: p && isInForce(p.disputeUntil, state.date) ? p.disputeUntil : null,
      taxReliefUntil: p && isInForce(p.taxReliefUntil, state.date) ? p.taxReliefUntil : null,
    };
  });
}

export function getProvinceStatus(o: ProvinceOverview): ProvinceStatus {
  const homes =
    o.population > 0 && o.homeless / o.population >= PROVINCE_FLAG_HOMELESS_SHARE
      ? "over"
      : o.capacity > 0 && o.population / o.capacity >= PROVINCE_FLAG_FULL_SHARE
        ? "full"
        : "ok";
  const jobs =
    o.workers > 0 && o.unemployed / o.workers >= PROVINCE_FLAG_JOBLESS_SHARE
      ? "jobless"
      : o.jobs > 0 && o.openJobs / o.jobs >= PROVINCE_FLAG_SHORT_SHARE
        ? "short"
        : "ok";
  return { homes, jobs, stage: o.unrestStage, risen: o.uprising !== null };
}
