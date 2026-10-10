// Labour: buildings don't run themselves. Every farm, factory, granary,
// cannery and school needs workers, and workers come from the population
// (LABOUR_SHARE of it — the rest are children, the old, and households).
// Workers go where they're most needed first: food (farms, granaries,
// canneries), then schools, then factories. So when hands run short a new
// farm still feeds people — it's the factories that go quiet. And with
// more workers than jobs, the unemployed weigh on public opinion (see
// politicsRules.ts).
import { JOBS_PER_BUILDING, LABOUR_SHARE } from "../constants";
import type { GameState } from "../country/types";
import { getWorkingCounts } from "../maintenance/maintenanceRules";
import { getResearchEffectsFor } from "../research/researchRules";

export interface LabourSituation {
  workers: number; // people of working age
  jobs: number; // positions in every working building
  foodStaffing: number; // 0..1 for farms, granaries, canneries — filled first
  schoolStaffing: number; // 0..1 — filled next
  industryStaffing: number; // 0..1 for factories — whatever is left
  unemployed: number;
  unemploymentShare: number; // 0..1 of workers without a job
}

function fill(available: number, jobs: number): { staffing: number; left: number } {
  if (jobs <= 0) return { staffing: 1, left: available };
  const hired = Math.min(available, jobs);
  return { staffing: hired / jobs, left: available - hired };
}

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

export function getLabourSituation(state: GameState): LabourSituation {
  const working = getWorkingCounts(state);
  const jobsPer = getJobsPerBuilding(state);
  const foodJobs = working.farms * jobsPer.farm + working.granaries * jobsPer.granary + working.canneries * jobsPer.cannery;
  const schoolJobs = working.schools * jobsPer.education;
  const industryJobs = working.factories * jobsPer.factory;

  const workers = state.stats.population * LABOUR_SHARE;
  const food = fill(workers, foodJobs);
  const schools = fill(food.left, schoolJobs);
  const industry = fill(schools.left, industryJobs);

  return {
    workers,
    jobs: foodJobs + schoolJobs + industryJobs,
    foodStaffing: food.staffing,
    schoolStaffing: schools.staffing,
    industryStaffing: industry.staffing,
    unemployed: industry.left,
    unemploymentShare: workers > 0 ? industry.left / workers : 0,
  };
}
