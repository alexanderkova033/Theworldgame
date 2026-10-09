// Trade, as one board: a row per good (the four raw resources and food),
// each with what you hold, today's price, and Buy / Sell. The ↻ beside a
// button makes that trade repeat every day (a standing order). Money and
// loans sit alongside, since at the start of the game borrowing is often
// what pays for the first trade.
//
// Barter (resource for resource) is no longer offered here: selling one
// thing and buying another always beat its rates. Old barter standing
// orders from earlier saves still run and still show in the daily list.
import "./TradePanel.css";
import { useState, type ReactNode } from "react";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import {
  addStandingOrder,
  buyResource,
  canAddStandingOrder,
  canBuyResource,
  canExportFood,
  canImportFood,
  canSellResource,
  exportFood,
  getBuyResourceCost,
  getFoodExportRevenue,
  getFoodImportCost,
  getGiveAmount,
  getSellResourceRevenue,
  importFood,
  removeStandingOrder,
  sellResource,
} from "../../application/actions";
import { CURRENCY_SYMBOL, FOOD_EXPORT_BATCH_SIZE, FOOD_IMPORT_BATCH_SIZE, RESOURCE_MARKET_BATCH_SIZE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getNation } from "../../domain/nations/nationRules";
import { getPriceIndex, nationHasPort } from "../../domain/resources/tradeRules";
import { RESOURCE_TYPES, type ResourceType } from "../../domain/resources/types";
import { MAX_STANDING_ORDERS, type StandingOrder } from "../../domain/trade/standingOrderTypes";
import { formatCompact } from "../formatNumber";
import { playConfirm } from "../audio/sound";
import { DebtPanel } from "./DebtPanel";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";

type Dispatch = (action: (state: GameState) => GameState) => void;

interface TradePanelProps {
  state: GameState;
  production: DailyProductionSummary;
  dispatch: Dispatch;
}

const QUANTITIES = [1, 5, 10];

const LABELS: Record<ResourceType | "food", string> = {
  wood: "Wood",
  ore: "Ore",
  grain: "Grain",
  fish: "Fish",
  food: "Food",
};

type OrderSpec = Omit<StandingOrder, "id" | "multiplier">;

function sameOrder(order: StandingOrder, spec: OrderSpec): boolean {
  return order.kind === spec.kind && order.resourceType === spec.resourceType;
}

function RepeatIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={14} height={14} aria-hidden="true">
      <path d="M6.5,-2.5 A7,7 0 1 0 6.8,3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <polygon points="3.6,-4.2 8.6,-5.4 7.6,-0.3" fill="currentColor" />
    </svg>
  );
}

function GoodIcon({ good }: { good: ResourceType | "food" }) {
  if (good === "food") return <StatIcon type="food" size={26} />;
  return (
    <svg viewBox="-10 -10 20 20" width={26} height={26} aria-hidden="true">
      <ResourceIcon type={good} size={8.5} />
    </svg>
  );
}

// "↑ pricey" / "↓ cheap", from the live demand index — words and an arrow,
// not a coloured dot.
function Trend({ state, good }: { state: GameState; good: ResourceType | "food" }) {
  if (good === "food") return null;
  const index = getPriceIndex(state.resourceDemand, good);
  if (index > 1.03) return <span className="trade-row__trend is-up">↑ pricey</span>;
  if (index < 0.97) return <span className="trade-row__trend is-down">↓ cheap</span>;
  return null;
}

interface TradeButtonProps {
  label: string;
  money: string;
  enabled: boolean;
  onClick: () => void;
  order: OrderSpec;
  state: GameState;
  quantity: number;
  dispatch: Dispatch;
  direction: "buy" | "sell";
}

// One Buy or Sell button, plus its ↻ "do this every day" toggle.
function TradeButton({ label, money, enabled, onClick, order, state, quantity, dispatch, direction }: TradeButtonProps) {
  const existing = state.standingOrders.find((o) => sameOrder(o, order));
  const canRepeat = existing !== undefined || canAddStandingOrder(state);
  return (
    <span className="trade-row__action">
      <button
        type="button"
        className={`trade-row__button trade-row__button--${direction} ${direction === "buy" ? "btn-primary" : ""}`}
        disabled={!enabled}
        onClick={() => {
          playConfirm();
          onClick();
        }}
      >
        <span className="trade-row__button-label">{label}</span>
        <span className="trade-row__button-money">{money}</span>
      </button>
      <button
        type="button"
        className={`trade-row__repeat ${existing ? "is-active" : ""}`}
        aria-pressed={existing !== undefined}
        disabled={!canRepeat}
        title={
          existing
            ? `Stop doing this every day`
            : canRepeat
              ? `${label} every day, whenever it's affordable`
              : `At most ${MAX_STANDING_ORDERS} daily orders`
        }
        aria-label={existing ? `Stop: ${label} daily` : `${label} daily`}
        onClick={() =>
          dispatch((s) => {
            const current = s.standingOrders.find((o) => sameOrder(o, order));
            return current ? removeStandingOrder(s, current.id) : addStandingOrder(s, { ...order, multiplier: quantity });
          })
        }
      >
        <RepeatIcon />
      </button>
    </span>
  );
}

interface RowProps {
  good: ResourceType | "food";
  have: number;
  perDay: number;
  price: ReactNode;
  children: ReactNode;
  state: GameState;
}

function TradeRow({ good, have, perDay, price, children, state }: RowProps) {
  const rounded = Math.round(perDay * 10) / 10;
  return (
    <div className="trade-row">
      <span className="trade-row__good">
        <GoodIcon good={good} />
        <span className="trade-row__name">{LABELS[good]}</span>
      </span>
      <span className="trade-row__stock" title={`You have ${Math.floor(have).toLocaleString()}, changing by ${rounded} a day`}>
        <strong>{formatCompact(Math.floor(have))}</strong>
        <span className={rounded > 0 ? "is-gain" : rounded < 0 ? "is-loss" : ""}>
          {rounded > 0 ? "+" : ""}
          {formatCompact(rounded)}/d
        </span>
      </span>
      <span className="trade-row__price">
        {price}
        <Trend state={state} good={good} />
      </span>
      <span className="trade-row__actions">{children}</span>
    </div>
  );
}

// A one-line description of any standing order, live-priced.
function describeOrder(state: GameState, order: StandingOrder): string {
  switch (order.kind) {
    case "buyResource":
      return `Buy ${RESOURCE_MARKET_BATCH_SIZE * order.multiplier} ${LABELS[order.resourceType ?? "wood"]}`;
    case "sellResource":
      return `Sell ${RESOURCE_MARKET_BATCH_SIZE * order.multiplier} ${LABELS[order.resourceType ?? "wood"]}`;
    case "importFood":
      return `Buy ${formatCompact(FOOD_IMPORT_BATCH_SIZE * order.multiplier)} Food`;
    case "exportFood":
      return `Sell ${formatCompact(FOOD_EXPORT_BATCH_SIZE * order.multiplier)} Food`;
    case "barter":
      if (!order.give || !order.receive) return "Old trade";
      return `Swap ${getGiveAmount(state, order.give, order.receive, order.multiplier)} ${LABELS[order.give]} for ${LABELS[order.receive]}`;
  }
}

export function TradePanel({ state, production, dispatch }: TradePanelProps) {
  const [quantity, setQuantity] = useState(1);
  const hasPort = nationHasPort(getNation(state.nationId));
  const money = (value: number, sign: "+" | "−") => `${sign}${Math.round(value).toLocaleString()} ${CURRENCY_SYMBOL}`;

  return (
    <div className="trade">
      <section className="panel trade__board">
        <div className="trade__head">
          <h2>Market</h2>
          <div className="trade__quantity" role="group" aria-label="How much per trade">
            <span>Amount</span>
            {QUANTITIES.map((q) => (
              <button key={q} type="button" className={quantity === q ? "is-active" : ""} aria-pressed={quantity === q} onClick={() => setQuantity(q)}>
                ×{q}
              </button>
            ))}
          </div>
        </div>
        {hasPort && <p className="trade__note">Your port makes buying cheaper.</p>}

        <div className="trade__columns" aria-hidden="true">
          <span>Good</span>
          <span>You have</span>
          <span>Price</span>
          <span />
        </div>

        {RESOURCE_TYPES.map((type) => {
          const amount = RESOURCE_MARKET_BATCH_SIZE * quantity;
          const buyCost = getBuyResourceCost(state, type, quantity);
          const sellRevenue = getSellResourceRevenue(state, type, quantity);
          return (
            <TradeRow
              key={type}
              good={type}
              have={state.resources[type]}
              perDay={production.resourceProduction[type]}
              state={state}
              price={
                <>
                  {Math.round(buyCost / amount)} {CURRENCY_SYMBOL} <span className="trade-row__price-unit">each</span>
                </>
              }
            >
              <TradeButton
                direction="buy"
                label={`Buy ${amount}`}
                money={money(buyCost, "−")}
                enabled={canBuyResource(state, type, quantity)}
                onClick={() => dispatch((s) => buyResource(s, type, quantity))}
                order={{ kind: "buyResource", resourceType: type }}
                state={state}
                quantity={quantity}
                dispatch={dispatch}
              />
              <TradeButton
                direction="sell"
                label={`Sell ${amount}`}
                money={money(sellRevenue, "+")}
                enabled={canSellResource(state, type, quantity)}
                onClick={() => dispatch((s) => sellResource(s, type, quantity))}
                order={{ kind: "sellResource", resourceType: type }}
                state={state}
                quantity={quantity}
                dispatch={dispatch}
              />
            </TradeRow>
          );
        })}

        <TradeRow
          good="food"
          have={state.stats.food}
          perDay={production.netFood}
          state={state}
          price={<span className="trade-row__price-unit">by the cartload</span>}
        >
          <TradeButton
            direction="buy"
            label={`Buy ${formatCompact(FOOD_IMPORT_BATCH_SIZE * quantity)}`}
            money={money(getFoodImportCost(state, quantity), "−")}
            enabled={canImportFood(state, quantity)}
            onClick={() => dispatch((s) => importFood(s, quantity))}
            order={{ kind: "importFood" }}
            state={state}
            quantity={quantity}
            dispatch={dispatch}
          />
          <TradeButton
            direction="sell"
            label={`Sell ${formatCompact(FOOD_EXPORT_BATCH_SIZE * quantity)}`}
            money={money(getFoodExportRevenue(quantity), "+")}
            enabled={canExportFood(state, quantity)}
            onClick={() => dispatch((s) => exportFood(s, quantity))}
            order={{ kind: "exportFood" }}
            state={state}
            quantity={quantity}
            dispatch={dispatch}
          />
        </TradeRow>
      </section>

      <aside className="trade__side">
        <section className="panel trade__money">
          <h2>Treasury</h2>
          <div className="trade__treasury">
            <StatIcon type="treasury" size={30} />
            <strong>{Math.floor(state.stats.treasury).toLocaleString()}</strong>
            <span className={production.totalIncome >= 0 ? "is-gain" : "is-loss"}>
              {production.totalIncome >= 0 ? "+" : ""}
              {Math.round(production.totalIncome)}/d
            </span>
          </div>
        </section>

        <section className="panel trade__orders">
          <h2>
            <RepeatIcon /> Daily orders
          </h2>
          {state.standingOrders.length === 0 ? (
            <p className="trade__note">Press ↻ next to a Buy or Sell to repeat it every day.</p>
          ) : (
            <ul>
              {state.standingOrders.map((order) => (
                <li key={order.id}>
                  <span>{describeOrder(state, order)}</span>
                  <button type="button" className="btn-danger" onClick={() => dispatch((s) => removeStandingOrder(s, order.id))}>
                    Stop
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <DebtPanel state={state} dispatch={dispatch} />
      </aside>
    </div>
  );
}
