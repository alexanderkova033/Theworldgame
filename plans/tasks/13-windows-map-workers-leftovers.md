# Task 13: leftovers in windows, the map and workers

Follow-ups recorded in `plans/board.md`. First check that each is still true in the current code: if one is already fixed, say so under Results and move on.

## Do

### Windows

1. A burden offer opens over the window rather than holding it back. Make it wait like other held windows (`src/presentation/windowHold.ts`).
2. The "more waiting" sign shows on briefings only. Show it wherever a further item is queued behind the one on screen.
3. A held window stays hidden for the day while a story letter is queued. It should come back when the letter is closed.

### Workers

4. "Farms: 84% staffed" shows in red even when the player's own limit is the cause. When a limit is holding the jobs back, the advisor row should not raise it as an alarm and should say the limit is the reason. A real shortage still shows as it does today.
5. A service in progress shows days left and no progress bar. Show a bar as a repair does. Store what it needs on the building, with old saves still loading, including a save made during a service.

### Map and tips

6. Strike and riot crowds can stand partly over the shoreline (`placeCrowds`). Keep them on land.
7. A regiment passing over a country's name at sea hasn't been seen on screen. Look at it in the browser. If it reads badly, fix it within the existing map rules, and give a screenshot either way.
8. The money and goods cost tips in Build stay `title`, because `Tooltips.tsx` only follows a changing `title`. Move them to `data-tip` so that only one tip shows at a time, with the tip text still updating.

### Tests and measurements

Add lasting tests where they say so. Otherwise measure, report under Results, and do not commit the measuring script.

9. Heat shares 0.8 and 0.65 have unit tests only. Add a test that plays a game with tenements and apartment blocks and shows their fuel use.
10. Task 11's whole-game test under a limit doesn't assert that a war broke out. Make it do so. If no seed brings a war within the game, say so and start one the way `tests/army.test.ts` does.
11. Measure, as new `playCarefully` habits only: a player moving people with the seasons, and laws or research that cut jobs while a limit is set. Also count schools built in the school runs from task 11, since the evidence there was weak.
12. No game has tested whether islands relieve the worker shortage. Measure it.
13. Trace why Veldoria loses most, and why it wins nothing on Hard or Ruthless. Report the causes with numbers. Do not change anything for it.
14. `isAtJobCeiling` was to be replaced by task 08b. If it's dead code, remove it.

## Do not

- Change the rules of play, any balance number or `tests/balance.test.ts` bounds. The ladder recorded in `src/domain/difficulty/difficultyData.ts` must stay exactly as it is. The default behaviour of `playCarefully` stays the same.
- Add a window, a tab or a new visual style.
- Touch Objectives, the market, forecasts or `src/application/getAdvisorOutlook.ts` beyond item 4: task 12 is working there.

## Stop and ask

If any item would move the ladder, leave that item undone, write why under Results, and finish the rest.

## Checks

`npx tsc -b`, `npm run lint` (five known warnings), `npm run build`, `npm test`. For interface changes, look at the screen in a browser at a normal window and at about 1000px wide, and give the screenshot paths. Put them in the scratchpad, not the repo. Say plainly what you could not see.

## Results

Branch `task/13-windows-map-workers`, from `34de9d1`. No rule of play, balance number, `tests/balance.test.ts` bound or ladder entry changed.

### Item by item

| # | Item | State |
|---|------|-------|
| 1 | Burden offer holds the window back | Done |
| 2 | "More waiting" sign on every letter | Done |
| 3 | Window returns when the letter closes | Done, with a side effect below |
| 4 | A limit is no alarm on the farm row | Done, farms only, see below |
| 5 | Bar on a service in progress | Done, and the repair's bar had to be fixed too |
| 6 | Crowds on land | Done, at a cost to review below |
| 7 | Regiment over a name at sea | Looked at, reads acceptably, not changed |
| 8 | Cost tips use `data-tip` and still update | Done |
| 9 | Game with tenements and apartment blocks | Done, lasting test |
| 10 | Whole game under a limit asserts a war | Done, lasting test |
| 11 | Seasons, job cuts under a limit, schools counted | Measured |
| 12 | Do islands relieve the shortage | Measured |
| 13 | Why Veldoria loses | Traced, nothing changed for it |
| 14 | `isAtJobCeiling` | Already gone: no code or test names it, and `getJobCeiling.ts` no longer exists |

### What changed

- **1.** `App.tsx` holds the window when `burdenOffer` arrives, as for other letters.
- **2.** `MoreWaiting.tsx` is the one sign, used by briefings and all five other letters. `lettersBehind` in `application/chapters.ts` counts the other open letters and the queued story letters.
- **3.** The window now returns when `isLetterWaiting` is false, whatever is queued. With a story letter due the next day, the window comes back for that one day and the next letter then holds it again. That follows the item as written, but the owner may see it as a flicker.
- **4.** The row compares today's farm staffing with what no limit would give. If they differ it reads "Farms: 63%, your limit", and its tip gives both figures. Red now depends only on the figure with no limit, so a limit on top of a real shortage still shows red and names the limit. Factories keep today's row: they fill last and a limit leaves no one jobless, so a limit can hardly hold them back. This is reasoned from the code. When farms are held only by a limit, a real factory shortage stays hidden behind the farm row, as it already was behind any farm row.
- **5.** `serviceDays` is stored on the building and cleared wherever `serviceUntilDay` is. A save from before it has only the days left: over 5 days left means an untrained crew, otherwise a trained crew is assumed, so an old untrained service with 5 days or fewer left shows the wrong share. The row keeps the words "Crew at work". **`.progress-bar` has no base style anywhere**, so the repair's bar could not be seen either. Both rows now use the shared `Gauge`.
- **6.** A crowd's ground must keep its picture's whole outline on land. See the cost below.
- **8.** Both cost tips use `data-tip`, and `Tooltips.tsx` now follows a changing `data-tip`. That should also keep a reason's tip current, which I did not test separately.
- **9.** `tests/heating.test.ts` plays three years with both buildings. The research and goods are given to it, since the test is about fuel. It also compares a day's real stock drop with the same homes as ordinary ones.
- **10.** `tests/trainedWorkers.test.ts` now plays two sets of games. **No war came in 90 games (30 seeds, 3 nations) with garrisons and war on together.** The garrison habit appears to scatter the regiments the war habit gathers. Without garrisons, wars come by themselves under a limit: at seed 7, Caldenreich 69 war days and Veldoria 59, Astravia 0. So no war had to be started by hand, and the test asserts war days above 0 in that set.
- `TECHNICAL_DESIGN.md` is updated for items 3 and 5.

### Needs a decision: item 6's cost

Crowds touching a building's room, of 44 crowds, using the wide `crowdTouches` box:

| Buildings a place | Over water, before and now | Touching a building, before and now | Places with camp and square under 60 apart, before and now |
|---|---|---|---|
| 2 | 20 to 0 | 0 to 8 | 2 to 5 |
| 3 | 20 to 0 | 1 to 11 | 2 to 5 |
| 6 | 23 to 0 | 6 to 19 | 3 to 10 |

Before, many crowds kept clear of buildings by hanging over the sea. A crowd only touches now when its place has no dry, clear ground (for a square, none that is also far enough from the camp). I followed the item, so land wins, but this works against "map pictures never overlap". Screenshots show crowds close beside buildings in small coastal provinces. Levers, none tried: smaller crowds where room is short, or letting a square stand nearer the camp before it touches a building.

### Item 7

Regiments do cross names: at least 11 nation and island pairs had a counter over a name (the scan stopped early on a page-load timeout, so this is no share of all routes), as sea ways run near the coast where names lie. The counter is opaque and drawn on top. It stays readable and hides a few letters while it passes, and the rest of the name still reads. I judged that not bad enough to change. A slow leg could leave it there for some days, which I saw only as still screenshots of states I made, not as a march playing.

### Measurements

18 seeds (ladder and 11 to 19), so 54 careful games a row unless stated. The Automatic baseline gave the recorded 33, 15, 4, and 10, 17, 6 by nation on Normal. A difference of a few games is within chance, since any change reshuffles the dice.

**9. Winter coal, against the same homes as ordinary ones:** year 1, 42 against 46; year 2, 196 against 243; year 3, 343 against 454.

**11. Moving people with the seasons** (limit set in November, Automatic set in February):

| Script | Normal | Hard | Ruthless | Days without food, Normal |
|---|---|---|---|---|
| Automatic | 33 (10, 17, 6) | 15 (6, 9, 0) | 4 (1, 3, 0) | 482 |
| Farms at 70% in winter | 36 (12, 17, 7) | 16 (4, 12, 0) | 4 (2, 2, 0) | 621 |
| Farms at 50% in winter | 34 (11, 17, 6) | 15 (4, 11, 0) | 3 (1, 2, 0) | 703 |

No clear gain. On Normal, more days without food; farm skill falls from 98.7% to 98.4% and 98.1%.

**11. Paths that cut jobs, under a limit at 18% of population, Normal:**

| Path | Automatic | Limit | Jobless, Automatic and limit |
|---|---|---|---|
| `agriculture-machines` (research) | 12 | 9 | 22.3%, 23.2% |
| `industry-precision` (research) | 33 | 29 | 9.5%, 7.9% |
| `labor-output` (law) | 29 | 32 | 9.2%, 8.6% |

Nothing broke and the limit neither saved nor sank a path. Following `agriculture-machines` wins far less than other paths and leaves 22% jobless, with or without a limit: worth a look by the owner. These runs did not repeat the per-day labour checks of the whole-game test, and once farm jobs are cut this limit may not bite at all.

**11. Schools, ordered at 2,500 Cr:**

| Level | Games a school was ordered, of 54 | Median month | Wins, no limit and limit of 125 |
|---|---|---|---|
| Easy | 54 | 9 | 54, 54 |
| Normal | 21 | 24 | 33, 33 |
| Hard | 8 | 33 | 15, 15 |
| Ruthless | 2 | 35 | 4, 5 |

Task 11's guess that the script never afforded a school on Hard was wrong: it did in 8 games and wins still matched Automatic. Above Easy the evidence on schools stays thin, as most games never order one.

**12. Islands: little relief, and not everywhere.** 18 games a row. Jobs over workers at month 48, and factory staffing at month 48:

| Easy | No settling | Settling | Islands at end |
|---|---|---|---|
| Astravia | 9%, 57% | 16%, 35% | 5.9 |
| Caldenreich | 12%, 79% | 13%, 76% | 3.3 |
| Veldoria | 24%, 54% | 19%, 65% | 2.2 |

Only Veldoria is relieved. Islands bring jobs as well as people, and those on them can't commute: on Easy they hold 15% to 29% of workers, with 5% to 12% of them jobless while the country is short. Above Easy the script rarely settles (Normal 7, 4, 1 of 18 games; Hard 2, 1, 0), and wins barely move (Hard Astravia 6 to 7, the rest the same), so that evidence is thin. The script settles but doesn't build for the shortage, so a person could do better.

**13. Why Veldoria loses.** It fails on stability, not at elections. Of 18:

| Level | Veldoria | Astravia | Caldenreich |
|---|---|---|---|
| Normal, won, collapsed, voted out | 6, 8, 4 | 10, 2, 6 | 17, 0, 1 |
| Hard | 0, 17, 1 | 6, 2, 10 | 9, 0, 9 |
| Ruthless | 0, 16, 2 | 1, 4, 13 | 3, 0, 15 |

Median month of a Veldoria collapse: 17, 11, 9. Stability a month on Hard, months 1 to 6 then 7 to 12: Veldoria -2.7, -3.0; Astravia -1.3, -1.6; Caldenreich +0.3, +1.8.

Causes, with what each is worth on Hard in months 1 to 6:

1. **No stability income.** Caldenreich's creed gives +1.5 a month and its starting bonus +5. Veldoria's creed gives none (it gives industry, less hardship, and dearer wages at 1.3 times).
2. **Few provinces.** The drag is the share of people in rioting provinces (`getProvinceRiotDrag`), so one province of four weighs more than one of six: -2.5 against Astravia's -1.4 and Caldenreich's -0.8. That the province count is the reason is inferred from the rule, not isolated by a test.
3. **Thin food.** -1.0 against Astravia's 0: month 6 stock about 56,000 against about 623,000, and 8% of first-year days with no food (Astravia 0%).
4. **Less from police.** +2.2 against +2.9, probably as money is tighter, though I did not trace this one.
5. **A spiral at the end.** In the last 60 days food, provinces and homes each take about 9 to 10 points.
6. **Fuel and debt on Normal.** 374 days with no fuel in winter against 166 and 4, and debt about 4,800 by month 48 against about 340 and 1,200.

**Two walls, which is why it wins nothing on Hard or Ruthless.** With Caldenreich's +0.05 a day, Veldoria never collapses at any level (8, 17, 16 fall to 0), but it is then voted out (9, 18 and 17 games; on Hard and Ruthless the median game ends at month 19, the first election) and wins 9, 0, 1. Removing one suspect at a time, wins on Normal, Hard, Ruthless (as it is: 6, 0, 0):

| Change, in the script only | Wins |
|---|---|
| +0.05 stability a day | 9, 0, 1 |
| 2,000 Cr at the start | 9, 3, 0 |
| 400 more coal | 8, 2, 0 |
| No wear of office | 11, 1, 1 |
| +5 starting stability | 6, 1, 0 |
| Nothing broken at the start | 8, 0, 0 |
| No starting debt | 8, 0, 0 |
| Twice the food at the start | 7, 0, 0 |
| No story | 6, 0, 0 |
| No random crises | 6, 0, 0 |
| Homes for everyone at the start | 5, 0, 0 |
| National Vanguard instead | 4, 0, 0 |
| No province troubles | 2, 0, 0 |

No single change opens Hard or Ruthless, and its story isn't the cause. "No province troubles" making Normal worse is most likely the dice being reshuffled, which shows how far to trust these small differences.

### Checks

- `npx tsc -b`: clean.
- `npm run lint`: the five known warnings, seen after the last code change.
- `npm run build`: passes.
- `npm test`, run from `C:/`: **656 passed in 39 files, 241 seconds**, on the final code.
- **One earlier full run failed 2 tests**, with the same code: `a careful player > runs short of political power while following a law path` and `following one path > law path sustenance-relief leaves the country standing`. `tests/balance.test.ts` took 485 seconds in that run. Both passed alone, 2 of 2 in 18 seconds, and in the next full run. I suspect timeouts on a busy machine, as other work may have been running then, but **my output filter dropped the error text, so that is not confirmed**. It looks like the unexplained failure in the board's Watch list.

### Screenshots

In `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\shots\`. Measuring scripts are in `measure\` and `browser\` beside it. Normal is 1440x900, narrow is 1000x760.

All driven in headless Chrome from saves I built. Letters, staffing, service and tips were checked at both sizes. Crowds were seen at normal only.

### Could not verify

- A person playing any of this, and real timing at game speed beyond 1x.
- Touch screens, and browsers other than Chrome.
- A burden with something queued behind it on screen: the sign there is covered by a rendered test only.
- A demand, an ultimatum or a crisis letter in the browser: the sign on those is covered by rendered tests only.
- App's window-hold effects have no lasting test, as the tests have no DOM: items 1 and 3 were checked in the browser only.
- One run at the normal size saw the cost tip vanish within 9 seconds, cause not found. It did not recur in 2 more runs, and the first letters run timed out once waiting for the second letter, just after the dev server started, and did not recur in later runs. That cause wasn't found either.

### Left open, not touched

- **Two letters can show at once.** `App.tsx` lets an ultimatum show with a demand or a crisis, stacked. The sign counts correctly, but the one beneath is a real rough edge.
- **`.progress-bar` is unstyled in Laws, Research and Ventures too**, so those bars probably can't be seen. Found by search, not looked at.
- A burden letter plays no arrival sound, unlike the other letters.
- `tests/balance.test.ts` is unchanged; Hard's title still says "about a third".

**Manager's change at merge, item 6.** Land no longer beats the rule that pictures never overlap. A crowd takes the driest ground clear of buildings. Over water 14, 16, 20 of 44 and touching a building 0, 1, 6, with 2, 3, 6 buildings a place. The lasting test now holds that order. Screenshots: `6b-crowds-*.png` in the scratchpad's `shots` folder.
