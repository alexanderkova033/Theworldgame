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
//
// The player may set a limit on each sector for the whole country (a WorkPlan,
// or null for Automatic). Each province then offers the same share of its jobs
// in that sector, and jobs fill as above. Anyone left over still fills any job
// open, so a limit never leaves anyone jobless.
//
// All of that counts people. What they produce also depends on how many know
// the work (see trainingRules.ts): `skill` scales `staffed` and `industryOutput`.
import { CAPTAIN_WORKER_SHORTAGE, COMMUTE_SHARE, FACTORIES_PER_FOUNDRY, FACTORIES_PER_STEELWORKS, FARMS_PER_ESTATE, FARMS_PER_MODEL_FARM, JOBS_PER_BUILDING, LABOUR_SHARE, SERVICE_CREW } from "../constants";
import type { ProjectType } from "../construction/types";
import type { GameState } from "../country/types";
import { isWorking } from "../maintenance/maintenanceRules";
import { getModifiers } from "../policy/policyRules";
import { getOwnedProvinceIds } from "../provinces/provinceRules";
import { isIsland } from "../islands/islandRules";
import { getSkill, isCrewTrained, type Trade, type TrainedWorkers } from "./trainingRules";

export type JobBuilding = keyof typeof JOBS_PER_BUILDING;

// Workers each kind of building needs: fewer on farms and in factories
// once research or law has found ways to do the work with fewer hands.
export function getJobsPerBuilding(state: GameState): Record<JobBuilding, number> {
  const mods = getModifiers(state);
  return {
    ...JOBS_PER_BUILDING,
    farm: Math.round(JOBS_PER_BUILDING.farm * mods.farmJobsMultiplier),
    factory: Math.round(JOBS_PER_BUILDING.factory * mods.factoryJobsMultiplier),
    estate: Math.round(JOBS_PER_BUILDING.estate * mods.farmJobsMultiplier),
    modelFarm: Math.round(JOBS_PER_BUILDING.modelFarm * mods.farmJobsMultiplier),
    foundry: Math.round(JOBS_PER_BUILDING.foundry * mods.factoryJobsMultiplier),
    steelworks: Math.round(JOBS_PER_BUILDING.steelworks * mods.factoryJobsMultiplier),
  };
}

export type Sector = "food" | "school" | "industry";
export const SECTORS: Sector[] = ["food", "school", "industry"]; // the order jobs are filled in

// The most people the player wants working in each sector, nationwide.
export type WorkPlan = Record<Sector, number>;

// Jobs in a sector, and how many of them have someone doing them.
export interface SectorJobs {
  jobs: number;
  hired: number;
}
export const SECTOR_OF: Partial<Record<ProjectType, Sector>> = {
  farm: "food",
  granary: "food",
  cannery: "food",
  education: "school",
  factory: "industry",
  estate: "food",
  modelFarm: "food",
  foundry: "industry",
  steelworks: "industry",
  mine: "industry",
  sawmill: "industry",
};

export interface ProvinceLabour {
  workers: number; // people of working age living here
  jobs: number; // positions in its working buildings
  foodStaffing: number; // 0..1, counting commuters from elsewhere
  schoolStaffing: number;
  industryStaffing: number;
  industryOutput: number; // industryStaffing, scaled by the skill of factory hands: what mines and sawmills run on
  unemployed: number; // workers living here with no job here or elsewhere
  commutersOut: number; // workers living here who work in another province
  openJobs: number; // jobs here nobody fills, from here or elsewhere
  sectors: Record<Sector, SectorJobs>; // where the jobs here are, and who fills them
}

export interface LabourSituation {
  workers: number; // people of working age
  jobs: number; // positions in every working building
  foodStaffing: number; // 0..1 for farms, granaries, canneries — filled first
  schoolStaffing: number; // 0..1 — filled next
  industryStaffing: number; // 0..1 for factories — whatever is left
  unemployed: number;
  unemploymentShare: number; // 0..1 of workers without a job
  skill: Record<Trade, number>; // 0.6..1: what those working in each trade give, against trained hands
  // Working buildings, counted by how fully they're staffed and how well (a
  // farm at half its workers counts as half a farm) — what production runs on.
  staffed: { farms: number; granaries: number; canneries: number; schools: number; factories: number };
  sectors: Record<Sector, SectorJobs>; // nationwide: food (farms, granaries, canneries), schools, factories
  provinces: Record<string, ProvinceLabour>;
}

// Whether the country as a whole has far more jobs than people to fill them.
// It compares jobs with all its workers, so jobs left open while others stand
// idle in another province don't count: more people wouldn't be the answer.
export function isShortOfWorkers(labour: Pick<LabourSituation, "jobs" | "workers">): boolean {
  return labour.jobs - labour.workers >= labour.workers * CAPTAIN_WORKER_SHORTAGE && labour.jobs > labour.workers;
}

// Everyone working in a trade today is whoever fills its sector.
export function getHiredInTrades(labour: Pick<LabourSituation, "sectors">): TrainedWorkers {
  return { food: labour.sectors.food.hired, industry: labour.sectors.industry.hired };
}

// The trade that services a building. Homes, roads and schools have none of
// their own, and go to the factory hands.
export function getTradeOf(type: ProjectType): Trade {
  return SECTOR_OF[type] === "food" ? "food" : "industry";
}

// Whether a crew for this building would be trained, as things stand today.
export function hasTrainedCrew(state: GameState, type: ProjectType): boolean {
  const trade = getTradeOf(type);
  return isCrewTrained(getLabourSituation(state).sectors[trade].hired, state.trained[trade]);
}

function staffing(hired: number, jobs: number): number {
  return jobs > 0 ? hired / jobs : 1;
}

export function getLabourSituation(state: GameState): LabourSituation {
  const provinceIds = getOwnedProvinceIds(state);
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
  }
  // What each province offers under the player's limits: all its jobs, on Automatic.
  const offered = (id: string, sector: Sector) => jobs[id][sector] * offeredShare[sector];
  const offeredShare: Record<Sector, number> = { food: 1, school: 1, industry: 1 };
  const plan = state.workPlan;
  if (plan) {
    for (const sector of SECTORS) {
      const total = provinceIds.reduce((sum, id) => sum + jobs[id][sector], 0);
      if (total > 0) offeredShare[sector] = Math.min(1, plan[sector] / total);
    }
  }
  // Crews at work on a service are away from the jobs of their province.
  const crews: Record<string, number> = {};
  for (const b of state.placedBuildings) {
    if (b.serviceUntilDay !== undefined && isWorking(b)) crews[b.provinceId] = (crews[b.provinceId] ?? 0) + SERVICE_CREW;
  }
  for (const id of provinceIds) {
    // Locals first.
    workers[id] = (state.provinces[id]?.population ?? 0) * LABOUR_SHARE;
    let left = Math.max(0, workers[id] - (crews[id] ?? 0));
    hired[id] = { food: 0, school: 0, industry: 0 };
    for (const sector of SECTORS) {
      const take = Math.min(left, offered(id, sector));
      hired[id][sector] = take;
      left -= take;
    }
    idle[id] = left;
  }

  // Then commuters: a share of everyone left idle fills open jobs anywhere
  // on the mainland, in the same order, spread over the provinces with
  // openings. Nobody commutes across the sea, to or from an island.
  const mainland = provinceIds.filter((id) => !isIsland(id));
  const totalIdle = mainland.reduce((sum, id) => sum + idle[id], 0);
  let pool = totalIdle * COMMUTE_SHARE;
  for (const sector of SECTORS) {
    const open = mainland.reduce((sum, id) => sum + (offered(id, sector) - hired[id][sector]), 0);
    const take = Math.min(pool, open);
    if (take <= 0) continue;
    for (const id of mainland) hired[id][sector] += (take * (offered(id, sector) - hired[id][sector])) / open;
    pool -= take;
  }
  const commuters = totalIdle * COMMUTE_SHARE - pool;
  const out: Record<string, number> = {}; // people from here working in another province
  const jobless: Record<string, number> = {};
  for (const id of provinceIds) {
    out[id] = totalIdle > 0 && !isIsland(id) ? (commuters * idle[id]) / totalIdle : 0;
    jobless[id] = idle[id] - out[id];
  }
  if (plan) {
    // A limit never leaves anyone jobless: those left over take any job still
    // open, at home first, and then whoever would travel and hasn't yet.
    for (const id of provinceIds) {
      for (const sector of SECTORS) {
        const take = Math.min(jobless[id], jobs[id][sector] - hired[id][sector]);
        hired[id][sector] += take;
        jobless[id] -= take;
      }
    }
    const stillIdle = mainland.reduce((sum, id) => sum + jobless[id], 0);
    let travelling = Math.min(pool, stillIdle);
    const willing = travelling;
    for (const sector of SECTORS) {
      const open = mainland.reduce((sum, id) => sum + (jobs[id][sector] - hired[id][sector]), 0);
      const take = Math.min(travelling, open);
      if (take <= 0) continue;
      for (const id of mainland) hired[id][sector] += (take * (jobs[id][sector] - hired[id][sector])) / open;
      travelling -= take;
    }
    const travelled = willing - travelling;
    if (travelled > 0) {
      for (const id of mainland) {
        const share = (travelled * jobless[id]) / stillIdle;
        out[id] += share;
        jobless[id] -= share;
      }
    }
  }

  const sectorHired = (sector: Sector) => provinceIds.reduce((sum, id) => sum + hired[id][sector], 0);
  const skill: Record<Trade, number> = {
    food: getSkill(sectorHired("food"), state.trained.food),
    industry: getSkill(sectorHired("industry"), state.trained.industry),
  };

  const provinces: Record<string, ProvinceLabour> = {};
  const staffed = { farms: 0, granaries: 0, canneries: 0, schools: 0, factories: 0 };
  const totals = { workers: 0, unemployed: 0, jobs: { food: 0, school: 0, industry: 0 }, hired: { food: 0, school: 0, industry: 0 } };
  for (const id of provinceIds) {
    const p: ProvinceLabour = {
      workers: workers[id],
      jobs: jobs[id].food + jobs[id].school + jobs[id].industry,
      foodStaffing: staffing(hired[id].food, jobs[id].food),
      schoolStaffing: staffing(hired[id].school, jobs[id].school),
      industryStaffing: staffing(hired[id].industry, jobs[id].industry),
      industryOutput: staffing(hired[id].industry, jobs[id].industry) * skill.industry,
      unemployed: jobless[id],
      commutersOut: out[id],
      openJobs: SECTORS.reduce((sum, sector) => sum + jobs[id][sector] - hired[id][sector], 0),
      sectors: {
        food: { jobs: jobs[id].food, hired: hired[id].food },
        school: { jobs: jobs[id].school, hired: hired[id].school },
        industry: { jobs: jobs[id].industry, hired: hired[id].industry },
      },
    };
    provinces[id] = p;
    const here = buildings[id];
    // A larger building counts as the plain ones it does the work of.
    staffed.farms += ((here.farm ?? 0) + (here.estate ?? 0) * FARMS_PER_ESTATE + (here.modelFarm ?? 0) * FARMS_PER_MODEL_FARM) * p.foodStaffing * skill.food;
    staffed.granaries += (here.granary ?? 0) * p.foodStaffing * skill.food;
    staffed.canneries += (here.cannery ?? 0) * p.foodStaffing * skill.food;
    staffed.schools += (here.education ?? 0) * p.schoolStaffing;
    staffed.factories += ((here.factory ?? 0) + (here.foundry ?? 0) * FACTORIES_PER_FOUNDRY + (here.steelworks ?? 0) * FACTORIES_PER_STEELWORKS) * p.industryStaffing * skill.industry;
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
    skill,
    staffed,
    sectors: {
      food: { jobs: totals.jobs.food, hired: totals.hired.food },
      school: { jobs: totals.jobs.school, hired: totals.hired.school },
      industry: { jobs: totals.jobs.industry, hired: totals.hired.industry },
    },
    provinces,
  };
}
