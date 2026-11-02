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
