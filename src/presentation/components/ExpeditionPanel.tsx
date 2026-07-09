import "./ExpeditionPanel.css";
import { canSendExpedition, sendExpedition } from "../../application/actions";
import { CURRENCY_SYMBOL, EXPEDITION_COST, EXPEDITION_DAYS } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getIslandExpeditionData } from "../../domain/expeditions/expeditionData";
import { expeditionProgress } from "../../domain/expeditions/expeditionRules";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";

interface ExpeditionPanelProps {
  state: GameState;
  selectedIslandId: string | null;
  dispatch: (action: (state: GameState) => GameState) => void;
}

// Lists every unclaimed island at once — opened deliberately (top bar button
// or clicking an island on the map), so there's no need to make the player
// pick an island first the way the old always-visible sidebar panel did.
export function ExpeditionPanel({ state, selectedIslandId, dispatch }: ExpeditionPanelProps) {
  return (
    <div className="expedition-panel">
      <p className="resources-panel__hint">Charter a venture to an unclaimed island for a one-time reward.</p>

      {MAP_GEOMETRY.otherLandmasses.map((island) => {
        const data = getIslandExpeditionData(island.id);
        const inProgress = state.expeditions.find((e) => e.islandId === island.id);
        const isScouted = state.scoutedIslandIds.includes(island.id);
        const isFocused = island.id === selectedIslandId;

        return (
          <div className={["expedition-panel__island-card", isFocused ? "is-focused" : ""].join(" ")} key={island.id}>
            <h3 className="expedition-panel__island">{island.name}</h3>

            {isScouted && data && <p className="expedition-panel__result">Charted. {data.reward.flavor}</p>}

            {!isScouted && inProgress && (
              <>
                <p className="expedition-panel__hint">Venture under way — {Math.ceil(inProgress.daysRemaining)} days left.</p>
                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: `${Math.round(expeditionProgress(inProgress) * 100)}%` }} />
                </div>
              </>
            )}

            {!isScouted && !inProgress && (
              <>
                <p className="expedition-panel__hint">Uncharted. Chartering a venture there takes {EXPEDITION_DAYS} days.</p>
                <button
                  disabled={!canSendExpedition(state, island.id)}
                  onClick={() => dispatch((s) => sendExpedition(s, island.id))}
                >
                  Charter Venture ({EXPEDITION_COST} {CURRENCY_SYMBOL})
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
