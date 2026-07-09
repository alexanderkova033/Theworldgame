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
        <h2>Scouting</h2>
        <p className="expedition-panel__hint">Click an unclaimed island on the map to send an expedition.</p>
      </section>
    );
  }

  const island = MAP_GEOMETRY.otherLandmasses.find((land) => land.id === selectedIslandId);
  const data = getIslandExpeditionData(selectedIslandId);
  const inProgress = state.expeditions.find((e) => e.islandId === selectedIslandId);
  const isScouted = state.scoutedIslandIds.includes(selectedIslandId);

  return (
    <section className="panel expedition-panel">
      <h2>Scouting</h2>
      <h3 className="expedition-panel__island">{island?.name ?? "Unknown island"}</h3>

      {isScouted && data && <p className="expedition-panel__result">Scouted. {data.reward.flavor}</p>}

      {!isScouted && inProgress && (
        <>
          <p className="expedition-panel__hint">Expedition under way — {Math.ceil(inProgress.daysRemaining)} days left.</p>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${Math.round(expeditionProgress(inProgress) * 100)}%` }} />
          </div>
        </>
      )}

      {!isScouted && !inProgress && (
        <>
          <p className="expedition-panel__hint">Unexplored. Sending an expedition takes {EXPEDITION_DAYS} days.</p>
          <button
            disabled={!canSendExpedition(state, selectedIslandId)}
            onClick={() => dispatch((s) => sendExpedition(s, selectedIslandId))}
          >
            Send Expedition ({EXPEDITION_COST} {CURRENCY_SYMBOL})
          </button>
        </>
      )}
    </section>
  );
}
