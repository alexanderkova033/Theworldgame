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

