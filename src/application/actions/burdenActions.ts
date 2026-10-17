// Use case: after a Long Reign election win, take one of the burdens on
// offer (see domain/reign). The game waits until one is taken.
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import type { BurdenId } from "../../domain/reign/reignData";
import { describeBurden, getBurden } from "../../domain/reign/reignRules";

export function takeBurden(state: GameState, id: BurdenId): GameState {
  if (!state.burdenOffer?.includes(id)) return state;
  const burden = getBurden(id);
  return {
    ...state,
    burdens: [...state.burdens, id],
    burdenOffer: null,
    events: [
      {
        id: generateId("event"),
        date: state.date,
        message: `You take on ${burden.name}: ${describeBurden(burden).join(", ").toLowerCase()}.`,
        severity: "warning",
        topic: "elections",
      },
      ...state.events,
    ],
  };
}
