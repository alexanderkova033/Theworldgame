// Step 7c of the day: every country's regiments drill or march a day (see
// domain/military). Yours standing in a province that broke away fight its
// rebels (battleRules.ts), and beat to nothing, they take it back; rebels
// left alone gather strength again, and worn regiments standing at home
// get their men back. Yours are paid with the other wages (day/money.ts);
// when the treasury is empty after paying them, the newest goes home unpaid.
import type { GameState } from "../../domain/country/types";
import { getLinkedIslands } from "../../domain/islands/islandRules";
import { fightRebels, regrowRebels, restRegiment } from "../../domain/military/battleRules";
import { advanceRegiment, isReady } from "../../domain/military/militaryRules";
import type { Regiment } from "../../domain/military/types";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { log, type Day } from "./dayContext";

const NOTHING: ReadonlySet<string> = new Set();

export interface ArmyDay {
  regiments: GameState["regiments"];
  freeProvinces: GameState["freeProvinces"];
  retaken: string[]; // provinces whose rebels were beaten today
}

export function drillTheArmy(day: Day, working: GameState, treasury: number): ArmyDay {
  const date = day.start.date;
  const quiet: ArmyDay = { regiments: working.regiments, freeProvinces: working.freeProvinces, retaken: [] };
  if (working.regiments.length === 0 && Object.values(working.freeProvinces).every((f) => f.strength >= 100)) return quiet;
  const yours = (r: Regiment) => r.nationId === working.nationId;

  // Harbour links only matter to yours, and only on the march.
  const linked = working.regiments.some((r) => r.march && yours(r)) ? getLinkedIslands(working) : NOTHING;
  const engaged = new Set<string>();
  let regiments = working.regiments.map((r) => {
    if (r.trainingDays <= 0 && !r.march) return r;
    const next = advanceRegiment(r, yours(r) ? linked : NOTHING);
    if (r.march && !next.march && yours(r) && working.freeProvinces[next.provinceId]) engaged.add(next.provinceId);
    return next;
  });
  for (const id of engaged) {
    log(day, { date, message: `Your regiments reach ${getProvinceName(id)} and engage its rebels.`, severity: "warning", topic: "army" });
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

  // A regiment worn to nothing is gone.
  for (const r of regiments.filter((x) => x.strength <= 0)) {
    if (yours(r)) log(day, { date, message: `A regiment of yours is destroyed in ${getProvinceName(r.provinceId)}.`, severity: "danger", topic: "army" });
  }
  regiments = regiments.filter((r) => r.strength > 0);
  // Worn regiments at rest get their men back (not while fighting).
  regiments = regiments.map((r) => (isReady(r) && r.strength < 100 && !freeProvinces[r.provinceId] && !retaken.includes(r.provinceId) ? restRegiment(r) : r));

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
  return {
    regiments: sameRegiments ? working.regiments : regiments,
    freeProvinces: sameFree ? working.freeProvinces : freeProvinces,
    retaken,
  };
}
