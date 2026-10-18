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
  - `reign.test.ts`: the Long Reign's rising line and burdens; a careful player outlasts Three Terms but is always voted out within twenty years, sooner on Hard.
- Balance changes: run the tests, and look at the numbers they report if a path starts to fail. The scripted player lives in `tests/support/carefulPlayer.ts`.
- UI changes: check the screen in a browser, at a normal window and at about 1000px wide.

## Known rough edges

- **Political power for researchers.** A player following a law path ends three years with 50 to 600. One who only researches banks 94 to 886 (about 465 on average, measured 2026-10-17), because research never spends it; the scripted player follows one tree only, so a real player would spend it on laws or rallies. Spending it to speed research would mostly empty the tree sooner: a single research path is finished inside those three years.
- **Income multipliers are still modest in Crowns.** Taxes and industry now pay a third more and market sales pay less, so daily income is most of a careful player's money (net about 24 Cr a day). Astravia still earns about 19k from selling grain over three years, next to 26k from income.
- **Old saves.** A law being drafted under the old tree layout still finishes even if it now sits on another path. Research directions that became unreachable are cleared on load.
- **Hints on the trees** only mark nodes that can be chosen right now; a path's name is marked if anything on it would help.
- **Small screens.** Below 1050px the tree details drop under the tree (picking a node scrolls to them); below about 700px the tree scrolls sideways.
- **Chapters are the same for every nation.** Nation-specific chapters (Veldoria meeting the streets first, say) would suit their stories better, but would need their own balance pass.
- **Long Reign burdens are drawn at random.** The scripted player takes the first one offered, so the tests measure an average reign, not a player choosing well.
- **TECHNICAL_DESIGN.md** may still describe the early MVP in places. README and GAME_DESIGN were brought up to date on 2026-10-16.

## Uprisings

- **Borders don't redraw.** A province that broke away is drawn as free land, but the national frontier band is precomputed from the nations' fixed provinces (src/presentation/nationFrontiers.ts), so it still runs around it. Worth fixing when borders can change for other reasons (step 4 or 5 of the roadmap).
- **A lost coast still counts as a port.** `nationHasPort` reads the nation's fixed provinces, so losing its only coastal province keeps the cheaper market. Rare; fix with the frontier.
- **A lost province can't be won back yet.** Retaking it belongs to the military (roadmap step 5).
- **Scripted players never lose a province.** Even the sloppy one sends militia within two months, long before a month at full strength. The tests cover breaking away directly (tests/breakaway.test.ts), not through a played game.

## Process reminders

- Domain rules live in `src/domain/<concept>/`, cross-domain use cases in `src/application/`, and React only in `src/presentation/`.
- Every tunable number goes in `src/domain/constants.ts`.
- New `GameState` fields need a default in `hydrateGameState` (`src/presentation/hooks/gameSave.ts`) so old saves load. `tests/saves.test.ts` fails if one is missing.
- Player-facing text: plain sentences, no em dashes.
