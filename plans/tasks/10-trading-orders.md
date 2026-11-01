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

**What changed.** Each good in the Market has a strip of two orders under its row. New: `day/marketOrders.ts` (the day's first step), `actions/marketOrderActions.ts` (setting orders, and one test of whether an order trades today, used by the step and by the tips), `tests/marketOrders.test.ts`, and a "standing orders" block in `tests/balance.test.ts`. `GameState` gains `marketOrders` and `orderTally`, with defaults in `hydrateGameState`. `day/goods.ts`, `housingRules.ts` and `getHeatingOutlook.ts` are untouched. `simulateDay` changes by one call at its top. TECHNICAL_DESIGN and GAME_DESIGN each have a short paragraph.

**Setting an order.** Click "Buy order" or "Sell order" under a good. One click makes it at today's price, switches it on and opens its terms. A sell order starts by keeping what you hold today. The price and stock figures take the - and + buttons or typing, and "Today's price" resets the price. The On/Off box switches an order and keeps its numbers. An order that is on is solid green. The tip says why it waits or that it trades today. A line over the board counts the orders on, states the reserve, and gives the month's trades.

**Constants.** `MARKET_ORDER_BATCHES` = 1, so 5 of a good or 2,000 food a day per order. `MARKET_ORDER_RESERVE` = 500 Cr, fixed and shown in the Market. The price step per click (`GOOD_SPECS.orderStep`) is 1 Cr for wood, ore and coal, 0.5 Cr for grain and fish, and 0.5 Cr per 1,000 for food.

**Choices the task left open.**
- "The price" is the mid price the row shows, not the dearer buy or lower sell price. Orders trade at dawn, at the price the player last saw, and sales go first.
- A stock limit can be passed by up to one batch: 148 buys to 153 under a limit of 150.
- If a good's buy limit is at or over its sell limit, neither order trades and the tip says why. Otherwise the two would pay the spread every day.
- The log has one line a month, rewritten as the month goes on, not a line per trade. Daily lines would fill the 100-entry log in about three months and push out everything else.
- The Market's line covers the current month only. Earlier months are in the log.

**Port rules.** No rule forbids trading by port today: a port only makes buying cheaper. Orders use `canBuyGood` and `canSellGood`, so a rule added there would hold for orders too, and port pricing already applies through `getMarketBuyCost`. There was nothing further to test.

**Identical with no orders.** 135 whole games were played at 2016eac and on this branch: 5 seeds, 3 nations, 4 levels, sloppy and careful, five years each, plus 15 idle games. Each game's hash covers every 30th day and the end state in full, leaving out only the two new fields and the counter in ids. Result: 135 games, 0 different, 135 distinct hashes. With no order on, the step returns the same object and rolls no dice. The comparison script was scratch and is not committed.

**Money machine: not found, so no stop and ask.**
- Trading alone: a shop in an empty world, with Astravia's port and 100,000 Cr to work with, makes and consumes nothing. 5 years, 6 seeds, buy limits 0.5 to 1.4 of base, sell limits 1.0 to 3.2, stock limits none, 4, 10 or 30 batches, all six goods. The best setting earned 0 Cr a year on every good, which means not trading at all. With buying a further 20% cheaper as a stress test: coal 1.2 Cr a year, grain 3.7 Cr a year, the rest 0. A country's income is about 12,500 Cr a year. Unsold stock was counted generously, at the normal sell price.
- A careful scripted game with orders on every good, Easy, five years, 18 games (6 seeds, 3 nations), with stock limits of 150 (60,000 food) and a keep of 30 (20,000 food):

| Buy below / sell above (of base) | Net Cr a year from orders | Share of income | Mean end treasury, with / without | Wins of 18, with / without |
|---|---|---|---|---|
| 0.7 / 1.4 | -1,825 | -14.4% | 21,213 / 23,435 | 18 / 18 |
| 0.8 / 1.6 | -5,891 | -46.8% | 14,319 / 23,435 | 17 / 18 |
| 0.9 / 2.0 | -9,798 | -78.4% | 6,537 / 23,435 | 16 / 18 |

Net is what the orders earned less what they spent, so it counts goods bought and then used up as a cost. At 0.7 / 1.4, games ranged from -8,252 to +2,171 Cr a year. The best was Caldenreich, which ends about 10,000 Cr up that game: it sells coal its own land makes. That is goods being made and is what a click would earn, but orders do make selling a surplus effortless, so it is worth watching. Careless orders do cost a country: the wins fall at the loosest setting.

**Coal ahead of winter.** A buy order with "stock under 150", on Dec 1 of years 1, 2, 3 (Dec 1 is when winter starts), careful scripted game, Easy, one seed:
- Astravia: under 1.15 of base gives 150, 153, 151 coal, against 20, 0, 0 with no order. Under 1.0 of base gives 70, 100, 80.
- Veldoria: under 1.5 of base gives 152, 152, 152, against 37, 2, 2 with no order. Under 1.3 gives 62, 102, 151. Under 1.15 buys nothing, as its price stayed higher.
- Caldenreich digs its own coal and already holds 360 to 789, over the limit.
So the limit works, but the price limit decides how fast it fills: buying raises the price, and the market recovers only 4% of the gap a day. Set it near today's price and the order buys slowly. Nothing tells the player the order will fall short of the limit by winter. Wood uses the same code; its orders are tested for a single day, not over a winter.

**Checks.**
- `npx tsc -b`: exit 0.
- `npm run lint`: the five known warnings (BuildingIcon, ResourceIcon and Gauge fast refresh; useGameClock and App hook dependencies), nothing new.
- `npm run build`: built in 389ms.
- `npm test`: 37 files passed, 567 tests passed, one run, no intermittent failure.
- Browser (headless Chrome, driven through real clicks and typing): one click on an unset chip took the orders on from 2 to 3; + moved the price; a typed stock limit reached the chip; no sideways scroll at 1000px; the month's line appears in Reports, Event Log, with a Market button. The line never pops up, by its kind's `toast: "never"`; that part is read from the code, not watched in play.

**Screenshots.**
- C:/Users/lorta/AppData/Local/Temp/claude/c--Users-lorta-Documents-repos-Theworldgame/e368a804-c798-48e1-adaa-e1b647feed00/scratchpad/t10-shots/market-orders-1400.png
- C:/Users/lorta/AppData/Local/Temp/claude/c--Users-lorta-Documents-repos-Theworldgame/e368a804-c798-48e1-adaa-e1b647feed00/scratchpad/t10-shots/market-orders-editor-1400.png
- C:/Users/lorta/AppData/Local/Temp/claude/c--Users-lorta-Documents-repos-Theworldgame/e368a804-c798-48e1-adaa-e1b647feed00/scratchpad/t10-shots/market-orders-editor-1000.png
- C:/Users/lorta/AppData/Local/Temp/claude/c--Users-lorta-Documents-repos-Theworldgame/e368a804-c798-48e1-adaa-e1b647feed00/scratchpad/t10-shots/orders-in-log-1400.png

**Could not verify, or left open.**
- The other branch's heating is not merged, so all coal figures are under today's single burn rate. Rerun the coal check after it lands, since different burn rates change how much a country wants to hold. Its goods.ts and this branch do not overlap, as goods.ts is untouched here.
- The shop search uses fixed limits. A player who changes limits by hand with the seasons was not searched, though the fixed grid already covers buying in autumn's low prices and selling in winter's high ones.
- Long games ran on Easy only for the orders figures. No real player has tried this.
- The reserve is fixed at 500 Cr. It is a large share of the treasury early on, and little later. The task asked for one the player can see, not one the player sets.
- The look was not shown to the owner before building, as CLAUDE.md asks for changes to the look. This adds a control to an existing board and restyles nothing, so the screenshots are for the owner to judge.
- A narrow phone width was not looked at. The strip wraps, but was checked only at 1400 and 1000px.

