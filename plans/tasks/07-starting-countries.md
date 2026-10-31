# 07: Countries that start differently

Branch: `task/07-starting-countries`. Read `CLAUDE.md` first. Owner's list item 4, and the owner's decision on starting wood.

## What to do

1. **Different populations.** Every nation starts with `STARTING_POPULATION = 10000` (`src/application/startNewGame.ts:37`). Give each nation its own number, kept with the nation's data. Start from Astravia 12,000, Caldenreich 10,000 and Veldoria 8,000, and say under Results if the land suggests otherwise. Veldoria has the least land for farms and is already the hardest for a sloppy player (TODO.md). Homes, starting food, farms and jobs must scale so each country starts in a comparable mess: read the comments around `STARTING_FOOD` in the same file, which assume 10,000. Check how the neighbours are created (`createNeighbours`), since each country also appears as a neighbour.
2. **Starting wood.** Caldenreich and Veldoria make no wood, and starting stock is 15 (`STARTING_RESOURCE_STOCK`), so after a farm they can't start homes until the market opens, even with money in hand. Give them enough to pay for a farm and one set of homes. Measure it: see the table in `plans/tasks/02-first-minute.md`. Tests for the objectives guidance may need updating.
3. **Text.** Update any line that names a starting population, and the setup screen if it shows one.

## Out of scope

Other starting values, difficulty settings, and building or food prices.

## Done when

- A test states that the three populations differ, and that those two nations can start homes after a farm without the market.
- All checks in `CLAUDE.md` pass, and old saves load.
- The 27-game difficulty ladder is measured for each nation, against the one in `difficultyData.ts`.
- `TODO.md` records what was measured.

## Stop and ask if

The ladder moves by more than 3 wins of 27 at any level, or one nation becomes far harder or easier than the others. Report the figures and what you would change. Do not retune the levels yourself.

## Results

