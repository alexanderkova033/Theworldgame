# 07b: Law requirements that fit the country, and Caldenreich's lead

Branch: `task/07b-nation-balance`. Read `CLAUDE.md` first, and Results in `plans/tasks/07-starting-countries.md`. Runs alone.

## Why

Countries now start with different populations, but the law requirements in `QUOTAS` (`src/domain/laws/lawData.ts`) name fixed populations from 10,000 to 14,000. Astravia meets the first Labour laws on day one, and Veldoria's stay shut for most of a game. Separately, Caldenreich now wins all 18 careful games on Normal.

## What the owner decided (2026-11-01)

1. Population requirements scale with each country's starting size.
2. Caldenreich's starting stability bonus drops from +10 to +5, only if it is still winning nearly everything after the first change. In this task, "nearly everything" means 16 or more of 18 careful games on Normal.

## What to do

1. **Scale the requirements.** A law's population requirement becomes its listed threshold times the nation's `startingPopulation`, divided by 10,000, in one function that everything reads. Check `lawsRules.ts` (the status and `getQuotaProgress`), the Laws window, the tree hints and the scripted player. Only `population` requirements change. The text shown to the player must give the scaled number. Old saves use their own nation's figure.
2. **Measure** careful wins by nation over all 18 seeds (ladder seeds and 11 to 19) on Normal, Hard and Ruthless, against the table in task 07's Results. Normal, Astravia, Caldenreich, Veldoria was 10, 18, 5.
3. **Caldenreich.** If it wins 16 or more of 18 on Normal, set `caldenreich: 5` in `STARTING_STABILITY_BONUS` (`src/application/startNewGame.ts`) and measure again. Keep the neighbour in step (`createNeighbour` in `neighbourRules.ts` has its own 70 against 60). Otherwise leave it, and say so.
4. **Record the result.** Update the ladder in the comment in `difficultyData.ts` and the `balance.test.ts` line and rough edges in `TODO.md`. Check each level's `summary` still tells the truth: Normal says a careful player wins about half the time, and Hard about one game in four. Report any that no longer fit. Do not rewrite them or retune levels.
5. **Caldenreich's opening view.** Playing Caldenreich, Astravia's name at sea is cut off at the bottom by about 30px, and there is empty sea at the top. Move that nation's opening view so every name is in view at 1440x900 and 1000x760, with its own land still fully shown. See `tests/nationSeaNames.test.ts`. If that isn't possible at both sizes, get as close as you can and report it.

## Out of scope

Difficulty settings, starting populations, wood, law prices, and other nations' bonuses.

## Done when

- Tests cover: the scaled requirement for each nation, the status and progress reading it, and old saves.
- All checks in `CLAUDE.md` pass.
- Results report the by-nation tables and the 27-game ladder.

## Stop and ask if

The ladder moves by more than 3 wins of 27 at any level against the task 07 figures (Easy 10 and 27, Normal 0 and 18, Hard 0 and 7, Ruthless 0 and 3), or a nation can't win any careful game on Normal.

## Results

