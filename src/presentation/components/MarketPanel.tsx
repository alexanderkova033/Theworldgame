// The market, as one board: a row per good (the raw resources, coal and
// food), each with what you hold, today's price, and Buy / Sell. Prices are
// supply and demand (see domain/market): selling floods the market and the
// price drops, buying drains it and the price climbs, and both settle back
// over the following weeks.
import "./MarketPanel.css";
import { useState } from "react";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import {
  acceptOffer,
  buyGood,
  canAcceptOffer,
  canBuyGood,
  canSellGood,
  changeBuyOrder,
  changeSellOrder,
  countOrdersOn,
  declineOffer,
  describeOrderTally,
  getMarketBuyCost,
  getMarketSellRevenue,
  sellGood,
  setBuyOrderToToday,
  setSellOrderToToday,
  toggleBuyOrder,
  toggleSellOrder,
  whyBuyOrderWaits,
  whySellOrderWaits,
} from "../../application/actions";
import { dayNumber } from "../../domain/country/calendar";
import { getNation } from "../../domain/nations/nationRules";
import { relationsWord } from "../../domain/neighbours/relationsRules";
import { CURRENCY_SYMBOL, MARKET_ORDER_BATCHES, MARKET_ORDER_RESERVE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { GOOD_SPECS, MARKET_GOODS, getBatchSize, getBuyCost, getMidPrice, getPriceRatio, getSellRevenue, holdsPort } from "../../domain/market/marketRules";
import type { MarketGood } from "../../domain/market/types";
import { formatAmount } from "../formatNumber";
import { playCoins, playSeal } from "../audio/sound";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";

type Dispatch = (action: (state: GameState) => GameState) => void;

interface MarketPanelProps {
  state: GameState;
  production: DailyProductionSummary;
  dispatch: Dispatch;
}

const QUANTITIES = [1, 5, 10];

const LABELS: Record<MarketGood, string> = {
  wood: "Wood",
  ore: "Ore",
  coal: "Coal",
  grain: "Grain",
  fish: "Fish",
  food: "Food",
};

function GoodIcon({ good }: { good: MarketGood }) {
  if (good === "food") return <StatIcon type="food" size={26} />;
  return (
    <svg viewBox="-10 -10 20 20" width={26} height={26} aria-hidden="true">
      <ResourceIcon type={good} size={8.5} />
    </svg>
  );
}

// Scarce / plentiful, in words and an arrow — not a coloured dot.
function Trend({ state, good }: { state: GameState; good: MarketGood }) {
  const ratio = getPriceRatio(state.market, good);
  if (ratio > 1.1) return <span className="market-row__trend is-up">↑ scarce</span>;
  if (ratio < 0.9) return <span className="market-row__trend is-down">↓ plentiful</span>;
  return <span className="market-row__trend">normal</span>;
}

// Food is priced per thousand — a single unit is a fraction of a Crown.
function priceLabel(good: MarketGood, mid: number): string {
  return good === "food" ? `${(mid * 1000).toFixed(1)} ${CURRENCY_SYMBOL} per 1,000` : `${mid.toFixed(1)} ${CURRENCY_SYMBOL} each`;
}

type OrderSide = "buy" | "sell";

// A number in an order: a click up or down, or typed. Blank means no limit,
// where the order allows one.
function OrderNumber({ label, value, step, decimals, blankWord, onChange }: { label: string; value: number | null; step: number; decimals: number; blankWord?: string; onChange: (value: number | null) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <span className="market-order-number">
      <button type="button" aria-label={`Lower: ${label}`} disabled={value === null} onClick={() => onChange(Math.max(0, (value ?? 0) - step))}>
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        placeholder={blankWord}
        value={draft ?? (value === null ? "" : value.toFixed(decimals))}
        onChange={(e) => {
          const text = e.target.value.trim();
          setDraft(e.target.value);
          if (text === "") {
            if (blankWord) onChange(null);
          } else if (Number.isFinite(Number(text)) && Number(text) >= 0) onChange(Number(text));
        }}
        onBlur={() => setDraft(null)}
      />
      <button type="button" aria-label={`Raise: ${label}`} onClick={() => onChange((value ?? 0) + step)}>
        +
      </button>
    </span>
  );
}

// Food's prices are shown per thousand, as on its row.
const priceScale = (good: MarketGood) => (good === "food" ? 1000 : 1);
const priceUnit = (good: MarketGood) => (good === "food" ? `${CURRENCY_SYMBOL} per 1,000` : CURRENCY_SYMBOL);

function orderWords(state: GameState, good: MarketGood, side: OrderSide): string {
  const orders = state.marketOrders[good];
  const scale = priceScale(good);
  if (side === "buy") {
    if (!orders?.buy) return "Buy order";
    const limit = orders.buy.stockUnder === null ? "" : `, stock under ${formatAmount(orders.buy.stockUnder)}`;
    return `Buy below ${(orders.buy.below * scale).toFixed(1)}${limit}`;
  }
  if (!orders?.sell) return "Sell order";
  return `Sell above ${(orders.sell.above * scale).toFixed(1)}, keep ${formatAmount(orders.sell.keep)}`;
}

function orderTip(state: GameState, good: MarketGood, side: OrderSide): string {
  const set = state.marketOrders[good]?.[side];
  if (!set) return side === "buy" ? "Buy a little each day while the price is low. Starts at today's price." : "Sell a little each day while the price is high. Starts at today's price, keeping what you hold now.";
  return (side === "buy" ? whyBuyOrderWaits(state, good) : whySellOrderWaits(state, good)) ?? "Trades today.";
}

// One order: its switch, and its terms, which open for changing.
function OrderChip({ state, good, side, isOpen, onOpen, dispatch }: { state: GameState; good: MarketGood; side: OrderSide; isOpen: boolean; onOpen: (open: boolean) => void; dispatch: Dispatch }) {
  const order = state.marketOrders[good]?.[side];
  const toggle = side === "buy" ? toggleBuyOrder : toggleSellOrder;
  const on = !!order?.on;
  return (
    <span className={`market-order-chip${on ? " is-on" : ""}${order ? "" : " is-unset"}`} data-tip={orderTip(state, good, side)}>
      <button type="button" className="market-order-chip__switch" aria-pressed={on} aria-label={`${LABELS[good]} ${side} order: ${on ? "on" : "off"}`} onClick={() => dispatch((s) => toggle(s, good))}>
        {on ? "On" : "Off"}
      </button>
      <button
        type="button"
        className="market-order-chip__terms"
        aria-expanded={isOpen}
        onClick={() => {
          if (!order) dispatch((s) => toggle(s, good));
          onOpen(!isOpen);
        }}
      >
        {orderWords(state, good, side)}
      </button>
    </span>
  );
}

function OrderEditor({ state, good, side, onClose, dispatch }: { state: GameState; good: MarketGood; side: OrderSide; onClose: () => void; dispatch: Dispatch }) {
  const orders = state.marketOrders[good];
  const scale = priceScale(good);
  const step = GOOD_SPECS[good].orderStep * scale;
  const stockStep = getBatchSize(good, 5);
  const name = LABELS[good].toLowerCase();
  if (side === "buy" && orders?.buy) {
    return (
      <div className="market-order-edit">
        <label>
          <span>Buy when the price is below</span>
          <OrderNumber label={`Buy ${name} below this price`} value={orders.buy.below * scale} step={step} decimals={1} onChange={(v) => dispatch((s) => changeBuyOrder(s, good, { below: (v ?? 0) / scale }))} />
          <span>{priceUnit(good)}</span>
        </label>
        <button type="button" onClick={() => dispatch((s) => setBuyOrderToToday(s, good))}>
          Today's price
        </button>
        <label>
          <span>Only while stock is under</span>
          <OrderNumber label={`Buy ${name} only while stock is under this`} value={orders.buy.stockUnder} step={stockStep} decimals={0} blankWord="any" onChange={(v) => dispatch((s) => changeBuyOrder(s, good, { stockUnder: v }))} />
        </label>
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
    );
  }
  if (side === "sell" && orders?.sell) {
    return (
      <div className="market-order-edit">
        <label>
          <span>Sell when the price is above</span>
          <OrderNumber label={`Sell ${name} above this price`} value={orders.sell.above * scale} step={step} decimals={1} onChange={(v) => dispatch((s) => changeSellOrder(s, good, { above: (v ?? 0) / scale }))} />
          <span>{priceUnit(good)}</span>
        </label>
        <button type="button" onClick={() => dispatch((s) => setSellOrderToToday(s, good))}>
          Today's price
        </button>
        <label>
          <span>Always keep</span>
          <OrderNumber label={`Always keep this much ${name}`} value={orders.sell.keep} step={stockStep} decimals={0} onChange={(v) => dispatch((s) => changeSellOrder(s, good, { keep: v ?? 0 }))} />
        </label>
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
    );
  }
  return null;
}

// What the orders are up to, in one line over the board.
function OrdersLine({ state }: { state: GameState }) {
  if (Object.keys(state.marketOrders).length === 0) return null;
  const on = countOrdersOn(state);
  const tally = state.orderTally;
  const thisMonth = tally && tally.year === state.date.year && tally.month === state.date.month ? tally : null;
  return (
    <p className="market__orders-line" data-tip={`Each order trades once a day: ${formatAmount(getBatchSize("coal", MARKET_ORDER_BATCHES))} of a good, or ${formatAmount(getBatchSize("food", MARKET_ORDER_BATCHES))} food. Prices move as they do for any trade.`}>
      <strong>{on === 1 ? "1 standing order on." : `${on} standing orders on.`}</strong> They leave {formatAmount(MARKET_ORDER_RESERVE)} {CURRENCY_SYMBOL} in the treasury. {thisMonth ? describeOrderTally(thisMonth, formatAmount) : "No trades by them yet this month."}
    </p>
  );
}

interface RowProps {
  state: GameState;
  good: MarketGood;
  perDay: number;
  quantity: number;
  openOrder: OrderSide | null;
  onOpenOrder: (side: OrderSide | null) => void;
  dispatch: Dispatch;
}

function MarketRow({ state, good, perDay, quantity, openOrder, onOpenOrder, dispatch }: RowProps) {
  const have = good === "food" ? state.stats.food : state.resources[good];
  const amount = getBatchSize(good, quantity);
  const buyCost = getMarketBuyCost(state, good, quantity);
  const sellRevenue = getMarketSellRevenue(state, good, quantity);
  const rounded = Math.round(perDay * 10) / 10;
  const marketStock = state.market.supply[good];

  return (
    <div className="market-good">
    <div className="market-row">
      <span className="market-row__good">
        <GoodIcon good={good} />
        <span className="market-row__name">{LABELS[good]}</span>
      </span>
      <span className="market-row__stock" title={`You have ${formatAmount(Math.floor(have))}, changing by ${rounded} a day`}>
        <strong>{formatAmount(Math.floor(have))}</strong>
        <span className={rounded > 0 ? "is-gain" : rounded < 0 ? "is-loss" : ""}>
          {rounded > 0 ? "+" : ""}
          {formatAmount(rounded)}/d
        </span>
      </span>
      <span
        className="market-row__price"
        title={`The market holds ${formatAmount(Math.floor(marketStock))}; normal is about ${formatAmount(GOOD_SPECS[good].equilibrium)}. Selling adds to it and lowers the price; buying drains it and raises the price.`}
      >
        {priceLabel(good, getMidPrice(good, marketStock))}
        <Trend state={state} good={good} />
      </span>
      <span className="market-row__actions">
        <button
          type="button"
          className="market-row__button btn-primary"
          disabled={!canBuyGood(state, good, quantity)}
          onClick={() => {
            playCoins();
            dispatch((s) => buyGood(s, good, quantity));
          }}
        >
          <span className="market-row__button-label">Buy {formatAmount(amount)}</span>
          <span className="market-row__button-money">
            −{formatAmount(Math.round(buyCost))} {CURRENCY_SYMBOL}
          </span>
        </button>
        <button
          type="button"
          className="market-row__button"
          disabled={!canSellGood(state, good, quantity)}
          onClick={() => {
            playCoins();
            dispatch((s) => sellGood(s, good, quantity));
          }}
        >
          <span className="market-row__button-label">Sell {formatAmount(amount)}</span>
          <span className="market-row__button-money">
            +{formatAmount(Math.round(sellRevenue))} {CURRENCY_SYMBOL}
          </span>
        </button>
      </span>
    </div>
    <div className="market-orders">
      <OrderChip state={state} good={good} side="buy" isOpen={openOrder === "buy"} onOpen={(open) => onOpenOrder(open ? "buy" : null)} dispatch={dispatch} />
      <OrderChip state={state} good={good} side="sell" isOpen={openOrder === "sell"} onOpen={(open) => onOpenOrder(open ? "sell" : null)} dispatch={dispatch} />
    </div>
    {openOrder && <OrderEditor state={state} good={good} side={openOrder} onClose={() => onOpenOrder(null)} dispatch={dispatch} />}
    </div>
  );
}

// A neighbour's offer, standing here until it's taken, put aside, or lapses:
// to sell you a lot, or to buy one of yours, with what the market would
// ask or pay for the same beside it.
function OfferCard({ state, dispatch }: { state: GameState; dispatch: MarketPanelProps["dispatch"] }) {
  const offer = state.pendingOffer;
  if (!offer) return null;
  const nation = getNation(offer.nationId);
  const selling = offer.kind === "sell";
  const market = selling ? getBuyCost(state.market, offer.good, offer.amount, holdsPort(state)) : getSellRevenue(state.market, offer.good, offer.amount);
  const feeling = relationsWord(state.neighbours[offer.nationId]?.relations ?? 0).toLowerCase();
  const daysLeft = offer.until ? dayNumber(offer.until) - dayNumber(state.date) : null;
  const canTake = canAcceptOffer(state);
  return (
    <section className="panel market-offer" aria-label={`A trade offer from ${nation.name}`}>
      <span className="market-offer__icon">
        {offer.good === "food" ? (
          <StatIcon type="food" size={30} />
        ) : (
          <svg viewBox="-10 -10 20 20" width={30} height={30} aria-hidden="true">
            <ResourceIcon type={offer.good} size={8} />
          </svg>
        )}
      </span>
      <div className="market-offer__body">
        <h3 className="market-offer__title">
          {nation.name} {selling ? "offers" : "would buy"} {formatAmount(offer.amount)} {offer.good}
          {daysLeft !== null && <span className="market-offer__days">{daysLeft > 0 ? `${daysLeft} days left` : "Last day"}</span>}
        </h3>
        <p className="market-offer__terms" title={`They are ${feeling} towards you; a deal would warm them.`}>
          For {formatAmount(offer.price)} {CURRENCY_SYMBOL}. The market would {selling ? "ask" : "pay"} {formatAmount(market)} {CURRENCY_SYMBOL}.
        </p>
      </div>
      <div className="market-offer__actions">
        <button
          type="button"
          className="btn-primary"
          disabled={!canTake}
          title={canTake ? undefined : selling ? "Not enough Crowns" : `Not enough ${offer.good} in store`}
          onClick={() => {
            playSeal();
            dispatch(acceptOffer);
          }}
        >
          {selling ? "Buy it" : "Sell it"}
        </button>
        <button type="button" onClick={() => dispatch(declineOffer)}>
          Put aside
        </button>
      </div>
    </section>
  );
}

export function MarketPanel({ state, production, dispatch }: MarketPanelProps) {
  const [quantity, setQuantity] = useState(1);
  const [openOrder, setOpenOrder] = useState<{ good: MarketGood; side: OrderSide } | null>(null);
  const hasPort = holdsPort(state);

  return (
    <div className="market">
      <OfferCard state={state} dispatch={dispatch} />
      <section className="panel market__board">
        <div className="market__head">
          <div className="market__quantity" role="group" aria-label="How much per trade">
            <span>Amount</span>
            {QUANTITIES.map((q) => (
              <button key={q} type="button" className={quantity === q ? "is-active" : ""} aria-pressed={quantity === q} onClick={() => setQuantity(q)}>
                ×{q}
              </button>
            ))}
          </div>
        </div>
        {hasPort && (
          <span className="market__port" title="A coastal port makes buying cheaper">
            ⚓ Port: cheaper buying
          </span>
        )}

        <OrdersLine state={state} />

        <div className="market__columns" aria-hidden="true">
          <span>Good</span>
          <span>You have</span>
          <span title="Supply and demand: selling floods the market and the price drops, buying drains it and the price climbs. Both recover over a few weeks.">Price ⓘ</span>
          <span />
        </div>

        {MARKET_GOODS.map((good) => (
          <MarketRow
            key={good}
            state={state}
            good={good}
            perDay={good === "food" ? production.netFood : production.resourceProduction[good]}
            quantity={quantity}
            openOrder={openOrder?.good === good ? openOrder.side : null}
            onOpenOrder={(side) => setOpenOrder(side ? { good, side } : null)}
            dispatch={dispatch}
          />
        ))}
      </section>
    </div>
  );
}
