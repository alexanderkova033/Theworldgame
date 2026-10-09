// Trade, as one board: a row per good (the four raw resources and food),
// each with what you hold, what the market holds, today's price, and
// Buy / Sell. Prices are supply and demand (see domain/market): selling
// floods the market and the price drops, buying drains it and the price
// climbs, and both settle back over the following weeks. Money and loans
// sit alongside.
import "./TradePanel.css";
import { useState } from "react";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { buyGood, canBuyGood, canSellGood, getMarketBuyCost, getMarketSellRevenue, sellGood } from "../../application/actions";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { GOOD_SPECS, MARKET_GOODS, getBatchSize, getMidPrice, getPriceRatio, nationHasPort } from "../../domain/market/marketRules";
import type { MarketGood } from "../../domain/market/types";
import { getNation } from "../../domain/nations/nationRules";
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

const LABELS: Record<MarketGood, string> = {
  wood: "Wood",
  ore: "Ore",
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
  if (ratio > 1.1) return <span className="trade-row__trend is-up">↑ scarce</span>;
  if (ratio < 0.9) return <span className="trade-row__trend is-down">↓ plentiful</span>;
  return <span className="trade-row__trend">normal</span>;
}

// Food is priced per thousand — a single unit is a fraction of a Crown.
function priceLabel(good: MarketGood, mid: number): string {
  return good === "food" ? `${(mid * 1000).toFixed(1)} ${CURRENCY_SYMBOL} per 1,000` : `${mid.toFixed(1)} ${CURRENCY_SYMBOL} each`;
}

interface RowProps {
  state: GameState;
  good: MarketGood;
  perDay: number;
  quantity: number;
  dispatch: Dispatch;
}

function TradeRow({ state, good, perDay, quantity, dispatch }: RowProps) {
  const have = good === "food" ? state.stats.food : state.resources[good];
  const amount = getBatchSize(good, quantity);
  const buyCost = getMarketBuyCost(state, good, quantity);
  const sellRevenue = getMarketSellRevenue(state, good, quantity);
  const rounded = Math.round(perDay * 10) / 10;
  const marketStock = state.market.supply[good];

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
      <span
        className="trade-row__price"
        title={`The market holds ${formatCompact(Math.floor(marketStock))}; normal is about ${formatCompact(GOOD_SPECS[good].equilibrium)}. Selling adds to it and lowers the price; buying drains it and raises the price.`}
      >
        {priceLabel(good, getMidPrice(good, marketStock))}
        <Trend state={state} good={good} />
      </span>
      <span className="trade-row__actions">
        <button
          type="button"
          className="trade-row__button btn-primary"
          disabled={!canBuyGood(state, good, quantity)}
          onClick={() => {
            playConfirm();
            dispatch((s) => buyGood(s, good, quantity));
          }}
        >
          <span className="trade-row__button-label">Buy {formatCompact(amount)}</span>
          <span className="trade-row__button-money">
            −{Math.round(buyCost).toLocaleString()} {CURRENCY_SYMBOL}
          </span>
        </button>
        <button
          type="button"
          className="trade-row__button"
          disabled={!canSellGood(state, good, quantity)}
          onClick={() => {
            playConfirm();
            dispatch((s) => sellGood(s, good, quantity));
          }}
        >
          <span className="trade-row__button-label">Sell {formatCompact(amount)}</span>
          <span className="trade-row__button-money">
            +{Math.round(sellRevenue).toLocaleString()} {CURRENCY_SYMBOL}
          </span>
        </button>
      </span>
    </div>
  );
}

export function TradePanel({ state, production, dispatch }: TradePanelProps) {
  const [quantity, setQuantity] = useState(1);
  const hasPort = nationHasPort(getNation(state.nationId));

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
        {hasPort && (
          <span className="trade__port" title="A coastal port makes buying cheaper">
            ⚓ Port: cheaper buying
          </span>
        )}

        <div className="trade__columns" aria-hidden="true">
          <span>Good</span>
          <span>You have</span>
          <span title="Supply and demand: selling floods the market and the price drops, buying drains it and the price climbs. Both recover over a few weeks.">Price ⓘ</span>
          <span />
        </div>

        {MARKET_GOODS.map((good) => (
          <TradeRow
            key={good}
            state={state}
            good={good}
            perDay={good === "food" ? production.netFood : production.resourceProduction[good]}
            quantity={quantity}
            dispatch={dispatch}
          />
        ))}
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

        <DebtPanel state={state} dispatch={dispatch} />
      </aside>
    </div>
  );
}
