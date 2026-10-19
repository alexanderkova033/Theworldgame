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

## Islands: notes for the next phase

- **The peopled islands are the prize.** Measured 2026-10-19 over five years: settling only the three empty islands leaves a careful player about 3,800 Cr poorer and 4% bigger; settling all six (buying land where it can) leaves it about 8,500 Cr richer and 28% bigger. Buying Kestrel's land pays back in a little over two years. Empty islands are the slow, cheap option. That makes the peopled islands what a neighbour should race for in phase E.
- **The scripted player settles only with `settle: true`** (tests/support/carefulPlayer.ts), so the balance tests measure a country that never settles. Phase E (the race) will want it on in its own tests, to see how often a neighbour beats a careful player to an island.
- **Distance and living alongside don't stack into trouble.** Measured 2026-10-19 with colony distance in (8, or 4 linked): careful players who settle everything saw no island riots in 9 five-year games; sloppy ones 12 riot-days in all, no uprisings, no islands lost. Sloppy players who settle win 5 of 9 against 2 of 9 without: colonies help a struggling country too.
- **Settled islands use the province systems unchanged** (homes, jobs, unrest, uprisings, breaking away), except commuting, which stops at the shore, and migration, which crosses only between harbours. Phase D only needs to tune them (distance), not build them.
- **Locals are data only so far** (domain/islands/islandData.ts): a name and a number on three islands. Phase C decides what settling among them means, through the letter system (domain/uprising/demandRules.ts is the pattern).

## The race: what step 4 needs from the neighbours

- **The neighbours now choose their own voyages** (step 4, phase A): their computer rulers sail when they can spare the price and their temper wants it, rolling their own dice (domain/neighbours/neighbourRules.ts, neighbourDice), never the game's, so the balance games don't wobble (a shared random roll once flipped a Hard game). An island they take joins their country (its people, and homes), but its trait does nothing for them yet.
- **Measured 2026-10-19 with the computer rulers choosing:** over five years, a careful player who never settles loses 4.7 islands to them (Astravia, as a neighbour, takes the most); one who settles holds 5.1 and loses 0.9. Difficulty win counts are unchanged.
- **There is no way to take a claimed island back** (or to buy, trade or contest it). That is step 4 (treaties, trade) and step 5 (the military).
- **Measured 2026-10-19 over five years:** a careful player who never settles loses 4 islands to the neighbours; one who settles holds about 5.4 and loses about 0.6, ending about 10,000 Cr richer and 24% bigger than one who doesn't.

## Relations: notes for trade and treaties

- **Relations are a mood, not a grudge.** Measured 2026-10-19: careful players who settle and win races end five years at neutral with both neighbours, because the -15 for a lost race fades within about 15 months. Trade (phase C) and treaties (phase D) are the natural things to gate on relations, and to move them upward; today almost nothing raises them except backing a neighbour's rulers.
- **The scripted player never presses elections**, so the balance games never see a warm or hostile neighbour. It declines every trade offer unless given `trade: true` (tests/support/carefulPlayer.ts).
- **Trade is modest.** Measured 2026-10-19: about 4.7 offers in five years; a scripted trader takes 1.6 of them. Buy offers need the good in your store, and a careful player keeps very little ore, wood or coal, so most offers are food. Real players with fuller stores will see more. If trade should matter more, the neighbours need goods of their own to sell (their economy has only food and Crowns today).

## Process reminders

- Domain rules live in `src/domain/<concept>/`, cross-domain use cases in `src/application/`, and React only in `src/presentation/`.
- Every tunable number goes in `src/domain/constants.ts`.
- New `GameState` fields need a default in `hydrateGameState` (`src/presentation/hooks/gameSave.ts`) so old saves load. `tests/saves.test.ts` fails if one is missing.
- Player-facing text: plain sentences, no em dashes.
