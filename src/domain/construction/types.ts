export type ProjectType = "farm" | "factory" | "road" | "education" | "research";

export interface Project {
  id: string;
  type: ProjectType;
  label: string;
  totalDays: number;
  daysRemaining: number;
}
