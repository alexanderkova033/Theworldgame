# 09b: Veldoria's extra coal

Branch: `task/09b-veldoria-coal`. Read `CLAUDE.md` first, and Results in `plans/tasks/09-heating.md`. Runs alone, after task 08b is merged.

## What the owner decided (2026-11-01)

Veldoria starts with 60 extra coal. It digs none, and since wood burns five times worse it goes cold in 8 of 16 second winters and 7 of 9 third winters when played carefully on Normal.

## What to do

1. Add `veldoria: 60` to `STARTING_EXTRA_COAL` in `src/domain/constants.ts`, and update any test that says Astravia alone gets extra coal.
2. Add it to Veldoria's `startingBonus` in `src/domain/nations/nationData.ts`, as Astravia's already says: "+15% industry output, and more coal."
3. Measure, against the figures at the start of this task:
   - The 27-game ladder by nation, as Astravia, Caldenreich, Veldoria, on the ladder seeds and on seeds 11 to 19.
   - Veldoria's first, second and third winters, careful, at each level: games cold, median and worst cold days, wood burned, coal bought and what it cost.
   - Whether the autumn warning still shows for Veldoria in its first autumn.
4. Update the ladder in `src/domain/difficulty/difficultyData.ts` and the `balance.test.ts` line and rough edges in `TODO.md`, if the figures moved and are within the limits. Check each level's `summary` still holds, and report if not. Do not rewrite them.

## Out of scope

Astravia's coal, the heat shares, levels and prices.

## Done when

- A test states each nation's starting coal.
- All checks in `CLAUDE.md` pass.
- Results report the figures above.

## Stop and ask if

The ladder moves by more than 3 wins of 27 at any level, or Hard falls below what `balance.test.ts` allows. Do not change that bound.

## Results

