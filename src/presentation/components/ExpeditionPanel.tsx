import "./ExpeditionPanel.css";
import { canSendExpedition, sendExpedition } from "../../application/actions";
import { CURRENCY_SYMBOL, EXPEDITION_COST, EXPEDITION_DAYS } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getIslandExpeditionData } from "../../domain/expeditions/expeditionData";
import { expeditionProgress } from "../../domain/expeditions/expeditionRules";
import type { ExpeditionReward } from "../../domain/expeditions/types";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";

interface ExpeditionPanelProps {
  state: GameState;
  selectedIslandId: string | null;
  dispatch: (action: (state: GameState) => GameState) => void;
}

// An undiscovered island's icon — a plain landmass silhouette, deliberately
// generic so it doesn't hint at what a venture there will find.
function UnchartedIslandIcon() {
  return (
    <svg viewBox="-10 -10 20 20">
      <path
        d="M-7,3 C-7,-2.5 -3.2,-6.5 0,-6.5 C3.2,-6.5 7,-2.5 7,3 C7,6.2 3.2,7.2 0,7.2 C-3.2,7.2 -7,6.2 -7,3 Z"
        fill="#5c5138"
        stroke="#3a331f"
        strokeWidth={0.7}
      />
      <circle cx={-1.8} cy={-3} r={1.4} fill="#7a8f5c" />
      <circle cx={2.2} cy={-1.2} r={1} fill="#7a8f5c" opacity={0.85} />
    </svg>
  );
}

// Once a venture has actually resolved, swap the generic island icon for
// whatever it found — the reward line already spells this out in text.
function RewardIcon({ reward }: { reward: ExpeditionReward }) {
  if (reward.resourceType) return <ResourceIcon type={reward.resourceType} size={8} />;
  if (reward.stabilityDelta !== undefined) return <StatIcon type="stability" size={34} />;
  return <StatIcon type="treasury" size={34} />;
}

// Lists every unclaimed island at once — opened deliberately (top bar button
// or clicking an island on the map), so there's no need to make the player
// pick an island first the way the old always-visible sidebar panel did.
export function ExpeditionPanel({ state, selectedIslandId, dispatch }: ExpeditionPanelProps) {
  return (
    <div className="expedition-panel">
      <p className="panel-hint">Charter a venture to an unclaimed island for a one-time reward.</p>

      {MAP_GEOMETRY.otherLandmasses.map((island) => {
        const data = getIslandExpeditionData(island.id);
        const inProgress = state.expeditions.find((e) => e.islandId === island.id);
        const isScouted = state.scoutedIslandIds.includes(island.id);
        const isFocused = island.id === selectedIslandId;

        return (
          <div className={["expedition-panel__island-card", isFocused ? "is-focused" : ""].join(" ")} key={island.id}>
            <div className="expedition-panel__icon">
              {isScouted && data ? (
                <svg viewBox="-10 -10 20 20">
                  <RewardIcon reward={data.reward} />
                </svg>
              ) : (
                <UnchartedIslandIcon />
              )}
            </div>
            <div className="expedition-panel__body">
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
          </div>
        );
      })}
    </div>
  );
}
