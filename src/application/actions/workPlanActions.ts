// The player's choice of how many people work where, for the whole country.
// Nothing here changes who works where today: a change waits in workPlanNext
// for the month's end (see day/workers.ts), and can be taken back until then.
import { WORK_PLAN_STEP } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getLabourSituation, SECTORS, type Sector, type WorkPlan } from "../../domain/labour/labourRules";

export type WorkMove = "more" | "fewer";

// The limits as they will be after the month's end, or null for Automatic.
export function getComingWorkPlan(state: GameState): WorkPlan | null {
  if (state.workPlanNext === "automatic") return null;
  return state.workPlanNext ?? state.workPlan;
}

// Who works where today, as limits to start from.
function getWorkToday(state: GameState): WorkPlan {
  const { sectors } = getLabourSituation(state);
  return { food: Math.round(sectors.food.hired), school: Math.round(sectors.school.hired), industry: Math.round(sectors.industry.hired) };
}

function isSamePlan(a: WorkPlan | null, b: WorkPlan | null): boolean {
  if (!a || !b) return a === b;
  return SECTORS.every((sector) => a[sector] === b[sector]);
}

function withComingPlan(state: GameState, plan: WorkPlan | null): GameState {
  const next = isSamePlan(plan, state.workPlan) ? null : (plan ?? "automatic");
  return next === state.workPlanNext ? state : { ...state, workPlanNext: next };
}

// More: as many as there are jobs for, from people no limit has placed, and
// then from the fullest other sector. Fewer: they go to the next sector with
// jobs for them. The total never passes the country's workers.
function movedPlan(state: GameState, sector: Sector, move: WorkMove): WorkPlan | null {
  const labour = getLabourSituation(state);
  const plan = { ...(getComingWorkPlan(state) ?? getWorkToday(state)) };
  const others = [...SECTORS.slice(SECTORS.indexOf(sector) + 1), ...SECTORS.slice(0, SECTORS.indexOf(sector))];
  if (move === "more") {
    const room = Math.min(WORK_PLAN_STEP, labour.sectors[sector].jobs - plan[sector]);
    const unplaced = Math.max(0, Math.round(labour.workers) - SECTORS.reduce((sum, s) => sum + plan[s], 0));
    const fullest = [...others].sort((a, b) => plan[b] - plan[a])[0];
    const moved = Math.min(room, unplaced + plan[fullest]);
    if (moved <= 0) return null;
    plan[fullest] -= Math.max(0, moved - unplaced);
    plan[sector] += moved;
    return plan;
  }
  let left = Math.min(WORK_PLAN_STEP, plan[sector]);
  if (left <= 0) return null;
  plan[sector] -= left;
  for (const other of others) {
    const taken = Math.min(left, Math.max(0, labour.sectors[other].jobs - plan[other]));
    plan[other] += taken;
    left -= taken;
  }
  return plan;
}

export function canMoveWorkers(state: GameState, sector: Sector, move: WorkMove): boolean {
  return movedPlan(state, sector, move) !== null;
}

export function moveWorkers(state: GameState, sector: Sector, move: WorkMove): GameState {
  const plan = movedPlan(state, sector, move);
  return plan ? withComingPlan(state, plan) : state;
}

// Set the limits exactly. The scripted players use this.
export function setWorkPlan(state: GameState, plan: WorkPlan): GameState {
  return withComingPlan(state, plan);
}

// From the month's end, limits at what each sector has today.
export function chooseWork(state: GameState): GameState {
  return getComingWorkPlan(state) ? state : withComingPlan(state, state.workPlan ?? getWorkToday(state));
}

// From the month's end, jobs fill by themselves again.
export function chooseAutomaticWork(state: GameState): GameState {
  return withComingPlan(state, null);
}

// Take back a change that hasn't happened yet.
export function cancelWorkChange(state: GameState): GameState {
  return state.workPlanNext ? { ...state, workPlanNext: null } : state;
}
