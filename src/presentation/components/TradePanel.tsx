import "./TradePanel.css";
import { useState } from "react";
import {
  addStandingOrder,
  buyResource,
  canAddStandingOrder,
  canBuyResource,
  canExportFood,
  canImportFood,
  canSellResource,
  canTrade,
  exportFood,
  getBuyResourceCost,
  getFoodExportRevenue,
  getFoodImportCost,
  getGiveAmount,
  getSellResourceRevenue,
  importFood,
  removeStandingOrder,
  sellResource,
  tradeResources,
  type TradeableType,
} from "../../application/actions";
import {
  CURRENCY_SYMBOL,
  FOOD_EXPORT_BATCH_SIZE,
  FOOD_IMPORT_BATCH_SIZE,
  FOOD_TRADE_BATCH_SIZE,
  RESOURCE_MARKET_BATCH_SIZE,
  TRADE_BATCH_SIZE,
} from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getNation } from "../../domain/nations/nationRules";
import { getPriceIndex, nationHasPort } from "../../domain/resources/tradeRules";
import { RESOURCE_TYPES, type ResourceType } from "../../domain/resources/types";
import { MAX_STANDING_ORDERS, type StandingOrder, type StandingOrderKind } from "../../domain/trade/standingOrderTypes";
import { playConfirm } from "../audio/sound";
import { DebtPanel } from "./DebtPanel";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";

interface TradePanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
}

type TradeTab = "barter" | "market" | "loans" | "orders";

const TABS: Array<{ key: TradeTab; label: string }> = [
  { key: "barter", label: "Barter" },
  { key: "market", label: "Market" },
  { key: "loans", label: "Loans" },
  { key: "orders", label: "Orders" },
];

const MULTIPLIERS = [1, 5, 10];

const TRADEABLE_TYPES: TradeableType[] = [...RESOURCE_TYPES, "food"];

const TRADEABLE_LABELS: Record<TradeableType, string> = {
  wood: "Wood",
  ore: "Ore",
  grain: "Grain",
  fish: "Fish",
  food: "Food",
};

const ORDER_KIND_LABELS: Record<StandingOrderKind, string> = {
  barter: "Barter",
  buyResource: "Buy",
  sellResource: "Sell",
  importFood: "Import Food",
  exportFood: "Export Food",
};

const ORDER_KINDS = Object.keys(ORDER_KIND_LABELS) as StandingOrderKind[];

function receiveBatchSize(type: TradeableType, multiplier: number): number {
  return (type === "food" ? FOOD_TRADE_BATCH_SIZE : TRADE_BATCH_SIZE) * multiplier;
}

// The 1x/5x/10x batch-size selector shared by Barter, Market, and whatever
// order is being configured on the Orders tab.
function MultiplierPicker({ value, onChange }: { value: number; onChange: (multiplier: number) => void }) {
  return (
    <div className="trade-panel__multiplier">
      {MULTIPLIERS.map((m) => (
        <button
          key={m}
          type="button"
          className={`trade-panel__multiplier-button ${value === m ? "is-active" : ""}`}
          onClick={() => onChange(m)}
        >
          {m}x
        </button>
      ))}
    </div>
  );
}

interface ResourcePickerProps {
  label: string;
  value: TradeableType;
  demand: GameState["resourceDemand"];
  onChange: (type: TradeableType) => void;
  types?: TradeableType[];
}

// A small dot showing whether a resource is currently in demand (dearer —
// bought a lot recently) or in surplus (cheaper — sold a lot recently), so
// the dynamic market has a visible tell before you even pick a trade. Food
// doesn't participate in that demand tracking (see tradeResources.ts), so
// it never shows a dot.
function DemandDot({ demand, type }: { demand: GameState["resourceDemand"]; type: TradeableType }) {
  if (type === "food") return null;
  const index = getPriceIndex(demand, type as ResourceType);
  if (index > 1.03) return <span className="trade-panel__demand-dot is-high" title="In demand — dearer than usual" />;
  if (index < 0.97) return <span className="trade-panel__demand-dot is-low" title="In surplus — cheaper than usual" />;
  return null;
}

// A row of icon buttons standing in for a native <select> — picking a
// resource is now a visual choice (tap the log/rock/wheat/fish/food glyph)
// instead of reading names out of a text dropdown. `types` narrows the
// choices (e.g. the cash market has no food option of its own — food import/
// export are separate actions).
function ResourcePicker({ label, value, demand, onChange, types = TRADEABLE_TYPES }: ResourcePickerProps) {
  return (
    <div className="trade-panel__field">
      <span className="trade-panel__field-label">{label}</span>
      <div className="trade-panel__picker">
        {types.map((type) => (
          <button
            key={type}
            type="button"
            className={`trade-panel__picker-option ${value === type ? "is-active" : ""}`}
            onClick={() => onChange(type)}
            title={TRADEABLE_LABELS[type]}
            aria-label={TRADEABLE_LABELS[type]}
          >
            {type === "food" ? (
              <StatIcon type="food" size={20} />
            ) : (
              <svg viewBox="-10 -10 20 20">
                <ResourceIcon type={type} size={8} />
              </svg>
            )}
            <DemandDot demand={demand} type={type} />
          </button>
        ))}
      </div>
    </div>
  );
}

interface MarketRowProps {
  state: GameState;
  dispatch: TradePanelProps["dispatch"];
  type: ResourceType;
  multiplier: number;
}

// One resource's cash market row: buy a batch outright from the treasury, or
// sell a batch back to it. Prices float with the same demand index as the
// barter tab (see getResourceBuyPrice/getResourceSellPrice), so heavy
// buying/selling here also moves barter rates and vice versa.
function MarketRow({ state, dispatch, type, multiplier }: MarketRowProps) {
  const buyCost = getBuyResourceCost(state, type, multiplier);
  const sellRevenue = getSellResourceRevenue(state, type, multiplier);
  const amount = RESOURCE_MARKET_BATCH_SIZE * multiplier;

  return (
    <div className="trade-panel__market-row">
      <span className="trade-panel__market-icon">
        <svg viewBox="-10 -10 20 20">
          <ResourceIcon type={type} size={8} />
        </svg>
        {TRADEABLE_LABELS[type]}
      </span>
      <button
        className="trade-panel__market-button btn-primary"
        disabled={!canBuyResource(state, type, multiplier)}
        onClick={() => {
          playConfirm();
          dispatch((s) => buyResource(s, type, multiplier));
        }}
      >
        Buy {amount} ({Math.round(buyCost)} {CURRENCY_SYMBOL})
      </button>
      <button
        className="trade-panel__market-button btn-primary"
        disabled={!canSellResource(state, type, multiplier)}
        onClick={() => {
          playConfirm();
          dispatch((s) => sellResource(s, type, multiplier));
        }}
      >
        Sell {amount} (+{Math.round(sellRevenue)} {CURRENCY_SYMBOL})
      </button>
    </div>
  );
}

// A plain-language, live-priced description of a standing order — recomputed
// from current state every render, so a barter/market rate that's since
// drifted shows today's real numbers, not whatever it was when the order was created.
function describeOrder(state: GameState, order: StandingOrder): string {
  switch (order.kind) {
    case "barter": {
      if (!order.give || !order.receive) return "Invalid order";
      const giveAmount = getGiveAmount(state, order.give, order.receive, order.multiplier);
      const recvAmount = receiveBatchSize(order.receive, order.multiplier);
      return `Trade ${giveAmount} ${TRADEABLE_LABELS[order.give]} → ${recvAmount} ${TRADEABLE_LABELS[order.receive]}`;
    }
    case "buyResource": {
      if (!order.resourceType) return "Invalid order";
      const amount = RESOURCE_MARKET_BATCH_SIZE * order.multiplier;
      const cost = Math.round(getBuyResourceCost(state, order.resourceType, order.multiplier));
      return `Buy ${amount} ${TRADEABLE_LABELS[order.resourceType]} (${cost} ${CURRENCY_SYMBOL})`;
    }
    case "sellResource": {
      if (!order.resourceType) return "Invalid order";
      const amount = RESOURCE_MARKET_BATCH_SIZE * order.multiplier;
      const revenue = Math.round(getSellResourceRevenue(state, order.resourceType, order.multiplier));
      return `Sell ${amount} ${TRADEABLE_LABELS[order.resourceType]} (+${revenue} ${CURRENCY_SYMBOL})`;
    }
    case "importFood": {
      const amount = FOOD_IMPORT_BATCH_SIZE * order.multiplier;
      const cost = Math.round(getFoodImportCost(state, order.multiplier));
      return `Import ${amount} Food (${cost} ${CURRENCY_SYMBOL})`;
    }
    case "exportFood": {
      const amount = FOOD_EXPORT_BATCH_SIZE * order.multiplier;
      const revenue = Math.round(getFoodExportRevenue(order.multiplier));
      return `Export ${amount} Food (+${revenue} ${CURRENCY_SYMBOL})`;
    }
  }
}

export function TradePanel({ state, dispatch }: TradePanelProps) {
  const [tab, setTab] = useState<TradeTab>("barter");
  const [multiplier, setMultiplier] = useState(1);
  const [give, setGive] = useState<TradeableType>("grain");
  const [receive, setReceive] = useState<TradeableType>("wood");
  const [orderKind, setOrderKind] = useState<StandingOrderKind>("barter");
  const [orderResourceType, setOrderResourceType] = useState<ResourceType>("wood");

  const nation = getNation(state.nationId);
  const hasPort = nationHasPort(nation);
  const giveAmount = getGiveAmount(state, give, receive, multiplier);
  const barterEnabled = give !== receive && canTrade(state, give, receive, multiplier);
  const atOrderCap = !canAddStandingOrder(state);

  function buildNewOrder(): Omit<StandingOrder, "id"> {
    if (orderKind === "barter") return { kind: "barter", give, receive, multiplier };
    if (orderKind === "buyResource" || orderKind === "sellResource") {
      return { kind: orderKind, resourceType: orderResourceType, multiplier };
    }
    return { kind: orderKind, multiplier };
  }
  const newOrderInvalid = orderKind === "barter" && give === receive;

  return (
    <section className="panel trade-panel">
      <h2>Exchange</h2>

      <div className="trade-panel__tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`trade-panel__tab ${tab === t.key ? "is-active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "barter" || tab === "market" || tab === "orders") && (
        <div className="trade-panel__multiplier-row">
          <span className="trade-panel__field-label">Batch</span>
          <MultiplierPicker value={multiplier} onChange={setMultiplier} />
        </div>
      )}

      {tab === "barter" && (
        <>
          <p className="panel-hint" title={hasPort ? "Your port keeps the base rate down" : undefined}>
            Rates float with supply and demand{hasPort ? " · port bonus active" : ""}
          </p>
          <div className="trade-panel__row">
            <ResourcePicker label="Give" value={give} demand={state.resourceDemand} onChange={setGive} />
            <span className="trade-panel__arrow">→</span>
            <ResourcePicker label="Receive" value={receive} demand={state.resourceDemand} onChange={setReceive} />
          </div>
          <button
            className="trade-panel__button btn-primary"
            disabled={!barterEnabled}
            onClick={() => {
              playConfirm();
              dispatch((s) => tradeResources(s, give, receive, multiplier));
            }}
          >
            Trade {giveAmount} {TRADEABLE_LABELS[give]} → {receiveBatchSize(receive, multiplier)} {TRADEABLE_LABELS[receive]}
          </button>
        </>
      )}

      {tab === "market" && (
        <>
          <p className="panel-hint" title={hasPort ? "Your port makes buying cheaper" : undefined}>
            Buy or sell outright for {CURRENCY_SYMBOL}
            {hasPort ? " · port bonus active" : ""}
          </p>
          <div className="trade-panel__market">
            {RESOURCE_TYPES.map((type) => (
              <MarketRow key={type} state={state} dispatch={dispatch} type={type} multiplier={multiplier} />
            ))}
          </div>
          <div className="trade-panel__row trade-panel__row--food">
            <button
              className="trade-panel__button trade-panel__food-button btn-primary"
              disabled={!canImportFood(state, multiplier)}
              onClick={() => {
                playConfirm();
                dispatch((s) => importFood(s, multiplier));
              }}
            >
              <StatIcon type="food" size={20} />
              Import {FOOD_IMPORT_BATCH_SIZE * multiplier} ({Math.round(getFoodImportCost(state, multiplier))} {CURRENCY_SYMBOL})
            </button>
            <button
              className="trade-panel__button trade-panel__food-button btn-primary"
              disabled={!canExportFood(state, multiplier)}
              onClick={() => {
                playConfirm();
                dispatch((s) => exportFood(s, multiplier));
              }}
            >
              <StatIcon type="food" size={20} />
              Export {FOOD_EXPORT_BATCH_SIZE * multiplier} (+{Math.round(getFoodExportRevenue(multiplier))} {CURRENCY_SYMBOL})
            </button>
          </div>
        </>
      )}

      {tab === "loans" && <DebtPanel state={state} dispatch={dispatch} bare />}

      {tab === "orders" && (
        <>
          {state.standingOrders.length === 0 ? (
            <p className="panel-hint">An order set up here runs itself once a day, whenever it's affordable.</p>
          ) : (
            <ul className="trade-panel__order-list">
              {state.standingOrders.map((order) => (
                <li key={order.id} className="trade-panel__order-row">
                  <span>{describeOrder(state, order)}</span>
                  <button
                    className="trade-panel__order-cancel btn-danger"
                    onClick={() => {
                      playConfirm();
                      dispatch((s) => removeStandingOrder(s, order.id));
                    }}
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="trade-panel__divider" />

          <div className="trade-panel__order-kinds">
            {ORDER_KINDS.map((kind) => (
              <button
                key={kind}
                className={`trade-panel__tab trade-panel__tab--small ${orderKind === kind ? "is-active" : ""}`}
                onClick={() => setOrderKind(kind)}
                title={ORDER_KIND_LABELS[kind]}
              >
                {ORDER_KIND_LABELS[kind]}
              </button>
            ))}
          </div>

          {orderKind === "barter" && (
            <div className="trade-panel__row">
              <ResourcePicker label="Give" value={give} demand={state.resourceDemand} onChange={setGive} />
              <span className="trade-panel__arrow">→</span>
              <ResourcePicker label="Receive" value={receive} demand={state.resourceDemand} onChange={setReceive} />
            </div>
          )}
          {(orderKind === "buyResource" || orderKind === "sellResource") && (
            <ResourcePicker
              label="Resource"
              value={orderResourceType}
              demand={state.resourceDemand}
              onChange={(t) => setOrderResourceType(t as ResourceType)}
              types={RESOURCE_TYPES}
            />
          )}

          <button
            className="trade-panel__button btn-primary"
            disabled={atOrderCap || newOrderInvalid}
            onClick={() => {
              playConfirm();
              dispatch((s) => addStandingOrder(s, buildNewOrder()));
            }}
          >
            {atOrderCap ? `Max ${MAX_STANDING_ORDERS} standing orders` : "Add Standing Order"}
          </button>
        </>
      )}
    </section>
  );
}
