// Use case: apply the permanent effect of a finished project. This touches
// multiple domain slices at once (which project type -> which count goes up),
// so it lives here in the application layer rather than in one domain module.
import type { GameState } from "../domain/country/types";
import type { Project } from "../domain/construction/types";

export function applyProjectCompletion(state: GameState, project: Project): GameState {
  switch (project.type) {
    case "farm":
      return { ...state, farmCount: state.farmCount + 1 };
    case "factory":
      return { ...state, factoryCount: state.factoryCount + 1 };
    case "road":
      return { ...state, roadCount: state.roadCount + 1 };
    case "education":
      return { ...state, educationLevel: state.educationLevel + 1 };
    case "research":
      return { ...state, researchLevel: state.researchLevel + 1 };
    default:
      return state;
  }
}
