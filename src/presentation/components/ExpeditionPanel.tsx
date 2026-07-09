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

export function ExpeditionPanel({ state, selectedIslandId, dispatch }: ExpeditionPanelProps) {
  if (!selectedIslandId) {
    return (
      <section className="panel expedition-panel">
        <h2>Ventures</h2>
        <p className="expedition-panel__hint">Click an unclaimed island on the map to charter a venture there.</p>
      </section>
    );
  }

  const island = MAP_GEOMETRY.otherLandmasses.find((land) => land.id === selectedIslandId);
  const data = getIslandExpeditionData(selectedIslandId);
  const inProgress = state.expeditions.find((e) => e.islandId === selectedIslandId);
  const isScouted = state.scoutedIslandIds.includes(selectedIslandId);

  return (
    <section className="panel expedition-panel">
      <h2>Ventures</h2>
      <h3 className="expedition-panel__island">{island?.name ?? "Unknown island"}</h3>

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
            disabled={!canSendExpedition(state, selectedIslandId)}
            onClick={() => dispatch((s) => sendExpedition(s, selectedIslandId))}
          >
            Charter Venture ({EXPEDITION_COST} {CURRENCY_SYMBOL})
          </button>
        </>
      )}
    </section>
  );
}
