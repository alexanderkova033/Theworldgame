// The kinds of building, as the Build window's rail shows them: each by
// the picture of a building of its kind, named in its tip (see BuildPanel).
import type { ProjectType } from "../domain/construction/types";

export type BuildGroup = "people" | "food" | "industry" | "sea";

// One stop on the rail: a kind of building, or Repairs below them.
export type BuildRail = BuildGroup | "repairs";

export const BUILD_GROUPS: Array<{ key: BuildGroup; title: string; picture: ProjectType }> = [
  { key: "people", title: "Homes & learning", picture: "housing" },
  { key: "food", title: "Food", picture: "farm" },
  { key: "industry", title: "Industry & roads", picture: "factory" },
  { key: "sea", title: "The sea", picture: "harbour" },
];
