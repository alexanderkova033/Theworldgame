// People move. Every day a small share of each province's homeless leave
// for provinces with free homes, and a share of its jobless (with their
// households) for provinces with free homes *and* open jobs. Unrest puts
// people off a province; nobody moves where there's no home to move into.
// Migration only shuffles people between provinces — the national total
// doesn't change.
import { LABOUR_SHARE, MIGRATION_SHARE_PER_DAY, MIGRATION_UNREST_PULL } from "../constants";
import type { ProvinceLabour } from "../labour/labourRules";
import type { ProvinceState } from "./types";

// One flow: movers leave their origins, and are spread over destinations by
// weight, never more than a destination can still take. Returns the net
// change per province, and uses up `room`.
function flow(ids: string[], movers: Record<string, number>, weight: Record<string, number>, room: Record<string, number>): Record<string, number> {
  const net: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const from of ids) {
    const leaving = movers[from];
    if (leaving <= 0) continue;
    const targets = ids.filter((to) => to !== from && weight[to] > 0 && room[to] > 0);
    const total = targets.reduce((sum, to) => sum + weight[to], 0);
    if (total <= 0) continue;
    for (const to of targets) {
      const moving = Math.min(room[to], (leaving * weight[to]) / total);
      net[from] -= moving;
      net[to] += moving;
      room[to] -= moving;
    }
  }
  return net;
}

// Today's net movement per province (+ arriving, − leaving).
export function planMigration(
  provinces: Record<string, ProvinceState>,
  capacityByProvince: Record<string, number>,
  labour: Record<string, ProvinceLabour>,
): Record<string, number> {
  const ids = Object.keys(provinces);
  const room: Record<string, number> = {};
  const homeless: Record<string, number> = {};
  const jobless: Record<string, number> = {};
  const openJobs: Record<string, number> = {}; // people the open jobs would bring, households included
  const pull: Record<string, number> = {};
  for (const id of ids) {
    const p = provinces[id];
    const capacity = capacityByProvince[id] ?? 0;
    const l = labour[id];
    room[id] = Math.max(0, capacity - p.population);
    homeless[id] = Math.max(0, p.population - capacity) * MIGRATION_SHARE_PER_DAY;
    jobless[id] = l ? (l.unemployed / LABOUR_SHARE) * MIGRATION_SHARE_PER_DAY : 0;
    openJobs[id] = l ? Math.max(0, l.jobs - l.workers) / LABOUR_SHARE : 0;
    pull[id] = MIGRATION_UNREST_PULL[p.unrestStage];
  }

  // The homeless go wherever there's a roof, more readily where there's work.
  const roofWeight = Object.fromEntries(ids.map((id) => [id, room[id] * (1 + Math.min(1, openJobs[id] / Math.max(1, room[id]))) * pull[id]]));
  const fromHomeless = flow(ids, homeless, roofWeight, room);
  // The jobless only go where there's both a roof and a job.
  const jobWeight = Object.fromEntries(ids.map((id) => [id, Math.min(room[id], openJobs[id]) * pull[id]]));
  const fromJobless = flow(ids, jobless, jobWeight, room);

  return Object.fromEntries(ids.map((id) => [id, fromHomeless[id] + fromJobless[id]]));
}

export function applyMigration(provinces: Record<string, ProvinceState>, net: Record<string, number>): Record<string, ProvinceState> {
  return Object.fromEntries(
    Object.entries(provinces).map(([id, p]) => [id, { ...p, population: Math.max(0, p.population + (net[id] ?? 0)) }]),
  );
}
