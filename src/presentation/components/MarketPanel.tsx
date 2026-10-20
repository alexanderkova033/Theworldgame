// The market, as one board: a row per good (the raw resources, coal and
// food), each with what you hold, today's price, and Buy / Sell. Prices are
// supply and demand (see domain/market): selling floods the market and the
// price drops, buying drains it and the price climbs, and both settle back
// over the following weeks.
import "./MarketPanel.css";
import { useState } from "react";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { buyGood, canBuyGood, canSellGood, getMarketBuyCost, getMarketSellRevenue, sellGood } from "../../application/actions";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { GOOD_SPECS, MARKET_GOODS, getBatchSize, getMidPrice, getPriceRatio, holdsPort } from "../../domain/market/marketRules";
import type { MarketGood } from "../../domain/market/types";
import { formatAmount } from "../formatNumber";
import { playCoins } from "../audio/sound";
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

interface RowProps {
  state: GameState;
  good: MarketGood;
  perDay: number;
  quantity: number;
  dispatch: Dispatch;
}

function MarketRow({ state, good, perDay, quantity, dispatch }: RowProps) {
  const have = good === "food" ? state.stats.food : state.resources[good];
  const amount = getBatchSize(good, quantity);
  const buyCost = getMarketBuyCost(state, good, quantity);
  const sellRevenue = getMarketSellRevenue(state, good, quantity);
  const rounded = Math.round(perDay * 10) / 10;
  const marketStock = state.market.supply[good];

  return (
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
  );
}

export function MarketPanel({ state, production, dispatch }: MarketPanelProps) {
  const [quantity, setQuantity] = useState(1);
  const hasPort = holdsPort(state);

  return (
    <div className="market">
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
            dispatch={dispatch}
          />
        ))}
      </section>
    </div>
  );
}
