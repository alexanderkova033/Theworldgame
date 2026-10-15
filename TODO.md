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

- **Political power piles up.** A careful player banks around 1,000 over three years. Law costs were raised, but rallies and pushes on neighbours are still cheap next to the income. It needs a sink or a lower daily rate.
- **Income multipliers are small in Crowns.** Daily income is around 25 Cr, so "+10% income" is about 2.5 Cr a day. Paths built on income rely on one-time payments to compete; raising the base income would make them read better.
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
