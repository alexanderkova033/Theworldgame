# TODO

A practical, near-term list. For bigger ideas, see [ROADMAP.md](ROADMAP.md).

## Before every change is committed

- `npx tsc -b` (types), `npm run lint` (five fast-refresh and hook-dependency warnings are old and known), `npm run build`.
- `npm test` runs the Vitest suite in `tests/`:
  - `saves.test.ts`: saves from older versions (any field missing, events without topics) load and play a month.
  - `vocabulary.test.ts`: one name for each thing (see `src/presentation/glossary.ts`).
  - `numbers.test.ts`: one way to write a number (see `src/presentation/formatNumber.ts`); no `toLocaleString` in the interface outside it.
  - `trees.test.ts`: the shape of the Laws and Research trees (one root per branch, three paths that never cross, forks at rows 4 and 5, no em dashes in player text).
  - `balance.test.ts`: scripted games. A careful player survives three years, wins the first election, wins outright within five years and comes close to losing at least once. It runs short of political power while following a law path and lives mostly on taxes and industry. An idle player is gone within two years, and following any single path doesn't wreck a country. The difficulty ladder: a sloppy player wins most games on Easy and few from Normal up, and a careful one wins on Hard but not every game on Ruthless.
  - `chapters.test.ts`: every locked system is out of reach in the rules, each chapter opens by its month with a briefing, and old saves load with everything open.
  - `checkpoints.test.ts`: checkpoints outlive a finished game but not a deleted slot, and retries shrink as the level rises.
  - `defeat.test.ts`: the defeat story ends where the game ended and names real causes.
- Balance changes: run the tests, and look at the numbers they report if a path starts to fail. The scripted player lives in `tests/support/carefulPlayer.ts`.
- UI changes: check the screen in a browser, at a normal window and at about 1000px wide.

## Known rough edges

- **Political power for researchers.** The daily rate was cut by a quarter, so a player following a law path now ends three years with 50 to 600. A player who only researches still banks 600 to 900, because research never spends it.
- **Income multipliers are still modest in Crowns.** Taxes and industry now pay a third more and market sales pay less, so daily income is most of a careful player's money (net about 24 Cr a day). Astravia still earns about 19k from selling grain over three years, next to 26k from income.
- **Old saves.** A law being drafted under the old tree layout still finishes even if it now sits on another path. Research directions that became unreachable are cleared on load.
- **Hints on the trees** only mark nodes that can be chosen right now; a path's name is marked if anything on it would help.
- **Small screens.** Below 1050px the tree details drop under the tree (picking a node scrolls to them); below about 700px the tree scrolls sideways.
- **Chapters are the same for every nation.** Nation-specific chapters (Veldoria meeting the streets first, say) would suit their stories better, but would need their own balance pass.
- **Objectives are only in the slip on the map.** Pointing at the province or tab an objective needs (a marker on the map) is not done.
- **TECHNICAL_DESIGN.md** may still describe the early MVP in places. README and GAME_DESIGN were brought up to date on 2026-10-16.

## Process reminders

- Domain rules live in `src/domain/<concept>/`, cross-domain use cases in `src/application/`, and React only in `src/presentation/`.
- Every tunable number goes in `src/domain/constants.ts`.
- New `GameState` fields need a default in `hydrateGameState` (`src/presentation/hooks/gameSave.ts`) so old saves load. `tests/saves.test.ts` fails if one is missing.
- Player-facing text: plain sentences, no em dashes.
