// Fighting, a day at a time. Today the only enemy is the rebels holding a
// province that broke away: its people, and how strong the rebels are
// (0-100, as for an uprising). Your regiments standing there wear the
// rebels down, each by its own strength; the rebels wear them down in
// turn, by theirs, spread over every regiment there. So one regiment at
// full strength can just beat rebels at full strength, slowly and badly
// worn, and two do it in half the time with far less hurt. At zero the
// province is yours again. Nothing here is chance.
import {
  DEFENDER_BONUS,
  FREE_REBEL_REGROWTH_PER_DAY,
  REBEL_FIGHT_PER_DAY,
  REGIMENT_ASSAULT_PER_DAY,
  REGIMENT_RECOVERY_PER_DAY,
  SIEGE_DAYS,
  SIEGE_PEOPLE_PER_DAY,
} from "../constants";
import type { Regiment } from "./types";

// A province that broke away, held by its rebels.
export interface FreeProvince {
  people: number; // who live there, and come back with it
  strength: number; // 0-100: how hard the rebels are to beat
}

export function newFreeProvince(people: number): FreeProvince {
  return { people, strength: 100 };
}

export interface Fight {
  regiments: Regiment[]; // those that fought, worn down
  strength: number; // the rebels', after the day
}

// A day's fighting between the regiments standing in a free province and
// its rebels.
export function fightRebels(regiments: Regiment[], rebels: number): Fight {
  if (regiments.length === 0) return { regiments, strength: rebels };
  const assault = regiments.reduce((sum, r) => sum + r.strength, 0) / 100 * REGIMENT_ASSAULT_PER_DAY;
  const losses = (rebels / 100) * REBEL_FIGHT_PER_DAY / regiments.length;
  return {
    regiments: regiments.map((r) => ({ ...r, strength: Math.max(0, r.strength - losses) })),
    strength: Math.max(0, rebels - assault),
  };
}

// A day's battle between two countries' regiments in one place: each side
// wears the other down by its own strength, spread over the other's
// regiments. Defenders standing on their own ground hit harder.
export function fightBattle(attackers: Regiment[], defenders: Regiment[]): { attackers: Regiment[]; defenders: Regiment[] } {
  if (attackers.length === 0 || defenders.length === 0) return { attackers, defenders };
  const blow = (side: Regiment[]) => side.reduce((sum, r) => sum + r.strength, 0) / 100 * REGIMENT_ASSAULT_PER_DAY;
  const toDefenders = blow(attackers) / defenders.length;
  const toAttackers = (blow(defenders) * DEFENDER_BONUS) / attackers.length;
  return {
    attackers: attackers.map((r) => ({ ...r, strength: Math.max(0, r.strength - toAttackers) })),
    defenders: defenders.map((r) => ({ ...r, strength: Math.max(0, r.strength - toDefenders) })),
  };
}

// How a landing would go, played forward without changing anything: the
// battle with whoever holds the island, then the siege. For the march
// preview.
export function forecastLanding(attackers: number[], defenders: number[], siegeDays = SIEGE_DAYS, maxDays = 365): { days: number; won: boolean } {
  const side = (strengths: number[], tag: string) => strengths.map((strength, i) => ({ id: `${tag}${i}`, nationId: tag, provinceId: "", strength, trainingDays: 0, march: null }) as Regiment);
  let a = side(attackers, "a");
  let d = side(defenders, "d");
  for (let day = 1; day <= maxDays && d.length > 0; day++) {
    const battle = fightBattle(a, d);
    a = battle.attackers.filter((r) => r.strength > 0);
    d = battle.defenders.filter((r) => r.strength > 0);
    if (a.length === 0) return { days: day, won: false };
    if (d.length === 0) return { days: day + siegeDays, won: true };
  }
  return d.length === 0 ? { days: siegeDays, won: a.length > 0 } : { days: maxDays, won: false };
}

// How long an island with no defenders left holds out: longer the more
// people live there.
export function getSiegeDays(people: number): number {
  return SIEGE_DAYS + Math.round(people / SIEGE_PEOPLE_PER_DAY);
}

// Left alone, rebels gather strength again.
export function regrowRebels(free: FreeProvince): FreeProvince {
  return free.strength >= 100 ? free : { ...free, strength: Math.min(100, free.strength + FREE_REBEL_REGROWTH_PER_DAY) };
}

// A worn regiment at rest gets its men back.
export function restRegiment(r: Regiment): Regiment {
  return r.strength >= 100 ? r : { ...r, strength: Math.min(100, r.strength + REGIMENT_RECOVERY_PER_DAY) };
}

// How many days a fight would take, and how strong the regiments end it,
// played forward without changing anything: for the Army window and the
// map, so the player can see before sending them whether it's enough.
export function forecastFight(regimentStrengths: number[], rebels: number, maxDays = 365): { days: number; won: boolean; left: number } {
  let regiments = regimentStrengths.map((strength, i) => ({ id: String(i), nationId: "", provinceId: "", strength, trainingDays: 0, march: null }) as Regiment);
  let strength = rebels;
  for (let day = 1; day <= maxDays; day++) {
    const fight = fightRebels(regiments, strength);
    regiments = fight.regiments.filter((r) => r.strength > 0);
    strength = fight.strength;
    if (strength <= 0) return { days: day, won: true, left: regiments.reduce((sum, r) => sum + r.strength, 0) };
    if (regiments.length === 0) return { days: day, won: false, left: 0 };
  }
  return { days: maxDays, won: false, left: regiments.reduce((sum, r) => sum + r.strength, 0) };
}
