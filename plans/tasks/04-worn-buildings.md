# 04: A warning before a building breaks

Branch: `task/04-worn-buildings`. Read `CLAUDE.md` first. Runs alone, after tasks 01 to 03 are merged.

## Why

A playtester found repeated sudden breakdowns less interesting than the game's political choices: a repair notice arrives, and there was nothing to decide. The owner agreed on 2026-10-31 that a building should show wear first, and the player can pay to service it. The pressure of "A government always falling apart" stays. It becomes a choice about where to spend, made before the damage.

## What to do

1. **Worn comes first.** Today `rollBreakdowns` (`src/domain/maintenance/maintenanceRules.ts`) breaks a building the moment its roll fails. Instead, the failed roll marks it worn, and it keeps working for `WORN_WARNING_DAYS` (start at 30), then breaks as it does today. Use a separate optional field on `PlacedBuilding`, not a new `condition`: `isWorking` means `condition === undefined`, and a worn building is still working. Keep the chance of a roll as it is.
2. **Service.** While worn, the player may pay `SERVICE_COST_SHARE` of the build price (start at 0.1, against 0.25 for a repair), in money and the good, as a repair does. It clears the wear at once and takes the building out of service for no days. Follow `src/application/actions/repairBuilding.ts`.
3. **Riots are unchanged.** `rollRiotDamage` and the buildings broken at the start of a game skip the warning.
4. **Show it where repairs already live.** The Repairs list in Build lists worn buildings and their days left, with a Service button. The map marks a worn building in the same family as its broken mark. No new window or tab.
5. **Don't add noise.** A building turning worn logs one notice that folds with others (`src/presentation/eventKinds.ts`), and does not pause the game or send a letter. Task 03 just reduced interruptions, so don't undo that.
6. **Say so in the docs.** Update TODO.md's rough edges with what was measured.

Both numbers go in `src/domain/constants.ts`.

## Out of scope

Maintenance budgets, research changes, a change to breakdown chances, repair prices or the difficulty settings.

## Done when

- Tests cover: worn then broken after the warning, service clearing it, the service price, riots skipping it, and old saves loading.
- All checks in `CLAUDE.md` pass.
- **Balance is measured:** the 27-game difficulty ladder (sloppy and careful, all four levels), with the scripted players ignoring service, and again with the careful player servicing whenever it can pay. Report both against the ladder recorded in `difficultyData.ts`. Add a scripted-player option for servicing, off by default.
- Results include browser screenshots of the Repairs list and the map with a worn building, with their file paths, so the owner can judge the look.

## Stop and ask if

The ladder moves by more than 3 wins of 27 at any level, in either run. Report the figures and what you would change. Do not retune the levels yourself.

## Results

