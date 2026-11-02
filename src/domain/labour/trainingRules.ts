// Trained workers. A country has two trades: farm hands (farms, granaries,
// canneries) and factory hands (factories, mines, sawmills). Schools have no
// trade. A trade is a count of people who know the work, whether or not
// they're doing it today: a broken farm's hands are still farm hands.
//
// Anyone working beyond a trade's count is a learner, at UNTRAINED_EFFICIENCY.
// Each month a share of the gap is learned (TRAINING_RATE), so a new hand is at
// 68% after a month, 90% after six and 97% after twelve. The trades together
// can't hold more people than the country has workers, so an old skill fades
// only as a new one is learned, and the dead and the departed leave the count.
//
// Skill is national: every province's staffing is scaled by the same figure.
// The numbers of people working (see labourRules.ts) don't depend on it.
import { LABOUR_SHARE, SERVICE_CREW, SERVICE_CREW_TRAINED_SHARE, TRAINING_RATE, UNTRAINED_EFFICIENCY } from "../constants";

export type Trade = "food" | "industry";
export const TRADES: Trade[] = ["food", "industry"];

export type TrainedWorkers = Record<Trade, number>;

// How much of a full worker's output a trade's people give, 0.6..1.
export function getSkill(hired: number, trained: number): number {
  if (hired <= 0 || trained >= hired) return 1;
  return UNTRAINED_EFFICIENCY + ((1 - UNTRAINED_EFFICIENCY) * Math.max(0, trained)) / hired;
}

// Everyone working on the first day knows their work: the farms fill first,
// and the factories get the rest, as they do when jobs are filled.
export function getStartingTrained(population: number, foodJobs: number, industryJobs: number): TrainedWorkers {
  const workers = population * LABOUR_SHARE;
  const food = Math.min(workers, foodJobs);
  return { food, industry: Math.min(workers - food, industryJobs) };
}

// The turn of a month: those working learn, and the trades give way when
// together they hold more than the country's workers. People trained in a trade
// but not working in it go first, then both alike.
export function advanceTraining(trained: TrainedWorkers, hired: TrainedWorkers, workers: number): TrainedWorkers {
  let food = trained.food + Math.max(0, hired.food - trained.food) * TRAINING_RATE;
  let industry = trained.industry + Math.max(0, hired.industry - trained.industry) * TRAINING_RATE;
  let over = food + industry - workers;
  if (over > 0) {
    const spareFood = Math.min(over, Math.max(0, food - hired.food));
    food -= spareFood;
    over -= spareFood;
    const spareIndustry = Math.min(over, Math.max(0, industry - hired.industry));
    industry -= spareIndustry;
    over -= spareIndustry;
    if (over > 0) {
      const total = food + industry;
      food -= (over * food) / total;
      industry -= (over * industry) / total;
    }
  }
  return { food, industry };
}

// A crew counts as trained when most of those working in its trade are. With
// nobody working in the trade, it needs enough trained people for a crew.
export function isCrewTrained(hired: number, trained: number): boolean {
  if (hired <= 0) return trained >= SERVICE_CREW;
  return Math.min(trained, hired) / hired >= SERVICE_CREW_TRAINED_SHARE;
}
