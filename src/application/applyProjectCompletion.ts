// Use case: apply the permanent effect of a finished project. This touches
// multiple domain slices at once (which project type -> which count goes up),
// so it lives here in the application layer rather than in one domain module.
import type { GameState } from "../domain/country/types";
import type { Project } from "../domain/construction/types";
import type { PlacedBuilding } from "../domain/provinces/types";

export function applyProjectCompletion(state: GameState, project: Project): GameState {
  const placedBuilding: PlacedBuilding = {
    id: project.id,
    provinceId: project.provinceId,
    type: project.type,
  };
  const placedBuildings = [...state.placedBuildings, placedBuilding];

  switch (project.type) {
    case "farm":
      return { ...state, farmCount: state.farmCount + 1, placedBuildings };
    case "factory":
      return { ...state, factoryCount: state.factoryCount + 1, placedBuildings };
    case "road":
      return { ...state, roadCount: state.roadCount + 1, placedBuildings };
    case "granary":
      return { ...state, granaryCount: state.granaryCount + 1, placedBuildings };
    case "cannery":
      return { ...state, canneryCount: state.canneryCount + 1, placedBuildings };
    case "education":
      return { ...state, educationLevel: state.educationLevel + 1, placedBuildings };
    default:
      return state;
  }
}
