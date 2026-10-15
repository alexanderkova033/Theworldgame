# TODO

A practical, near-term list. For bigger ideas, see [ROADMAP.md](ROADMAP.md).

## Before every change is committed

- `npx tsc -b` (types), `npm run lint` (five fast-refresh and hook-dependency warnings are old and known), `npm run build`.
- `npm test` runs the Vitest suite in `tests/`:
  - `trees.test.ts`: the shape of the Laws and Research trees (one root per branch, three paths that never cross, forks at rows 4 and 5, no em dashes in player text).
  - `balance.test.ts`: scripted three-year games. A careful player survives and wins the first election in every nation, an idle one is gone within two years, and following any single path doesn't wreck a country.
- Balance changes: run the tests, and look at the numbers they report if a path starts to fail. The scripted player lives in `tests/support/carefulPlayer.ts`.
- UI changes: check the screen in a browser, at a normal window and at about 1000px wide.

## Known rough edges

- **Political power for researchers.** The daily rate was cut by a quarter, so a player following a law path now ends three years with 50 to 600. A player who only researches still banks 600 to 900, because research never spends it.
- **Income multipliers are still modest in Crowns.** Taxes and industry now pay a third more and market sales pay less, so daily income is most of a careful player's money (net about 24 Cr a day). Astravia still earns about 19k from selling grain over three years, next to 26k from income.
- **Labour laws past row III need factories** (industry 4, then 8). That's on purpose, but a player who never builds factories sees the whole branch stall without being told why beyond "Needs industry".
- **Old saves.** A law being drafted under the old tree layout still finishes even if it now sits on another path. Research directions that became unreachable are cleared on load.
- **Hints on the trees** only mark nodes that can be chosen right now; a path's name is marked if anything on it would help.
- **Small screens.** Below about 1150px the details pane drops under the tree; below about 700px the tree scrolls sideways.
- **README and GAME_DESIGN.md are out of date** in places (they still describe the early MVP: roads, no laws, no research areas).

## Process reminders

- Domain rules live in `src/domain/<concept>/`, cross-domain use cases in `src/application/`, and React only in `src/presentation/`.
- Every tunable number goes in `src/domain/constants.ts`.
- New `GameState` fields need a default in `hydrateGameState` (`src/presentation/hooks/gameSave.ts`) so old saves load.
- Player-facing text: plain sentences, no em dashes.
