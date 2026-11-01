// The day's first step: the standing orders trade, at the prices the Market
// showed the player overnight, through the same buyGood and sellGood as a click
// (so prices move and the ledger books it under trade). Sales come first, so
// what they bring in can pay for today's buying. With no order switched on the
// state goes through untouched, and rolls no dice.
//
// The log keeps one line a month, rewritten as the month goes on: daily lines
// would push everything else out of it within a season.
import { generateId } from "../../domain/country/id";
import { MARKET_ORDER_BATCHES, MAX_EVENT_LOG_LENGTH } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { MARKET_GOODS, getBatchSize } from "../../domain/market/marketRules";
import type { MarketGood, OrderTally } from "../../domain/market/types";
import { buyGood, sellGood } from "../actions/marketActions";
import { countOrdersOn, describeOrderTally, whyBuyOrderWaits, whySellOrderWaits } from "../actions/marketOrderActions";

function tallyOf(state: GameState): OrderTally {
  const { year, month } = state.date;
  const tally = state.orderTally;
  return tally && tally.year === year && tally.month === month ? tally : { year, month, bought: {}, sold: {}, spent: 0, earned: 0 };
}

function added(amounts: OrderTally["bought"], good: MarketGood, amount: number): OrderTally["bought"] {
  return { ...amounts, [good]: (amounts[good] ?? 0) + amount };
}

export function runMarketOrders(state: GameState): GameState {
  if (state.isGameOver || countOrdersOn(state) === 0) return state;
  let s = state;
  let tally = tallyOf(state);
  for (const good of MARKET_GOODS) {
    const amount = getBatchSize(good, MARKET_ORDER_BATCHES);
    if (whySellOrderWaits(s, good) === null) {
      const before = s.stats.treasury;
      s = sellGood(s, good, MARKET_ORDER_BATCHES);
      tally = { ...tally, sold: added(tally.sold, good, amount), earned: tally.earned + s.stats.treasury - before };
    }
    if (whyBuyOrderWaits(s, good) === null) {
      const before = s.stats.treasury;
      s = buyGood(s, good, MARKET_ORDER_BATCHES);
      tally = { ...tally, bought: added(tally.bought, good, amount), spent: tally.spent + before - s.stats.treasury };
    }
  }
  if (s === state) return state;
  const lines = s.events.filter((e) => !(e.topic === "orders" && e.date.year === tally.year && e.date.month === tally.month));
  return {
    ...s,
    orderTally: tally,
    events: [{ id: generateId("event"), date: s.date, message: describeOrderTally(tally), severity: "info" as const, topic: "orders" as const }, ...lines].slice(0, MAX_EVENT_LOG_LENGTH),
  };
}
