import "./ExpeditionPanel.css";
import { canFoundSettlement, canSendExpedition, foundSettlement, sendExpedition } from "../../application/actions";
import { CURRENCY_SYMBOL, EXPEDITION_COST, EXPEDITION_DAYS, SETTLE_COST, SETTLE_DAYS, SETTLE_WOOD } from "../../domain/constants";
import { getIslandData } from "../../domain/islands/islandData";
import { whyNotSettle } from "../../domain/islands/islandRules";
import { formatAmount } from "../formatNumber";
import type { GameState } from "../../domain/country/types";
import { getIslandExpeditionData } from "../../domain/expeditions/expeditionData";
import { expeditionProgress } from "../../domain/expeditions/expeditionRules";
import type { ExpeditionReward } from "../../domain/expeditions/types";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import { playShipBell } from "../audio/sound";
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
// whatever it found — the reward line already spells this out in text. A
// resource is drawn into a frame of its own; a stat icon is its own svg.
function RewardIcon({ reward }: { reward: ExpeditionReward }) {
  if (reward.resourceType) {
    return (
      <svg viewBox="-10 -10 20 20">
        <ResourceIcon type={reward.resourceType} size={8} />
      </svg>
    );
  }
  return <StatIcon type={reward.stabilityDelta !== undefined ? "stability" : "treasury"} size={34} />;
}

// A scouted island: what makes it worth settling, who lives there, and the
// next step: found a settlement, the ship on its way, or settled.
function SettleSection({ state, islandId, dispatch }: { state: GameState; islandId: string; dispatch: ExpeditionPanelProps["dispatch"] }) {
  const island = getIslandData(islandId);
  const sailing = state.settlements.find((s) => s.islandId === islandId);
  const why = whyNotSettle(state, islandId);
  const short =
    state.stats.treasury < SETTLE_COST
      ? `Needs ${formatAmount(SETTLE_COST)} ${CURRENCY_SYMBOL}`
      : state.resources.wood < SETTLE_WOOD
        ? `Needs ${SETTLE_WOOD} wood`
        : undefined;
  return (
    <div className="expedition-panel__settle">
      {island && <p className="expedition-panel__trait">{island.traitText}</p>}
      {island?.locals && (
        <p className="expedition-panel__locals">
          People live here: {island.locals.name}, about {formatAmount(island.locals.people)}.
        </p>
      )}
      {state.settledIslandIds.includes(islandId) && !state.lostProvinceIds.includes(islandId) && (
        <p className="expedition-panel__hint">Settled: one of your provinces.</p>
      )}
      {state.lostProvinceIds.includes(islandId) && <p className="expedition-panel__hint">Broke away, and is free.</p>}
      {sailing && (
        <>
          <p className="expedition-panel__hint">Settlers on their way, {Math.ceil(sailing.daysRemaining)}d left</p>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${Math.round((1 - sailing.daysRemaining / sailing.totalDays) * 100)}%` }} />
          </div>
        </>
      )}
      {!why && (
        <button
          className="btn-primary"
          disabled={!canFoundSettlement(state, islandId)}
          title={short ?? `Settlers sail with the makings of their first homes, and land in about ${SETTLE_DAYS} days. They come from your most crowded province.`}
          onClick={() => {
            playShipBell();
            dispatch((s) => foundSettlement(s, islandId));
          }}
        >
          Found a Settlement ({formatAmount(SETTLE_COST)} {CURRENCY_SYMBOL} + {SETTLE_WOOD} wood)
        </button>
      )}
      {why && island?.locals && !state.settledIslandIds.includes(islandId) && <p className="expedition-panel__hint">{why}</p>}
    </div>
  );
}

// Lists every unclaimed island at once — opened deliberately (an island on
// the map, or a venture line in the event log), so there's no need to make the player
// pick an island first the way the old always-visible sidebar panel did.
export function ExpeditionPanel({ state, selectedIslandId, dispatch }: ExpeditionPanelProps) {
  return (
    <div className="expedition-panel">
      <p className="panel-hint">A venture scouts an island and brings back what it finds. Then an empty island can be settled and held like a province.</p>

      {MAP_GEOMETRY.islands.map((island) => {
        const data = getIslandExpeditionData(island.id);
        const inProgress = state.expeditions.find((e) => e.islandId === island.id);
        const isScouted = state.scoutedIslandIds.includes(island.id);
        const isFocused = island.id === selectedIslandId;

        return (
          <div className={["expedition-panel__island-card", isFocused ? "is-focused" : ""].join(" ")} key={island.id}>
            <div className="expedition-panel__icon" aria-hidden="true">
              {isScouted && data ? (
                <RewardIcon reward={data.reward} />
              ) : (
                <UnchartedIslandIcon />
              )}
            </div>
            <div className="expedition-panel__body">
              <h3 className="expedition-panel__island">{island.name}</h3>

              {isScouted && data && <p className="expedition-panel__result">{data.reward.flavor}</p>}
              {isScouted && <SettleSection state={state} islandId={island.id} dispatch={dispatch} />}

              {!isScouted && inProgress && (
                <>
                  <p className="expedition-panel__hint">Under way, {Math.ceil(inProgress.daysRemaining)}d left</p>
                  <div className="progress-bar">
                    <div className="progress-bar__fill" style={{ width: `${Math.round(expeditionProgress(inProgress) * 100)}%` }} />
                  </div>
                </>
              )}

              {!isScouted && !inProgress && (
                <>
                  <p className="expedition-panel__hint">Uncharted · {EXPEDITION_DAYS}d voyage</p>
                  <button
                    className="btn-primary"
                    disabled={!canSendExpedition(state, island.id)}
                    onClick={() => {
                      playShipBell();
                      dispatch((s) => sendExpedition(s, island.id));
                    }}
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
