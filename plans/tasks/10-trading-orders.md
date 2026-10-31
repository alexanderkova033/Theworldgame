# 10: Standing orders in the Market

Branch: `task/10-trading-orders`. Read `CLAUDE.md` first. Owner's list item 8.

## Why

Trading is one click at a time, and the game has no automatic buying or selling. The owner wants more of it, including "sell when the price is above" and "buy when the price is below".

## What to do

1. **Orders per good.** For each good in the Market (`src/presentation/components/MarketPanel.tsx`), the player can set:
   - Buy when the price is below X, and optionally only while the stock is under Y.
   - Sell when the price is above X, and always keep at least Y in stock.
   - Each can be switched on and off. Show at a glance which orders are running. Setting one should take a click or two, starting from today's price.
2. **Rules.** Orders run once a day, as their own step in the simulation, through `buyGood` and `sellGood` so that prices move as usual. Each trades a set amount a day (a constant), so an order can't empty the market in a day. An order never spends the treasury below a reserve the player can see, and never trades while the Market is shut or the port rules forbid it.
3. **Saves.** New `GameState` fields need a default in `hydrateGameState`. Old saves start with no orders.
4. **Notices.** Trades go to the log, not pop-ups. A month's report or the Market shows what the orders did, in one line.
5. **Scripted players** use no orders, so the balance tests must not change.

## Out of scope

Trade offers from neighbours, prices, and new goods. New windows or tabs.

## Done when

- Tests cover: buy below, sell above, the stock limits, the reserve, a shut market, and old saves loading.
- All checks in `CLAUDE.md` pass, and the balance figures are unchanged.
- A careful scripted game with orders on is reported under Results, to catch an order that makes easy money by buying low and selling high in a loop. Report the profit a year.
- Results include browser screenshots of the Market with orders set, with their file paths, so the owner can judge the look.

## Stop and ask if

Orders turn out to be a money machine: more than a small share of income from trading alone, with nothing being made.

## Results

