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

### Question for the owner (stop condition)

**The ladder as a whole stays within 3 wins of 27, but Caldenreich has pulled away from the others, and I read that as the "one nation far easier" condition.** It now wins all 18 careful games on Normal (was 13), against Astravia 10 and Veldoria 5. The starting wood alone does this: with only the wood changed, Caldenreich wins 18 of 18. Veldoria still never wins on Ruthless, and wins 0 of 18 on Hard. That was already so.

Does the owner accept this spread? I did not retune anything. What I would try, in order, with none of it measured:

1. Accept it and watch real players, since these figures come from one scripted player.
2. Cut Caldenreich's +10 starting stability (`STARTING_STABILITY_BONUS`), since the wood is the owner's decision and should stay.
3. Lower the labour law quotas for Veldoria (see Left open), which also helps its weakness.

The work is committed so the owner can look at it, and it does not change the recorded ladder in `difficultyData.ts` or the ladder line in `TODO.md`.

### What changed

- `src/domain/nations/nationData.ts`, `types.ts`: each nation has `startingPopulation` and `startingFarms`.
- `src/application/startNewGame.ts`, `src/domain/neighbours/neighbourRules.ts`: both read those numbers, so a country is the same as player and as neighbour. Food is now 40 a person (`STARTING_FOOD_PER_PERSON`), which is the old 400,000 for 10,000 people.
- `src/domain/constants.ts`: `STARTING_WOOD_NO_FOREST = 27`, used where `landYield` gives no wood.
- `src/domain/housing/housingRules.ts`: `buildStartingHomes` rounds to the nearest home instead of up. Rounding up gave Astravia homes for all 12,000 on Normal, so no shortage at all. Caldenreich's homes are unchanged at every level.
- `tests/startingCountries.test.ts` (new); `tests/objectiveGuidance.test.ts` now sets the wood to 6 to reach the "Needs 1 more wood" line, as a farm no longer leaves a shortage.
- Text: no player text named a starting population, and the setup screen shows none, so neither changed. The comments that assumed 10,000 are updated.

### Numbers chosen

| | Astravia | Caldenreich | Veldoria |
|---|---|---|---|
| People | 12,000 | 10,000 | 8,000 |
| Provinces | 6 | 6 | 4 |
| People a province | 2,000 | 1,667 | 2,000 |
| Farms (food grown against eaten, outside winter) | 7 (1.11) | 5 (0.95) | 4 (0.95) |
| Factories | 2 | 2 | 2 |
| Jobs against workers, all working | 3,400 / 3,000 | 2,800 / 2,500 | 2,500 / 2,000 |
| Normal: homes for this share of the people | 7 homes, 88% | 6 homes, 90% | 5 homes, 94% |
| Easy: homes for this share of the people | 8 homes, 100% | 7 homes, 105% | 6 homes, 113% |
| Normal: days of food in a winter with no new farm | 92 | 75 | 75 |
| Wood | 15 | 27 | 27 |

The suggested populations stand. The land does not suggest otherwise: Veldoria has a third fewer provinces and a fifth fewer people, so it is no less crowded than Astravia. Factories stay at 2 for everyone: a third in Astravia would be 4,350 jobs for 3,000 workers, and one in Veldoria would leave people without work and no industry once it broke.

**Wood is 27**, exactly a farm (15) and one set of homes (12). I first set 31, thinking a farm stood broken at the start (see Left open): in fact both broken works are factories, mended with ore, so 27 pays in full. A test plays this through on every level: both finish, and the stores end empty.

### Measured: the opening (table from task 02)

Scripted through `simulateDay`, no other spending, never buying, seeds 1 to 3, days from the start. Before (all at 10,000 people): Astravia 11, 23, 34 to 37, 41 to 44. Caldenreich and Veldoria 11, 22, 33, homes not by day 120.

| Normal | First repair | Both repairs | Farm started | Homes started |
|---|---|---|---|---|
| Astravia | 10 | 19 | 29 | 35 to 39 |
| Caldenreich | 11 | 22 | 33 | 39 to 42 |
| Veldoria | 14 | 27 | 40 to 44 | 47 to 51 |

Hard and Ruthless are within a day or two of this. On Easy all three start the farm on the first day, and the homes on day 1 or 2. Veldoria's first step stays under task 02's 30 days. It is 3 days later than before, as fewer people pay less tax.

### Measured: the ladder

27 five-year games a level (9 seeds), wins per nation as Astravia, Caldenreich, Veldoria. The unchanged code reproduced the recorded ladder exactly before I changed anything.

| Recorded seeds | Recorded | Sloppy now | Careful now | By nation, before | By nation, now |
|---|---|---|---|---|---|
| Easy sloppy | 12 | 10 | | 6, 6, 0 | 4, 6, 0 |
| Easy careful | 27 | | 27 | 9, 9, 9 | 9, 9, 9 |
| Normal sloppy | 0 | 0 | | 0, 0, 0 | 0, 0, 0 |
| Normal careful | 15 | | 18 | 6, 7, 2 | 6, 9, 3 |
| Hard sloppy | 0 | 0 | | 0, 0, 0 | 0, 0, 0 |
| Hard careful | 7 | | 7 | 3, 4, 0 | 3, 4, 0 |
| Ruthless sloppy | 0 | 0 | | 0, 0, 0 | 0, 0, 0 |
| Ruthless careful | 3 | | 3 | 1, 2, 0 | 2, 1, 0 |

The largest move is 3 (Normal careful), at the limit but not over it. Nine other seeds (11 to 19), since one set can flatter:

| Seeds 11 to 19 | Before | Now | By nation, before | By nation, now |
|---|---|---|---|---|
| Easy sloppy | 12 | 11 | 6, 5, 1 | 5, 5, 1 |
| Easy careful | 26 | 27 | 9, 9, 8 | 9, 9, 9 |
| Normal careful | 14 | 15 | 8, 6, 0 | 4, 9, 2 |
| Hard careful | 9 | 9 | 6, 3, 0 | 2, 7, 0 |
| Ruthless careful | 2 | 4 | 2, 0, 0 | 3, 1, 0 |

(Sloppy wins nothing above Easy, before or after, on these seeds too.) Careful wins across all 18 seeds, as Astravia, Caldenreich, Veldoria:

| | Before | Wood only | Now |
|---|---|---|---|
| Normal | 14, 13, 2 | 14, 18, 5 | 10, 18, 5 |
| Hard | 9, 7, 0 | 9, 11, 1 | 5, 11, 0 |
| Ruthless | 3, 2, 0 | not run | 5, 2, 0 |

So the wood lifts Caldenreich and helps Veldoria on Normal, and the populations cost Astravia about 4 wins on Normal and Hard, even though its farm and homes come sooner. I did not trace why.

### Checks

- `npx tsc -b`: exit 0, no output.
- `npm run lint`: exit 0, the five known warnings and no others (`BuildingIcon.tsx:8`, `useGameClock.ts:53`, `ResourceIcon.tsx:5`, `App.tsx:333`, `Gauge.tsx:125`).
- `npm run build`: exit 0, "built in 786ms".
- `npm test`: "Test Files 34 passed (34), Tests 509 passed (509)". No intermittent failures in this one full run.
- Old saves: `tests/saves.test.ts` passes, and a new test checks that a loaded save keeps its own population.

### Could not verify

- I did not look in a browser. No screen changed, but the top bar now shows other starting figures.
- No real player has played these starts. All the balance figures come from the scripted players, who build none of the larger buildings and service nothing.
- The opening table and the 18-seed tables were made with temporary scripts, not committed. The committed balance test still only covers the 27 games in total.

### Left open (found, not changed)

- **Law quotas name fixed populations** (`QUOTAS` in `src/domain/laws/lawData.ts`): Labour needs 10,000 people for its first law and 10,500 for its second, and Order and Sustenance have rows at 11,500 to 14,000. Astravia meets the first few on day one. A careful Veldoria was at 9,458 to 9,505 people after three years on Normal, and at 10,522 to 10,657 after five, so its Labour laws stay shut for most of a game. Starting values were all that this task allowed me to change. I think this needs the owner's eye more than anything else here.
- **The wood is exact.** If the player mends a broken home (3 wood) before the market opens, the farm and homes run short, and a project short of materials falls behind day by day (seed 2: homes and farm still unfinished on day 120 without buying). Once the market opens, buying wood should clear it, which I did not measure. Any larger amount would go beyond what the owner asked.
- **`startingBroken`'s comment in `difficultyData.ts` is out of date**: it says "a factory, then a farm, then another farm", but since every country got a second factory, two broken works means both factories. So on Normal and above no country has any industry until the first repair.
- **`buildStartingHomes` also serves very old saves with no homes** (`gameSave.ts`). Rounding to nearest can give those one home fewer than before, at most a few percent of people.
- `gameSave.ts` still defaults a missing population to 10,000. That applies only to a save with no figure at all, so I left it.
