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
