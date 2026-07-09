import { useState } from "react";
import { canTrade, tradeResources } from "../../application/actions";
import { TRADE_BATCH_SIZE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getNation } from "../../domain/nations/nationRules";
import { nationHasPort, getTradeRate } from "../../domain/resources/tradeRules";
import { RESOURCE_TYPES, type ResourceType } from "../../domain/resources/types";

interface TradePanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
}

const RESOURCE_LABELS: Record<ResourceType, string> = {
  wood: "Wood",
  ore: "Ore",
  grain: "Grain",
  fish: "Fish",
};

export function TradePanel({ state, dispatch }: TradePanelProps) {
  const [give, setGive] = useState<ResourceType>("grain");
  const [receive, setReceive] = useState<ResourceType>("wood");

  const nation = getNation(state.nationId);
  const rate = getTradeRate(nation);
  const hasPort = nationHasPort(nation);
  const giveAmount = rate * TRADE_BATCH_SIZE;
  const enabled = give !== receive && canTrade(state, give, receive);

  return (
    <section className="panel trade-panel">
      <h2>Trade</h2>
      <p className="resources-panel__hint">
        Trade with the continental market at {rate}:1{hasPort ? " (you have a port — better rate)" : ""}.
      </p>

      <div className="trade-panel__row">
        <label className="trade-panel__field">
          Give
          <select value={give} onChange={(e) => setGive(e.target.value as ResourceType)}>
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {RESOURCE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="trade-panel__field">
          Receive
          <select value={receive} onChange={(e) => setReceive(e.target.value as ResourceType)}>
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {RESOURCE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        className="trade-panel__button"
        disabled={!enabled}
        onClick={() => dispatch((s) => tradeResources(s, give, receive))}
      >
        Trade {giveAmount} {RESOURCE_LABELS[give]} → {TRADE_BATCH_SIZE} {RESOURCE_LABELS[receive]}
      </button>
    </section>
  );
}
