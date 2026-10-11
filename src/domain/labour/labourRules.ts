// Labour: buildings don't run themselves. Every farm, factory, granary,
// cannery and school needs workers, and workers come from the population
// (LABOUR_SHARE of it — the rest are children, the old, and households).
//
// Each province is its own job market: its people fill its own jobs first,
// and they go where they're most needed — food (farms, granaries,
// canneries), then schools, then factories. So when hands run short a new
// farm still feeds people; it's the factories that go quiet. Only some of
// the people left without work (COMMUTE_SHARE) will travel to fill jobs
// in another province, in the same order. The rest stay unemployed, which
// weighs on public opinion (see politicsRules.ts) — so homes belong near
// the jobs. National figures are the sums over provinces.
import { COMMUTE_SHARE, JOBS_PER_BUILDING, LABOUR_SHARE } from "../constants";
import type { ProjectType } from "../construction/types";
import type { GameState } from "../country/types";
import { isWorking } from "../maintenance/maintenanceRules";
import { getNation } from "../nations/nationRules";
import { getResearchEffectsFor } from "../research/researchRules";

export type JobBuilding = keyof typeof JOBS_PER_BUILDING;

// Workers each kind of building needs — fewer on farms and in factories
// once research has found ways to do the work with fewer hands.
export function getJobsPerBuilding(state: GameState): Record<JobBuilding, number> {
  const research = getResearchEffectsFor(state);
  return {
    ...JOBS_PER_BUILDING,
    farm: Math.round(JOBS_PER_BUILDING.farm * research.farmJobsMultiplier),
    factory: Math.round(JOBS_PER_BUILDING.factory * research.factoryJobsMultiplier),
  };
}

type Sector = "food" | "school" | "industry";
const SECTORS: Sector[] = ["food", "school", "industry"]; // the order jobs are filled in
const SECTOR_OF: Partial<Record<ProjectType, Sector>> = {
  farm: "food",
  granary: "food",
  cannery: "food",
  education: "school",
  factory: "industry",
};

export interface ProvinceLabour {
  workers: number; // people of working age living here
  jobs: number; // positions in its working buildings
  foodStaffing: number; // 0..1, counting commuters from elsewhere
  schoolStaffing: number;
  industryStaffing: number;
  unemployed: number; // workers living here with no job here or elsewhere
  commutersOut: number; // workers living here who work in another province
  openJobs: number; // jobs here nobody fills, from here or elsewhere
}

export interface LabourSituation {
  workers: number; // people of working age
  jobs: number; // positions in every working building
  foodStaffing: number; // 0..1 for farms, granaries, canneries — filled first
  schoolStaffing: number; // 0..1 — filled next
  industryStaffing: number; // 0..1 for factories — whatever is left
  unemployed: number;
  unemploymentShare: number; // 0..1 of workers without a job
  // Working buildings, counted by how fully they're staffed (a farm at
  // half its workers counts as half a farm) — what production runs on.
  staffed: { farms: number; granaries: number; canneries: number; schools: number; factories: number };
  provinces: Record<string, ProvinceLabour>;
}

function staffing(hired: number, jobs: number): number {
  return jobs > 0 ? hired / jobs : 1;
}

export function getLabourSituation(state: GameState): LabourSituation {
  const provinceIds = getNation(state.nationId).provinceIds;
  const jobsPer = getJobsPerBuilding(state);

  // Working buildings and jobs, per province.
  const buildings: Record<string, Partial<Record<ProjectType, number>>> = Object.fromEntries(provinceIds.map((id) => [id, {}]));
  for (const b of state.placedBuildings) {
    const here = buildings[b.provinceId];
    if (here && isWorking(b)) here[b.type] = (here[b.type] ?? 0) + 1;
  }
  const jobs: Record<string, Record<Sector, number>> = {};
  const hired: Record<string, Record<Sector, number>> = {};
  const idle: Record<string, number> = {};
  const workers: Record<string, number> = {};
  for (const id of provinceIds) {
    jobs[id] = { food: 0, school: 0, industry: 0 };
    for (const [type, count] of Object.entries(buildings[id]) as Array<[ProjectType, number]>) {
      const sector = SECTOR_OF[type];
      if (sector) jobs[id][sector] += count * jobsPer[type as JobBuilding];
    }
    // Locals first.
    workers[id] = (state.provinces[id]?.population ?? 0) * LABOUR_SHARE;
    let left = workers[id];
    hired[id] = { food: 0, school: 0, industry: 0 };
    for (const sector of SECTORS) {
      const take = Math.min(left, jobs[id][sector]);
      hired[id][sector] = take;
      left -= take;
    }
    idle[id] = left;
  }

  // Then commuters: a share of everyone left idle fills open jobs anywhere,
  // in the same order, spread over the provinces with openings.
  const totalIdle = provinceIds.reduce((sum, id) => sum + idle[id], 0);
  let pool = totalIdle * COMMUTE_SHARE;
  for (const sector of SECTORS) {
    const open = provinceIds.reduce((sum, id) => sum + (jobs[id][sector] - hired[id][sector]), 0);
    const take = Math.min(pool, open);
    if (take <= 0) continue;
    for (const id of provinceIds) hired[id][sector] += (take * (jobs[id][sector] - hired[id][sector])) / open;
    pool -= take;
  }
  const commuters = totalIdle * COMMUTE_SHARE - pool;

  const provinces: Record<string, ProvinceLabour> = {};
  const staffed = { farms: 0, granaries: 0, canneries: 0, schools: 0, factories: 0 };
  const totals = { workers: 0, unemployed: 0, jobs: { food: 0, school: 0, industry: 0 }, hired: { food: 0, school: 0, industry: 0 } };
  for (const id of provinceIds) {
    const commutersOut = totalIdle > 0 ? (commuters * idle[id]) / totalIdle : 0;
    const p: ProvinceLabour = {
      workers: workers[id],
      jobs: jobs[id].food + jobs[id].school + jobs[id].industry,
      foodStaffing: staffing(hired[id].food, jobs[id].food),
      schoolStaffing: staffing(hired[id].school, jobs[id].school),
      industryStaffing: staffing(hired[id].industry, jobs[id].industry),
      unemployed: idle[id] - commutersOut,
      commutersOut,
      openJobs: SECTORS.reduce((sum, sector) => sum + jobs[id][sector] - hired[id][sector], 0),
    };
    provinces[id] = p;
    const here = buildings[id];
    staffed.farms += (here.farm ?? 0) * p.foodStaffing;
    staffed.granaries += (here.granary ?? 0) * p.foodStaffing;
    staffed.canneries += (here.cannery ?? 0) * p.foodStaffing;
    staffed.schools += (here.education ?? 0) * p.schoolStaffing;
    staffed.factories += (here.factory ?? 0) * p.industryStaffing;
    totals.workers += p.workers;
    totals.unemployed += p.unemployed;
    for (const sector of SECTORS) {
      totals.jobs[sector] += jobs[id][sector];
      totals.hired[sector] += hired[id][sector];
    }
  }

  return {
    workers: totals.workers,
    jobs: totals.jobs.food + totals.jobs.school + totals.jobs.industry,
    foodStaffing: staffing(totals.hired.food, totals.jobs.food),
    schoolStaffing: staffing(totals.hired.school, totals.jobs.school),
    industryStaffing: staffing(totals.hired.industry, totals.jobs.industry),
    unemployed: totals.unemployed,
    unemploymentShare: totals.workers > 0 ? totals.unemployed / totals.workers : 0,
    staffed,
    provinces,
  };
}
