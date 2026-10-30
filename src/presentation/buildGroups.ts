// The kinds of building: the groups the Build window rules off from one
// another and the map's slot plates follow (see BuildPanel, MapBuildSlots).
import { buildCannery, buildEducation, buildFactory, buildFarm, buildGranary, buildHarbour, buildHousing, buildRoad } from "../application/actions";
import type { BuildAction } from "../application/actions/createBuildAction";
import { isFeatureOpen } from "../domain/chapters/chapterData";
import type { ProjectType } from "../domain/construction/types";
import type { GameState } from "../domain/country/types";
import { isBuildingUnlocked } from "../domain/research/researchRules";

export type BuildGroup = "people" | "food" | "industry" | "sea";

// Where Build can open: one group of buildings, or Repairs below them.
export type BuildRail = BuildGroup | "repairs";

export const BUILD_GROUPS: Array<{ key: BuildGroup; title: string; picture: ProjectType }> = [
  { key: "people", title: "Homes & learning", picture: "housing" },
  { key: "food", title: "Food", picture: "farm" },
  { key: "industry", title: "Industry & roads", picture: "factory" },
  { key: "sea", title: "The sea", picture: "harbour" },
];

// Every kind of building by group, in the order the Build window and the
// map's slot plates show them.
export const BUILD_ROWS: Array<{ group: BuildGroup; actions: BuildAction[] }> = [
  { group: "people", actions: [buildHousing, buildEducation] },
  { group: "food", actions: [buildFarm, buildGranary, buildCannery] },
  { group: "industry", actions: [buildFactory, buildRoad] },
  { group: "sea", actions: [buildHarbour] },
];

// The kinds of building open to the player today: not shut behind a chapter
// or a research step. What's open in one province comes on top of this.
export function getOpenBuildKinds(state: GameState): ProjectType[] {
  return BUILD_ROWS.flatMap((row) => row.actions)
    .filter(({ config }) => (!config.feature || isFeatureOpen(state, config.feature)) && (!config.requiresResearch || isBuildingUnlocked(state.enactedResearchIds, config.type)))
    .map(({ config }) => config.type);
}
