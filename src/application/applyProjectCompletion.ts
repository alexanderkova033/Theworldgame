// Use case: apply the permanent effect of a finished project. This touches
// multiple domain slices at once (which project type -> which count goes up),
// so it lives here in the application layer rather than in one domain module.
// A building raised or pulled down some other way (a story's letter, see
// application/storyOutcome.ts) goes through the same two functions.
import type { GameState } from "../domain/country/types";
import type { Project, ProjectType } from "../domain/construction/types";
import type { PlacedBuilding } from "../domain/provinces/types";

// The country's tally of a kind of building, changed by `by`. Homes and
// harbours are counted straight from placedBuildings (see getWorkingCounts
// and domain/islands).
function tally(state: GameState, type: ProjectType, by: number): GameState {
  switch (type) {
    case "farm":
      return { ...state, farmCount: state.farmCount + by };
    case "factory":
      return { ...state, factoryCount: state.factoryCount + by };
    case "road":
      return { ...state, roadCount: state.roadCount + by };
    case "granary":
      return { ...state, granaryCount: state.granaryCount + by };
    case "cannery":
      return { ...state, canneryCount: state.canneryCount + by };
    case "education":
      return { ...state, educationLevel: state.educationLevel + by };
    default:
      return state;
  }
}

export function placeBuilding(state: GameState, building: PlacedBuilding): GameState {
  return tally({ ...state, placedBuildings: [...state.placedBuildings, building] }, building.type, 1);
}

export function pullDownBuilding(state: GameState, buildingId: string): GameState {
  const building = state.placedBuildings.find((b) => b.id === buildingId);
  if (!building) return state;
  return tally({ ...state, placedBuildings: state.placedBuildings.filter((b) => b.id !== buildingId) }, building.type, -1);
}

export function applyProjectCompletion(state: GameState, project: Project): GameState {
  return placeBuilding(state, { id: project.id, provinceId: project.provinceId, type: project.type });
}
