# Task 12: leftovers in advice, warnings and trading

Follow-ups recorded in `plans/board.md`. First check that each is still true in the current code: if one is already fixed, say so under Results and move on.

## Do

1. "lasts 1 days" and "Runs out in 1 days" have a wrong plural. Find every such message in player text, not only these two.
2. "Population 12k / 12k" can show while a law is still locked (at 11,960, say), because of the number format. A locked requirement must not read as met.
3. A stalled project's button always goes to Build, even when a good is short. The event should carry the cause, and the button should go where the cause is fixed.
4. The tip in `ProjectsPanel.tsx` can blame money when an earlier project took the last of a good. It should name the real cause.
5. `getForecasts` leaves island flocks out, so food forecasts are too gloomy with a grazing island. Count them. The forecast must agree with what the day actually produces, and a test should show that.
6. The repair step in Objectives stays lit with "Go" for the 10 days after both repairs are paid, which holds back the farm step's guidance. Once the repairs are paid, the step should say they are under way and let the next step's guidance show.
7. The first-day wait reads 8 days, then 10 the next day: income shows +44 a day on Jan 1 and +29 from Jan 2. Trace it. If the first figure is simply wrong, make the estimate honest. If the fix would change what a game actually earns, stop and report instead.
8. The school, Thornwick farm and harbour steps in Objectives have no guidance. Add it in the style of `getObjectiveGuidance.ts`.
9. Nothing tells a player what a coal order costs in a year. Show the expected yearly cost in a tip on the order.
10. Nothing tells a player that a coal order with a low price limit will fall short by winter. Add a plain warning on the order when that is likely.
11. The 500 Cr reserve on market orders can be seen but not set. Let the player set it, in the same place, with the existing step buttons. It needs a default in `hydrateGameState`, and the default stays `MARKET_ORDER_RESERVE`.
12. Coal order figures from task 10 were measured before the 5 to 1 heating landed. Rerun them, and report the numbers under Results. Do not commit the measuring script.

## Do not

- Change the rules of play, any balance number or `tests/balance.test.ts` bounds. The ladder recorded in `src/domain/difficulty/difficultyData.ts` must stay exactly as it is.
- Add a window, a tab or a new visual style.
- Touch People, Repairs, the map, `App.tsx` window handling or `tests/support/carefulPlayer.ts`: task 13 is working there.

## Stop and ask

If any item would move the ladder, leave that item undone, write why under Results, and finish the rest.

## Checks

`npx tsc -b`, `npm run lint` (five known warnings), `npm run build`, `npm test`. For interface changes, look at the screen in a browser at a normal window and at about 1000px wide, and give the screenshot paths. Put them in the scratchpad, not the repo. Say plainly what you could not see.

## Results

All twelve items were still true in the code, so none was already fixed. Items 1 and 7 are done in part, as set out below; the rest are done. No rule of play, balance number or `tests/balance.test.ts` bound changed.

**1. Plurals: done, except where task 13 is working.** `counted(n, word)` in `src/domain/plural.ts` is now used for counted days, months, projects, buildings, seats and points across the messages and tips. A test in `tests/adviceAndOrders.test.ts` fails on any hand-written count of days or months. "lasts 1 days" sits in People, which this task says not to touch, but the item names it, so that one line changed. Left alone under "do not touch", and exempted in that test by file name until task 13 is merged:
- `PeoplePanel.tsx`: "fuel for 3 of N days", "Lasts N days" (coal and firewood), "winter in N days", "N days of eating".
- `RepairsPanel.tsx`: "N days until it's back in service", "the wear is gone in N days", "breaks down in N days", "take N days".
- `MapArmies.tsx`: "Siege 1 of N days".

Story wording: `src/application/stories/astravia.ts` has no change. `src/presentation/storyText.ts` has one wrong plural fixed, `${days} days` to `counted(days, "day")`, which only differs for a span of 1 day, plus its import. Its "N months" line is untouched, as it already takes the singular out.

**2. Requirement: done.** `formatRequirement` shows "Population 11,960 / 12,000" where rounding would make one not yet met read as met, and rounds the figure held down. The bar now rounds down too, so it can't look full early. Stability at 49.6 of 50 reads 49 / 50.

**3. Stall button: done.** The event carries `stalledFor`: money goes to Budget, a good to Market ("Buy wood"), money first when both are short. With the Market shut it stays on Build, as there is nowhere to buy. Events from old saves also go to Build. Beyond the event, the advisor's "Stalled" chip goes to the cause in the same way and its tip names it.

**4. Ring tip: done.** `getProjectShortages` replaces the old preview, following the same running balance as the day, so it names the real cause: "stalled for want of wood, as earlier projects are paid first". A stalled project that can pay again tomorrow says so and its ring reads "resumes", instead of blaming money.

**5. Forecast: done.** `getForecasts` counts the flocks. It also had the season a day late: the day being counted is the one starting on today's date, so the last day of autumn was counted at winter's harvest. That is fixed too, as the forecast has to agree with the day. A test plays the days out with a grazing island and the forecast's run-out day is within 1 of the real one at about 3, 10 and 25 days of food. The tolerance is there because people change as the days pass.

**6. Repair step: done.** Once every repair is paid the step reads "Under way. Back in service in 10 days.", in plain ink rather than the red of a problem, and the farm step is lit with its Go or its guidance. With one repair paid and another still broken, nothing changes.

**7. First-day wait: estimate made honest; the cause is reported and left in place.**
- Cause: a new game's `stats.industry` is 6 (2 factories at 3), whatever is broken or unstaffed. The money step pays on that figure, then the same day replaces it with what staffed factories make. So day 1 really does pay that much: the income figure on Jan 1 is true for Jan 1, and wrong as a rate.
- Traced, today's pay then every later day's, Cr. Caldenreich on Normal 43.5 then 28.5, Astravia 49.2 then 34.2, Veldoria 37.8 then 22.8. On Easy, where the factories work, Astravia 49.2 then 41.0, Caldenreich 43.5 then 36.0, Veldoria 37.8 then 32.3.
- Fix: `getDaysToSave` takes the first day apart from the days after (`netTreasuryFromTomorrow`). A wait of 325 Cr from nothing on Normal now reads 11 days then 10 in Caldenreich (was 8 then 10), 10 in Astravia (was 7) and 14 in Veldoria (was 9). A test checks it counts down one a day and is reached on the day it said, in all three nations. What a game earns is unchanged, and a test holds that.
- Not done, as it would change what a game earns: correcting the starting `stats.industry`, which would take up to 15 Cr off day 1 at every level. So the top bar still shows the higher rate on Jan 1 only, and the treasury run-out forecast still starts from it. That one is for the manager or the owner.

**8. Guidance: done.** School, the farm in Thornwick and the harbour on the Marrow Coast, in the same style as the others. Each looks only where its step counts, and says nothing while the building is shut or there is no room. `getObjectiveGuidance.ts` keeps its own copy of the two province lists, as the story file is not to change. A test checks them against the story's own checks, province by province.

**9. Yearly cost: done.** The coal order's tip adds "Over the next year it should cost about N Cr, at today's prices and with today's homes", or "it should buy nothing". `getCoalOrderOutlook` walks the next 360 days by the same rules as the day, rolls no dice, and holds the market's outlook still. Against played games, the same careful Normal games as under item 12's accuracy check:

| Looked on | Games buying | Said, mean Cr | Real, mean Cr | Median miss, Cr | Within 25% |
|---|---|---|---|---|---|
| 1 Mar, year 2 | 28 | 2,582 | 2,574 | 292 | 17 |
| 1 Sep, year 2 | 29 | 2,642 | 2,694 | 497 | 15 |

So it is right on average and only "about" for one game.

**10. Winter warning: done.** A line under the order, in the tight colour: "This order reaches about 30 coal by winter, which burns 87. Raise the price limit." It names the price limit, the stock limit or the treasury, whichever held it back most. Its tip says whether homes go cold or the rest burns wood. Against whether the coal really ran out that winter, in careful Normal games:

| Looked on | Games | Warned, ran out | Warned, fine | Quiet, ran out | Quiet, fine |
|---|---|---|---|---|---|
| 1 Mar, year 2 | 72 | 8 | 2 | 1 | 61 |
| 1 Sep, year 2 | 70 | 8 | 0 | 0 | 62 |

It warns when coal runs out even if wood covers the rest, which is a choice: of the 8 cases in September, 7 went no colder than burning wood (Astravia's 6 and one of Veldoria's 2). Say if it should warn only of cold homes.

**11. Reserve: done.** `marketOrderReserve` in `GameState`, default `MARKET_ORDER_RESERVE` in `startNewGame` and `hydrateGameState`, set with the existing step buttons in the line over the board. Each click moves it `MARKET_ORDER_RESERVE_STEP` (100 Cr, a new constant). The line only shows once an order has been set, as before.

**12. Coal order figures, rerun under 5 to 1 heating.** The script stayed in the scratchpad and is not committed. Task 10 ran on one seed it didn't record, and countries have since started with more coal, so its figures compare only roughly.

Coal on Dec 1 of years 1, 2, 3, stock limit 150, careful, Easy, seed 1:

| Buy below (of base) | Astravia | Caldenreich | Veldoria |
|---|---|---|---|
| no order | 140, 41, 2 | 315, 510, 728 | 97, 21, 5 |
| 1.0 | 145, 46, 107 | 315, 510, 728 | 97, 21, 5 |
| 1.15 | 150, 126, 150 | 325, 520, 738 | 147, 136, 60 |
| 1.3 | 150, 151, 152 | 335, 530, 748 | 152, 151, 155 |
| 1.5 | 150, 151, 152 | 345, 540, 758 | 152, 151, 155 |

Careful, Normal, 6 seeds, five years, stock limit 150. Spent is per full year after the first; days without coal are per winter, as a mean; both to the nearest whole number. 6 seeds is few, so read the wins loosely:

| Nation, buy below | Wins of 6 | Spent a year, mean (range) | Coal Dec 1 year 2, mean | Winter days without coal |
|---|---|---|---|---|
| Astravia, no order | 4 | 0 | 40 | 18 |
| Astravia, 1.0 | 5 | 1,382 (0 to 3,413) | 109 | 11 |
| Astravia, 1.15 | 4 | 2,202 (0 to 4,938) | 129 | 5 |
| Astravia, 1.3 | 3 | 3,827 (3,455 to 4,380) | 152 | 0 |
| Astravia, 1.5 | 3 | 4,095 (2,883 to 5,110) | 152 | 0 |
| Caldenreich, no order | 6 | 0 | 492 | 0 |
| Caldenreich, 1.0 | 6 | 0 | 498 | 0 |
| Caldenreich, 1.15 | 6 | 0 | 496 | 0 |
| Caldenreich, 1.3 | 6 | about 0 | 497 | 0 |
| Caldenreich, 1.5 | 5 | 0 | 517 | 0 |
| Veldoria, no order | 3 | 0 | 27 | 6 |
| Veldoria, 1.0 | 0 | 0 | 76 | 7 |
| Veldoria, 1.15 | 2 | 788 (0 to 2,019) | 105 | 5 |
| Veldoria, 1.3 | 1 | 2,361 (679 to 4,652) | 125 | 0 |
| Veldoria, 1.5 | 1 | 2,809 (1,666 to 3,357) | 145 | 0 |

Caldenreich at 1.3 shows a mean of -10 and a low of -176 in the raw output. Spending can't be negative, so that is my script's tally crossing a year in the same month, not the game. The accuracy checks under items 9 and 10 used 9 seeds and limits 1.0 to 1.5, on Normal, keeping only games that lasted the 360 days. In the script's own game the wins fall, as buying coal costs money and it never lets an order go; a person would.

**Also found, left alone.**
- The bar under the quota line in the Laws inspector isn't visible in the screenshots, at 99% or otherwise. I didn't look into why.
- A coal sell order on the same good isn't counted in the outlook, except that crossed orders give no outlook at all. Wood spent on building isn't counted either.
- Full-suite runs on this branch timed out at 30 seconds while other sessions were using the machine: `tests/balance.test.ts` (different tests each run) and `tests/defeat.test.ts`, all "Test timed out in 30000ms". With the machine quiet and a long limit, all 53 balance tests passed in 214 seconds, the longest being the ladder's Easy at 54 seconds (the ladder has its own limit of 180 seconds). The first of the failed runs wasn't saved, so its balance and defeat errors weren't read in full, only the counts and the defeat test's title. The 30-second limit on those tests can fail when the machine is shared.

**Checks.**
- `npx tsc -b`: exit 0.
- `npm run lint`: the five known warnings (Gauge, BuildingIcon, ResourceIcon fast refresh; useGameClock and App hook dependencies), nothing new.
- `npm run build`: built in 723ms.
- `npm test`: 40 files passed, 690 tests passed, in 214 seconds, machine quiet, no extended time limit. This is the run on the code as committed, apart from wording in `TODO.md` and this file.
- Ladder, counted on this branch with the same games as `tests/balance.test.ts` (scratch script): Easy 14 and 27, Normal 0 and 19, Hard 0 and 8, Ruthless 0 and 1, exactly as recorded in `difficultyData.ts`. `difficultyData.ts`, `tests/balance.test.ts` and `carefulPlayer.ts` have no changes. I did not repeat task 10's full game-by-game hash comparison.
- Earlier runs of `npm test` on this branch: 688 passed once, then 3 failed and 2 failed, and a run of the balance and defeat files alone had 3 failed. The failures whose errors I saved were all 30-second timeouts; other sessions' test runs were on the machine for at least some of these. See "Also found".

**Screenshots** (headless Chrome), all opened and looked at unless marked, in C:/Users/lorta/AppData/Local/Temp/claude/c--Users-lorta-Documents-repos-Theworldgame/e368a804-c798-48e1-adaa-e1b647feed00/scratchpad/t12/shots/:
- market-short-1400.png and market-short-1000.png: coal order, warning, reserve buttons. The + click moved the reserve from 500 to 600. No sideways scroll at 1000px (scrollWidth 1000). The 1400 file on disk is a later retake of the view I opened, not itself opened.
- objectives-underway-1400.png, objectives-underway-1000.png.
- law-quota-1400.png, law-quota-1000.png.
- rings-1000.png; rings-1400.png was opened in an earlier take and retaken after.
- log-stall-1400.png: "Buy wood" in the Event Log, opened in an earlier take and retaken after.
- guidance-harbour-1400.png, guidance-school-1000.png, guidance-school-thornwick-1000.png. Not opened: guidance-school-1400.png, guidance-school-thornwick-1400.png.

**Could not verify.**
- Tips were read from their attributes, not watched appearing on rest.
- The stall event in the Event Log was placed in a save by hand; a stall arising in play is covered by tests only. No pop-up notice was watched, and Budget and Market as destinations were not clicked in a browser.
- "1 day" forms were checked in tests, not seen on screen.
- Screens were looked at in Astravia only, and not at phone width.
- The coal figures come from the scripted player, which never changes an order. No real player has tried any of this.

**Manager's change at merge.** The coal warning now gives its advice only when homes would go cold. When wood covers the rest, it says "The rest would burn wood.", since careful games won less at high price limits. The plural exemption in `tests/adviceAndOrders.test.ts` is gone, and the three files it named are fixed.
