import "./TradePanel.css";
import { useState } from "react";
import { canImportFood, canTrade, getFoodImportCost, importFood, tradeResources } from "../../application/actions";
import { CURRENCY_SYMBOL, FOOD_IMPORT_BATCH_SIZE, TRADE_BATCH_SIZE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getNation } from "../../domain/nations/nationRules";
import { nationHasPort, getTradeRate } from "../../domain/resources/tradeRules";
import { RESOURCE_TYPES, type ResourceType } from "../../domain/resources/types";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";

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

interface ResourcePickerProps {
  label: string;
  value: ResourceType;
  onChange: (type: ResourceType) => void;
}

// A row of icon buttons standing in for a native <select> — picking a
// resource is now a visual choice (tap the log/rock/wheat/fish glyph)
// instead of reading names out of a text dropdown.
function ResourcePicker({ label, value, onChange }: ResourcePickerProps) {
  return (
    <div className="trade-panel__field">
      <span className="trade-panel__field-label">{label}</span>
      <div className="trade-panel__picker">
        {RESOURCE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`trade-panel__picker-option ${value === type ? "is-active" : ""}`}
            onClick={() => onChange(type)}
            title={RESOURCE_LABELS[type]}
            aria-label={RESOURCE_LABELS[type]}
          >
            <svg viewBox="-10 -10 20 20">
              <ResourceIcon type={type} size={8} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

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
      <p className="panel-hint">
        Trade with the continental market at {rate}:1{hasPort ? " (you have a port — better rate)" : ""}.
      </p>

      <div className="trade-panel__row">
        <ResourcePicker label="Give" value={give} onChange={setGive} />
        <span className="trade-panel__arrow">→</span>
        <ResourcePicker label="Receive" value={receive} onChange={setReceive} />
      </div>

      <button
        className="trade-panel__button"
        disabled={!enabled}
        onClick={() => dispatch((s) => tradeResources(s, give, receive))}
      >
        Trade {giveAmount} {RESOURCE_LABELS[give]} → {TRADE_BATCH_SIZE} {RESOURCE_LABELS[receive]}
      </button>

      <div className="trade-panel__divider" />

      <p className="panel-hint">
        No farmland to spare? Import food from the continental market instead of growing it all yourself
        {hasPort ? " — your port keeps the price down." : "."}
      </p>
      <button
        className="trade-panel__button trade-panel__import-button"
        disabled={!canImportFood(state)}
        onClick={() => dispatch((s) => importFood(s))}
      >
        <StatIcon type="food" size={22} />
        Import {FOOD_IMPORT_BATCH_SIZE} Food ({Math.round(getFoodImportCost(state))} {CURRENCY_SYMBOL})
      </button>
    </section>
  );
}
