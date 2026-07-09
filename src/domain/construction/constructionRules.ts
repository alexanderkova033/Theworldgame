// Generic progress rules shared by every construction/research project,
// regardless of what type of project it is.
import type { Project } from "./types";

export function advanceProject(project: Project, progressPerDay: number): Project {
  const daysRemaining = Math.max(0, project.daysRemaining - progressPerDay);
  return { ...project, daysRemaining };
}

export function isProjectComplete(project: Project): boolean {
  return project.daysRemaining <= 0;
}

// Returns a 0..1 fraction of how complete the project is, for progress bars.
export function projectProgress(project: Project): number {
  if (project.totalDays <= 0) return 1;
  return 1 - project.daysRemaining / project.totalDays;
}
