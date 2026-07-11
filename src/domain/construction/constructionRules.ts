// Generic progress rules shared by every construction/research project,
// regardless of what type of project it is.
import { STALLED_PROJECT_REGRESS_FACTOR } from "../constants";
import type { Project } from "./types";

// canAffordToday is decided by the caller (simulateDay.ts has the treasury/
// resource context this function doesn't) — when a project can't pay its
// daily installment, it doesn't just pause, it slips backward at a fraction
// of its normal pace, never past totalDays (i.e. never past "not started").
export function advanceProject(project: Project, progressPerDay: number, canAffordToday: boolean): Project {
  if (canAffordToday) {
    return { ...project, daysRemaining: Math.max(0, project.daysRemaining - progressPerDay), isStalled: false };
  }
  const regress = progressPerDay * STALLED_PROJECT_REGRESS_FACTOR;
  return { ...project, daysRemaining: Math.min(project.totalDays, project.daysRemaining + regress), isStalled: true };
}

export function isProjectComplete(project: Project): boolean {
  return project.daysRemaining <= 0;
}

// Returns a 0..1 fraction of how complete the project is, for progress bars.
export function projectProgress(project: Project): number {
  if (project.totalDays <= 0) return 1;
  return 1 - project.daysRemaining / project.totalDays;
}
