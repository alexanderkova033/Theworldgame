import "./TradePanel.css";
import { useState } from "react";
import { canImportFood, canTrade, getFoodImportCost, importFood, tradeResources } from "../../application/actions";
import { CURRENCY_SYMBOL, FOOD_IMPORT_BATCH_SIZE, TRADE_BATCH_SIZE } from "../../domain/constants";
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

      <div className="trade-panel__divider" />

      <p className="resources-panel__hint">
        No farmland to spare? Import food from the continental market instead of growing it all yourself
        {hasPort ? " — your port keeps the price down." : "."}
      </p>
      <button
        className="trade-panel__button"
        disabled={!canImportFood(state)}
        onClick={() => dispatch((s) => importFood(s))}
      >
        Import {FOOD_IMPORT_BATCH_SIZE} Food ({Math.round(getFoodImportCost(state))} {CURRENCY_SYMBOL})
      </button>
    </section>
  );
}
