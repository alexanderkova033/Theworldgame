# 09: Wood burns worse than coal, and better buildings hold heat

Branch: `task/09-heating`. Read `CLAUDE.md` first. Runs after task 07. Owner's list item 9.

## Today

In winter, each working home burns `HEATING_FUEL_PER_HOME` (0.12) a day, multiplied by `heatingMultiplier`. A tenement or tower counts as the homes it is worth (`getHomeWeight`). `burnHeatingFuel` (`src/domain/housing/housingRules.ts:83`) burns coal first, then wood, one for one.

## What to do

1. **Wood is five times less efficient than coal.** Add a constant, `WOOD_PER_COAL_HEAT = 5`. Demand stays in coal. Coal still burns first, and the rest is met with five wood for each coal's worth. `unheatedShare` must stay correct.
2. **Better buildings have better insulation.** Each kind of home gets a heat share in `src/domain/constants.ts`: a home 1, a tenement about 0.8, an apartment block about 0.65, per home's worth. The figures are a starting point.
3. **Everything that reads fuel agrees.** Check `getHeatingOutlook.ts`, `getPopularityOutlook.ts`, `getDailyProductionSummary.ts`, `day/goods.ts:51`, `playDay.ts` (`isCold`), `decisionData.ts:23` and the advisor's coal alerts. Any check that adds coal and wood together one for one is now wrong.
4. **Words.** The Build tips (`ActionsPanel.tsx` lines 173, 190, 315) must give the real amounts. `causes.tsx` lines 124 and 142 say "Stock wood and ore for heating", but ore doesn't burn: fix them to coal and wood. The People window should show the player how long fuel lasts on what they actually hold.
5. **Astravia** makes no coal, so it will burn wood for longer. Measure its first winters on its own, and whether it can buy enough coal.

## Out of scope

The base fuel per home, the cold penalty, and the laws and research that change `heatingMultiplier`. The neighbours' heating, if they have none.

## Done when

- Tests cover coal first, the 5 to 1 rate, mixed fuel, a shortfall, and each kind of home.
- All checks in `CLAUDE.md` pass.
- Results report the 27-game ladder for each nation against `difficultyData.ts`.
- `TODO.md` records what was measured, and `GAME_DESIGN.md` is updated if it describes heating.

## Stop and ask if

The ladder moves by more than 3 wins of 27 at any level, or a nation can't get through a first winter on Normal when played carefully. Report the figures and what you would change. Do not retune the levels yourself.

## Results

**Finished after the owner's answer: Astravia starts with 120 more coal, and wood stays at 5 to 1. The ladder is the record exactly, Hard is 7, and all tests pass.** The first pass stopped on a "stop and ask" condition, and is kept below it under "First pass".

### Owner's answer: what changed

- `constants.ts`: `STARTING_EXTRA_COAL` is `{ astravia: 120 }`, read in `startNewGame.ts`. Astravia starts with 200 coal, the others 80.
- **Not added to Astravia as a neighbour.** A neighbour's `stores.coal` is goods for sale, not fuel. It burns none, `NEIGHBOUR_STORE_CAP` would cut 120 to 40 in the first month, and Astravia never sells coal because `WANTS` says it wants it. So it would change nothing. It is one line if the owner wants it anyway.
- **Earlier warning:** `ADVISOR_WINTER_PREP_DAYS` from 60 to 90, which is 1 September. New `isWinterFuelShort` in `getHeatingOutlook.ts` is read by the advisor and the top bar: the stock plus the coal the land digs before winter ends won't last it. The line reads "Winter starts in 90 days. Your coal and wood last 28 of its 90 days. Coal costs more once it starts." The last sentence shows only with the market open. No rule changes, and the scripted players read no alerts.
- **A bug in the count, fixed because the warning needs it:** `daysUntilWinter` counted 30 days too many, so 5 October said 86 days, not 56. So the old warning really came on 1 November, 30 days out, and its urgent stage at 15 days could never come. Now it can, in the advisor and the top bar chip.
- The People card's danger mark uses the same 90 days (was `< 60` written out).
- `STARTING_COAL` comment: 38 to 60 coal, as measured. `GAME_DESIGN.md` line 151 and `TODO.md` rough edges updated, with a new entry on Veldoria.
- Tests: Astravia alone gets the coal, the day count, the September edge, the land making up the difference, market wording, and in `balance.test.ts` a careful Caldenreich unwarned for three years.
- `difficultyData.ts` and the `balance.test.ts` line in `TODO.md` needed no change: the figures are the same ones, measured the same day. The Hard bound is untouched.

### The 27-game ladder with the coal

By nation is Astravia, Caldenreich, Veldoria. Replayed on the final code.

| Level | Recorded | Now | Change | Sloppy now (recorded run) | Careful now (recorded run) |
|---|---|---|---|---|---|
| Easy | 14 and 27 | **14 and 27** | none | 5, 8, 1 (same) | 9, 9, 9 (same) |
| Normal | 0 and 17 | **0 and 17** | none | 0, 0, 0 (same) | 7, 8, 2 (same) |
| Hard | 0 and 7 | **0 and 7** | none | 0, 0, 0 (same) | 4, 3, 0 (same) |
| Ruthless | 0 and 2 | **0 and 2** | none | 0, 0, 0 (same) | 0, 2, 0 (same) |

Game by game, no win or loss on these seeds differs from the recorded run. That is partly luck: on the other seeds, 4 of 216 games change (careful Veldoria on Normal, seeds 16 and 19; careful Astravia on Hard, seed 19; sloppy Astravia on Easy, seed 19). Seeds 11 to 19:

| Level | Before | Now | Sloppy now (before) | Careful now (before) |
|---|---|---|---|---|
| Easy | 13 and 27 | 12 and 27 | 5, 7, 0 (6, 7, 0) | 9, 9, 9 (same) |
| Normal | 0 and 14 | 0 and 12 | 0, 0, 0 (same) | 3, 9, 0 (3, 9, 2) |
| Hard | 0 and 8 | 0 and 7 | 0, 0, 0 (same) | 2, 5, 0 (3, 5, 0) |
| Ruthless | 0 and 3 | 0 and 3 | 0, 0, 0 (same) | 1, 2, 0 (same) |

The Normal fall on these seeds is Veldoria, which gets no extra coal.

### Astravia's second winter (December of year 1 to February of year 2)

Careful, both seed sets, 18 games at each level, all reaching it. Each cell is before, on 5 to 1 alone, and with the 120 coal.

| Level | Games cold | Median cold days | Worst | Fell by spring |
|---|---|---|---|---|
| Easy | 0, 0, **0** | 0, 0, **0** | 0, 0, **0** | 0, 0, **0** |
| Normal | 1, 12, **0** | 0, 4, **0** | 35, 34, **0** | 0, 1, **0** |
| Hard | 1, 12, **0** | 0, 12, **0** | 57, 39, **0** | 1, 3, **1** |
| Ruthless | 0, 16, **0** | 0, 30, **0** | 0, 52, **0** | 2, 7, **2** |

With the coal, no Astravia game at any level or skill burns wood or goes cold in that winter, and careful players buy none. Those that fall by spring fall for other reasons. Lowest coal at day 60 is 140.2.

**The third winter is where the bill comes.** Careful, with the coal:

| Level | Reached it | Games cold | Median and worst cold days | Average wood burned | Average coal bought, and cost |
|---|---|---|---|---|---|
| Easy | 18 | 0 | 0, 0 | 316 | 14, 840 Cr |
| Normal | 11 | 0 | 0, 0 | 262 | 18, 1,124 Cr |
| Hard | 7 | 1 | 0, 2 | 229 | 30, 1,686 Cr |
| Ruthless | 4 | 2 | 8, 9 | 186 | 31, 2,259 Cr |

### Does the warning leave Caldenreich alone?

It never fires in years 1 and 2, or in any sloppy game, or on Easy or Ruthless. Over both seed sets, careful, it fired in 2 of 69 autumns on Normal and 1 of 58 on Hard by the check on the 1st and 15th. A daily probe found 4 games: seeds 7, 99 and 11 on Normal in year 4, and seed 4 on Hard in year 3. In every one, coal dug per day was 0.00 with four provinces' seams worked out. The warning is true there. From a save on 1 September holding only 40 coal, Caldenreich shows nothing in Chrome, as its land digs enough.

It also fires for Astravia from its second autumn (31 of 49 on Normal, for example 94 of 108 coal on 1 September of year 2), never in year 1. It fires for Veldoria in nearly every autumn, including its first: 41 of 41 careful on Normal. That is true too, but it is one more item on the bar each autumn there.

### Do the start-screen summaries hold?

Yes, all four.

- Easy, "Room to learn": 27 careful and 14 sloppy of 27 (12 on the other seeds).
- Normal, "A careful player wins about half the time": 17 of 27, and 12 of 27 on the other seeds, 29 of 54 together.
- Hard, "about one game in four": 7 of 27 on both seed sets.
- Ruthless, "Not every country can be saved": 2 and 3 of 27.

Those are averages over very different nations. Caldenreich wins 17 of 18 on Normal, and Veldoria 2.

### Checks, on the final code

Run once, in this order. `npm test` did not fail, so there is no intermittent failure to record.

- `npx tsc -b`: no output, exit 0.
- `npm run lint`: the five known warnings only (`ResourceIcon.tsx`, `BuildingIcon.tsx`, `useGameClock.ts`, `Gauge.tsx`, `App.tsx`).
- `npm run build`: "built in 421ms".
- `npm test`: 37 files passed, 561 tests passed, in 114.56s.

### Looked at in a browser, for the warning

Chrome, Normal, market open, saves set to a date and a stock. No sideways scroll and no console errors.

- Astravia, 1 September, 12 coal and 60 wood, at 1400 and 1000 wide: "Winter coal: 32%" on the bar, 32% on the chip, and both tips read as above.
- Astravia, 30 August, same stock: nothing. Astravia, 1 September, 200 coal: nothing.
- Caldenreich, 1 September, 40 coal: nothing. Veldoria, 1 September, 40 coal: the warning.

I read tips from the attributes and did not hover to see them drawn.

### Not verified, or left for the owner

- Heat shares in play: no scripted game builds a tenement or apartment block.
- Whether a person acts on the warning in time. The September scratch player ran before the 120 coal and is not in the commit. The scripted ladder players ignore the warning.
- **Veldoria also digs no coal**, which the task did not say. It has no hills or forest and gets no extra coal. Careful on Normal it goes cold in 8 of 16 second winters and 7 of 9 third winters, and its wins over 18 seeds fell from 4 to 2. My first pass put this down to money, which is only half of it. Whether it should get coal too is the owner's.
- Astravia's start-screen bonus still says only "Starts with an extra farm." I left the words alone, as the task did not ask, but it now has a second bonus nobody is told about.
- `STARTING_STABILITY_BONUS` lives in `startNewGame.ts`, where the code rules would put it in `constants.ts`. Not touched.

## First pass, before the owner's answer

This section is the record of what stopped the task. Where it differs from the above, the above is current. One correction: it says the advisor warned 60 days before winter. It really warned 30 days before, because of the miscount above.

**Stopped on a "stop and ask" condition. Hard fell from 0 and 7 to 0 and 3: a move of 4, over the limit of 3, and below the bound of 5.**

### What changed

- `constants.ts`: `WOOD_PER_COAL_HEAT` 5. Heat shares `HEAT_SHARE_HOME` 1, `HEAT_SHARE_TENEMENT` 0.8, `HEAT_SHARE_TOWER` 0.65, the task's starting figures.
- `housingRules.ts`: `burnHeatingFuel` keeps demand in coal, burns coal first, then five wood for each coal's worth. `unheatedShare` is the part neither could meet. New `getHeatShare`, `getBuildingHeatDemand` and `getHeatInStock` (coal plus wood over 5). `getHeatingDemand` sums each working building's own demand.
- One-for-one sums replaced with `getHeatInStock`: `getHeatingOutlook.ts`, `day/goods.ts`, `playDay.ts` (`isCold`), `decisionData.ts` (`coalRunningOut`), and the scripted player's line in `tests/support/carefulPlayer.ts`. `getPopularityOutlook.ts` and `getDailyProductionSummary.ts` call `burnHeatingFuel`, so they were right already. `getQuickFix.ts` reads the outlook, so its coal is right too.
- Words. Build tips now say for example "Burns 0.29 coal a day in winter, or 1.44 wood", using the country's current `heatingMultiplier`. The Tenement summary no longer says it burns as much as its homes. `causes.tsx` says coal and wood, not ore. The advisor and the top bar's heating chip give days of fuel, not a sum of coal and wood.
- People window: the Heating card says "fuel for 28 of 90 days" on what is held. Its line reads "−0.8/d coal or −4.2/d wood · winter in 86 days". Tips on the two stocks give each one's days. `PeoplePanel.css`: the Buy coal button no longer gets squeezed past the card's edge.
- `tests/heating.test.ts`: 16 new tests for coal first, 5 to 1, mixed fuel, a shortfall, each kind of home, broken homes, and the readers of fuel.
- `TODO.md` entry, and `GAME_DESIGN.md` line 151.

### The 27-game ladder, sloppy and careful

Nine ladder seeds, every nation. The Before run was replayed at `2c5dbd9` and matches `difficultyData.ts` exactly. By nation is Astravia, Caldenreich, Veldoria.

| Level | Recorded and before | Now | Change | Sloppy now (before) | Careful now (before) |
|---|---|---|---|---|---|
| Easy | 14 and 27 | **12 and 27** | sloppy -2 | 3, 8, 1 (5, 8, 1) | 9, 9, 9 (same) |
| Normal | 0 and 17 | **0 and 14** | careful -3, at the limit | 0, 0, 0 (same) | 4, 8, 2 (7, 8, 2) |
| Hard | 0 and 7 | **0 and 3** | careful -4, **over the limit, below the bound** | 0, 0, 0 (same) | 0, 3, 0 (4, 3, 0) |
| Ruthless | 0 and 2 | **0 and 2** | none | 0, 0, 0 (same) | 0, 2, 0 (same) |

Seeds 11 to 19, replayed before and now:

| Level | Before | Now | Sloppy now (before) | Careful now (before) |
|---|---|---|---|---|
| Easy | 13 and 27 | 12 and 27 | 5, 7, 0 (6, 7, 0) | 9, 9, 9 (same) |
| Normal | 0 and 14 | 0 and 12 | 0, 0, 0 (same) | 3, 9, 0 (3, 9, 2) |
| Hard | 0 and 8 | 0 and 5 | 0, 0, 0 (same) | 0, 5, 0 (3, 5, 0) |
| Ruthless | 0 and 3 | 0 and 2 | 0, 0, 0 (same) | 0, 2, 0 (1, 2, 0) |

Caldenreich's careful wins do not move on any level or seed set. A second run of the changed rules gave the same wins, so the figures repeat.

Heat shares moved none of this: the scripted players build no tenements or apartment blocks. All of the fall comes from the wood rate.

### The 27 wood, and first winters

**Opening winter, January and February of year 1.** In all 432 games, at every level, skill and nation, no wood was burned and no day went cold, before and now. Lowest coal at day 60: Astravia 20.2, Caldenreich 89.6, Veldoria 36.8. Averages for first farm day, first homes day, and coal and wood at day 60 are the same as before. **So burning wood at 5 to 1 does not eat Caldenreich's and Veldoria's 27 wood, and nobody's opening winter goes cold because of it.**

**The next winter, December of year 1 to February of year 2.** Careful games over both seed sets. "Cold" is games with any cold day.

| Level, nation | Reached it | Cold, before | Cold, now | Median cold days, before and now | Worst, before and now | Fell by spring, before and now |
|---|---|---|---|---|---|---|
| Normal, Astravia | 18 | 1 | **12** | 0, 4 | 35, 34 | 0, 1 |
| Normal, Caldenreich | 18 | 0 | 0 | 0, 0 | 0, 0 | 0, 0 |
| Normal, Veldoria | 16 | 8 | 8 | 1, 4 | 27, 31 | 2, 2 |
| Hard, Astravia | 18 | 1 | **12** | 0, 12 | 57, 39 | 1, 3 |
| Hard, Veldoria (8 reached) | 8 | 2 | 4 | 0, 3 | 14, 20 | 2, 3 |
| Ruthless, Astravia | 18 | 0 | **16** | 0, 30 | 0, 52 | 2, 7 |
| Ruthless, Veldoria (6 reached) | 6 | 4 | 4 | 18, 24 | 25, 35 | 2, 2 |

Caldenreich has no cold day in this winter on any level, and burns no wood. Veldoria burns at most 17 wood in it (28.8 before), so its fuel trouble there is money for coal. Easy has no cold day here for any nation, careful or sloppy.

On the second stop condition, I would say no nation is shut out of a winter on Normal, but Astravia is close. All 18 careful games reach that winter, and only seed 13 falls before spring. That game fell before too, in month 4 instead of month 2. But it goes cold in 12 of 18, and the fall in its wins follows. The owner should judge this one.

**Astravia, and can it buy enough?** A winter there needs about 107 coal. It reaches December with about 27 coal and 38 to 156 wood, worth 8 to 31 coal. Its land gives 0.6 wood a day, which heats one home of its seven or more. Wood burned in that winter rose from 79 to 150 on Normal, and coal bought from 0 to 41.

Yes, it can buy enough, if it starts early. The scripted player buys only with three days left, so it pays about 54 Cr a coal in winter (Hard 58), about 2,300 Cr, and often runs out of money. A scratch player that lays coal in from September, keeping 500 Cr, paid 34 Cr a coal, about 2,000 Cr for 61 coal. It went cold in 2 of 18 on Normal and 5 of 18 on Hard. In the winter after, on Normal, 0 of 10. Astravia then won 9 of 18 on Normal (10 before, 7 as built), and 2 of 18 on Hard (7 before, 0 as built).

The advisor warns 60 days before winter, so a person gets told about a month after that player starts. Taking the neighbours' offers did not help much: 11 of 18 cold on Normal.

### Other levers, measured in a scratch copy only

Careful wins with Astravia, Caldenreich, Veldoria, ladder seeds then seeds 11 to 19. Nothing here is in the commit.

| Run | Normal | Hard | Ruthless |
|---|---|---|---|
| Before | 17 (7, 8, 2); 14 (3, 9, 2) | 7 (4, 3, 0); 8 (3, 5, 0) | 2 (0, 2, 0); 3 (1, 2, 0) |
| As built | 14 (4, 8, 2); 12 (3, 9, 0) | 3 (0, 3, 0); 5 (0, 5, 0) | 2 (0, 2, 0); 2 (0, 2, 0) |
| Astravia +80 coal | 17 (7, 8, 2); 12 (3, 9, 0) | 4 (1, 3, 0); 6 (1, 5, 0) | 2 (0, 2, 0); 3 (1, 2, 0) |
| Astravia +160 coal | 17 (7, 8, 2); 12 (3, 9, 0) | 6 (3, 3, 0); 7 (2, 5, 0) | 2 (0, 2, 0); 3 (1, 2, 0) |
| Wood 3 to 1 | 18 (6, 8, 4); 12 (3, 9, 0) | 4 (1, 3, 0); 5 (0, 5, 0) | 2 (0, 2, 0); 2 (0, 2, 0) |
| Wood 2 to 1 | 18 (7, 8, 3); 13 (3, 9, 1) | 5 (2, 3, 0); 6 (1, 5, 0) | 3 (1, 2, 0); 3 (1, 2, 0) |
| Player lays coal in from September | 18 (5, 8, 5); 16 (4, 9, 3) | 4 (1, 3, 0); 6 (1, 5, 0) | 2 (0, 2, 0); 2 (0, 2, 0) |
| Player takes neighbours' offers | 15 (5, 7, 3); 14 (4, 9, 1) | 2 (0, 2, 0); 7 (0, 7, 0) | 1 (0, 1, 0); 2 (0, 2, 0) |
| Both of those | 15 (5, 7, 3); 14 (4, 9, 1) | 2 (0, 2, 0); 7 (0, 7, 0) | 2 (1, 1, 0); 3 (1, 2, 0) |

Sloppy on Easy stays 12 to 13 in all of them. With +80 coal, Astravia has no cold day on Normal in the next winter, but 4 of 11 go cold in the one after. With +160, neither goes cold on Normal.

### Checks

Run in this order on the finished code. `npm test` was run twice and failed the same way both times, so this is not intermittent.

- `npx tsc -b`: no output, exit 0.
- `npm run lint`: the five known warnings only (`useGameClock.ts`, `BuildingIcon.tsx`, `ResourceIcon.tsx`, `Gauge.tsx`, `App.tsx`).
- `npm run build`: "built in 273ms".
- `npm test`: **1 failed, 555 passed, of 556. 36 files passed, 1 failed, in 76.27s.** `tests/balance.test.ts > difficulty > Hard: a careful player wins about a third of its games, a sloppy one never`: `AssertionError: expected 3 to be greater than or equal to 5`. This is the ladder above, and the bound is unchanged.

### Looked at in a browser

Chrome, at 1400 and 1000 wide, Astravia on Normal, from a save set to 5 October and 5 December with 12 coal and 60 wood. No sideways scroll and no console errors. The card reads "fuel for 28 of 90 days", and 28 of 86 in winter, which matches 12 + 60/5 = 24 coal's worth at 0.84 a day. Screenshots are outside the repo, in the session's scratchpad `shot` folder.

### Not verified

- Heat shares in play. No scripted game builds a tenement or apartment block, so 0.8 and 0.65 are checked by unit tests only, and their effect on balance is unmeasured.
- Tips as drawn. I read the attributes and did not hover. The apartment block's tip was locked on screen, so its figure (0.55 coal, 2.73 wood) is checked only through `getBuildingHeatDemand`.
- The advisor's new autumn line and the top bar chip's autumn line on screen: the first is in a test, the second was not seen.
- How a real player handles Astravia's coal. Only scripts were measured.

### Left open

- The recorded ladder in `difficultyData.ts` and `TODO.md`, the Hard bound, and the failing test wait on the owner's answer.
- The summaries on the start screen ("A careful player wins about half the time", "about one game in four" on Hard) are less true at 14 and 3 of 27.
- Veldoria: its next winter was already cold in half its games, and is now longer (median 1 to 4 days). This is from coal being its whole supply, and worth a look with the nation balance.
- The comment on `STARTING_COAL` says the starting homes burn about 50 coal. Astravia on Easy burns 60. I left it.

