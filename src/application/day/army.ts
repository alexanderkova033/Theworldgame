// Step 7c of the day: every country's regiments drill or march a day (see
// domain/military). Yours standing in a province that broke away fight its
// rebels (battleRules.ts), and beat to nothing, they take it back; rebels
// left alone gather strength again, and worn regiments standing at home
// get their men back. Yours are paid with the other wages (day/money.ts);
// when the treasury is empty after paying them, the newest goes home unpaid.
import type { GameState } from "../../domain/country/types";
import { getLinkedIslands } from "../../domain/islands/islandRules";
import { fightBattle, fightRebels, getSiegeDays, regrowRebels, restRegiment } from "../../domain/military/battleRules";
import { getIslandPeople } from "../../domain/neighbours/treatyRules";
import { getNation } from "../../domain/nations/nationRules";
import { advanceRegiment, isReady } from "../../domain/military/militaryRules";
import type { Regiment } from "../../domain/military/types";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { log, type Day } from "./dayContext";

const NOTHING: ReadonlySet<string> = new Set();

export interface ArmyDay {
  regiments: GameState["regiments"];
  freeProvinces: GameState["freeProvinces"];
  retaken: string[]; // provinces whose rebels were beaten today
  sieges: GameState["sieges"];
  captured: string[]; // neighbours' islands taken today
}

export function drillTheArmy(day: Day, working: GameState, treasury: number): ArmyDay {
  const date = day.start.date;
  const quiet: ArmyDay = { regiments: working.regiments, freeProvinces: working.freeProvinces, retaken: [], sieges: working.sieges, captured: [] };
  if (working.regiments.length === 0 && Object.values(working.freeProvinces).every((f) => f.strength >= 100)) return quiet;
  const yours = (r: Regiment) => r.nationId === working.nationId;

  // Harbour links only matter to yours, and only on the march.
  const linked = working.regiments.some((r) => r.march && yours(r)) ? getLinkedIslands(working) : NOTHING;
  // An island held by a neighbour you're at war with is a battlefield.
  const enemyIsland = (id: string) => !!working.foreignIslands[id] && !!working.wars[working.foreignIslands[id]];
  const engaged = new Set<string>();
  let regiments = working.regiments.map((r) => {
    if (r.trainingDays <= 0 && !r.march) return r;
    const next = advanceRegiment(r, yours(r) ? linked : NOTHING);
    if (r.march && !next.march && yours(r) && (working.freeProvinces[next.provinceId] || enemyIsland(next.provinceId))) engaged.add(next.provinceId);
    return next;
  });
  for (const id of engaged) {
    log(day, {
      date,
      message: working.freeProvinces[id]
        ? `Your regiments reach ${getProvinceName(id)} and engage its rebels.`
        : `Your regiments land on ${getProvinceName(id)}, held by ${getNation(working.foreignIslands[id]).name}.`,
      severity: "warning",
      topic: "army",
    });
  }

  // The fighting, province by province; rebels with nobody to fight regrow.
  const freeProvinces: GameState["freeProvinces"] = {};
  const retaken: string[] = [];
  for (const [id, free] of Object.entries(working.freeProvinces)) {
    const there = regiments.filter((r) => yours(r) && isReady(r) && r.provinceId === id);
    if (there.length === 0) {
      freeProvinces[id] = regrowRebels(free);
      continue;
    }
    const fight = fightRebels(there, free.strength);
    const worn = new Map(fight.regiments.map((r) => [r.id, r]));
    regiments = regiments.map((r) => worn.get(r.id) ?? r);
    if (fight.strength <= 0) {
      retaken.push(id);
      log(day, { date, message: `${getProvinceName(id)} is taken back! Its rebels are beaten, and its people are yours again, though they will not forget how.`, severity: "info", topic: "army" });
    } else {
      freeProvinces[id] = { ...free, strength: fight.strength };
    }
  }

  // The islands of the neighbours you're at war with: where your regiments
  // stand on one, they fight its garrison, and once no defender is left
  // they besiege it until it falls. With none of yours there, a siege lifts.
  const sieges: GameState["sieges"] = {};
  const captured: string[] = [];
  const battlefields = new Set<string>();
  for (const [islandId, holder] of Object.entries(working.foreignIslands)) {
    if (!working.wars[holder]) continue;
    const mine = regiments.filter((r) => yours(r) && isReady(r) && r.provinceId === islandId);
    if (mine.length === 0) continue;
    battlefields.add(islandId);
    const theirs = regiments.filter((r) => r.nationId === holder && isReady(r) && r.provinceId === islandId);
    if (theirs.length > 0) {
      const battle = fightBattle(mine, theirs);
      const worn = new Map([...battle.attackers, ...battle.defenders].map((r) => [r.id, r]));
      regiments = regiments.map((r) => worn.get(r.id) ?? r);
      if (battle.defenders.every((r) => r.strength <= 0)) {
        log(day, { date, message: `${getNation(holder).name}'s garrison on ${getProvinceName(islandId)} is beaten. The island is under siege.`, severity: "info", topic: "army" });
      }
      continue;
    }
    const days = (working.sieges[islandId] ?? 0) + 1;
    if (days >= getSiegeDays(getIslandPeople(islandId))) {
      captured.push(islandId);
      log(day, { date, message: `${getProvinceName(islandId)} falls to your regiments! It is yours, and its people with it.`, severity: "info", topic: "army" });
    } else {
      sieges[islandId] = days;
    }
  }

  // A regiment worn to nothing is gone.
  for (const r of regiments.filter((x) => x.strength <= 0)) {
    if (yours(r)) log(day, { date, message: `A regiment of yours is destroyed in ${getProvinceName(r.provinceId)}.`, severity: "danger", topic: "army" });
    else if (working.wars[r.nationId]) log(day, { date, message: `A regiment of ${getNation(r.nationId).name}'s is destroyed in ${getProvinceName(r.provinceId)}.`, severity: "info", topic: "army" });
  }
  regiments = regiments.filter((r) => r.strength > 0);
  // Worn regiments at rest get their men back (not while fighting).
  const fighting = (id: string) => !!freeProvinces[id] || retaken.includes(id) || battlefields.has(id);
  regiments = regiments.map((r) => (isReady(r) && r.strength < 100 && !fighting(r.provinceId) ? restRegiment(r) : r));

  if (treasury < 0) {
    const newest = regiments.filter(yours).at(-1);
    if (newest) {
      regiments = regiments.filter((r) => r !== newest);
      log(day, { date, message: "The treasury is empty, and a regiment goes home unpaid.", severity: "warning", topic: "money" });
    }
  }
  // Nothing moved: keep the same lists, so the map needn't redraw.
  const sameRegiments = regiments.length === working.regiments.length && regiments.every((r, i) => r === working.regiments[i]);
  const sameFree = retaken.length === 0 && Object.entries(freeProvinces).every(([id, f]) => f.strength === working.freeProvinces[id]?.strength);
  const sameSieges = Object.keys(sieges).length === Object.keys(working.sieges).length && Object.entries(sieges).every(([id, d]) => working.sieges[id] === d);
  return {
    regiments: sameRegiments ? working.regiments : regiments,
    freeProvinces: sameFree ? working.freeProvinces : freeProvinces,
    retaken,
    sieges: sameSieges ? working.sieges : sieges,
    captured,
  };
}
