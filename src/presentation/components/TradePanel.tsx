import "./TradePanel.css";
import { useState } from "react";
import { canImportFood, canTrade, getFoodImportCost, getGiveAmount, importFood, tradeResources } from "../../application/actions";
import { CURRENCY_SYMBOL, FOOD_IMPORT_BATCH_SIZE, TRADE_BATCH_SIZE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getNation } from "../../domain/nations/nationRules";
import { getPriceIndex, nationHasPort } from "../../domain/resources/tradeRules";
import { RESOURCE_TYPES, type ResourceType } from "../../domain/resources/types";
import { playConfirm } from "../audio/sound";
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
  demand: GameState["resourceDemand"];
  onChange: (type: ResourceType) => void;
}

// A small dot showing whether a resource is currently in demand (dearer —
// bought a lot recently) or in surplus (cheaper — sold a lot recently), so
// the dynamic market has a visible tell before you even pick a trade.
function DemandDot({ demand, type }: { demand: GameState["resourceDemand"]; type: ResourceType }) {
  const index = getPriceIndex(demand, type);
  if (index > 1.03) return <span className="trade-panel__demand-dot is-high" title="In demand — dearer than usual" />;
  if (index < 0.97) return <span className="trade-panel__demand-dot is-low" title="In surplus — cheaper than usual" />;
  return null;
}

// A row of icon buttons standing in for a native <select> — picking a
// resource is now a visual choice (tap the log/rock/wheat/fish glyph)
// instead of reading names out of a text dropdown.
function ResourcePicker({ label, value, demand, onChange }: ResourcePickerProps) {
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
            <DemandDot demand={demand} type={type} />
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
  const hasPort = nationHasPort(nation);
  const giveAmount = getGiveAmount(state, give, receive);
  const enabled = give !== receive && canTrade(state, give, receive);

  return (
    <section className="panel trade-panel">
      <h2>Trade</h2>
      <p className="panel-hint">
        Trade with the continental market{hasPort ? " — your port keeps the base rate down" : ""}. Rates move with
        supply and demand: buying a resource repeatedly makes it dearer, selling it repeatedly makes it cheaper.
      </p>

      <div className="trade-panel__row">
        <ResourcePicker label="Give" value={give} demand={state.resourceDemand} onChange={setGive} />
        <span className="trade-panel__arrow">→</span>
        <ResourcePicker label="Receive" value={receive} demand={state.resourceDemand} onChange={setReceive} />
      </div>

      <button
        className="trade-panel__button"
        disabled={!enabled}
        onClick={() => {
          playConfirm();
          dispatch((s) => tradeResources(s, give, receive));
        }}
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
        onClick={() => {
          playConfirm();
          dispatch((s) => importFood(s));
        }}
      >
        <StatIcon type="food" size={22} />
        Import {FOOD_IMPORT_BATCH_SIZE} Food ({Math.round(getFoodImportCost(state))} {CURRENCY_SYMBOL})
      </button>
    </section>
  );
}
