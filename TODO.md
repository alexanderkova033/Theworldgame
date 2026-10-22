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
- **Long Reign burdens are drawn at random, and chosen well.** The careful scripted player takes the burden that hurts it least (money and goods before support; `BURDEN_PREFERENCE` in tests/support/carefulPlayer.ts), the sloppy one the first offered. Measured 2026-10-20, one seed, three nations: choosing lasts 14.6 years on Normal and 9.6 on Hard, against 12.1 and 6.1 taking the first. Every reign still ends inside twenty years.
- **TECHNICAL_DESIGN.md** may still describe the early MVP in places. README and GAME_DESIGN were brought up to date on 2026-10-16.

## Uprisings

- **Borders and ports follow the land held** (step 6, phase A): the frontier and the nation's name are worked out from the provinces held today (`nationShapes` in src/presentation/nationFrontiers.ts, one set per list of lost provinces), and `holdsPort` (domain/market/marketRules.ts) asks whether a mainland coast is still held. Only the player's provinces can be lost, so the neighbours' frontiers never move. A settled island's coast doesn't make a port: it trades through its harbour.
- **One place for each thing** (step 6, phase C, 2026-10-20). Cut: the Budget, Support and Unrest tabs' badges (each repeated the top bar), support on the nation's label (the star has it; the label now says what the election needs and when), and the Legend "!". Looked at and left, each for a reason:
  - Food, people and homes, heating, the treasury and support each appear in the top bar and again at the head of their window (People's cards, the budget, the chamber). That is the figure and its detail, not a repeat.
  - A province's state (homes full, jobless) shows on the map, on Build's province picker and in People's province table: the map to see, the picker to choose where to build, the table to compare.
  - The advisor row's "Research idle: 4" and the "!" on each idle Research branch: the row says how many, the tabs say which.
  - Losing support shows three ways: the star's "!", the red nation label and the Support tab's "!". Each is small; if it still feels loud, the red label is the one to drop.
  - Badges kept, as nothing else shows them: Build's "N underway", Research's progress per branch, Laws' drafting, Reports' unread count.
  - The nation's label must stay short: at iPad width (landscape) the seven tabs fit with about 30 px to spare, and a longer label pushes Reports onto a second row.
- **A lost province can't be won back yet.** Retaking it belongs to the military (roadmap step 5).
- **A neglectful scripted player loses provinces** (`neglect: true`: no militia, the rebels' terms refused). Measured 2026-10-20 over nine games: a sloppy one loses 11 provinces in its two-odd years and, with `army: true`, wins 9 back; a careful one never lets an uprising grow, neglect or not. tests/army.test.ts plays one such game.

## Islands: notes for the next phase

- **The peopled islands are the prize.** Measured 2026-10-19 over five years: settling only the three empty islands leaves a careful player about 3,800 Cr poorer and 4% bigger; settling all six (buying land where it can) leaves it about 8,500 Cr richer and 28% bigger. Buying Kestrel's land pays back in a little over two years. Empty islands are the slow, cheap option. That makes the peopled islands what a neighbour should race for in phase E.
- **The scripted player settles only with `settle: true`** (tests/support/carefulPlayer.ts), so the balance tests measure a country that never settles. Phase E (the race) will want it on in its own tests, to see how often a neighbour beats a careful player to an island.
- **Distance and living alongside don't stack into trouble.** Measured 2026-10-19 with colony distance in (8, or 4 linked): careful players who settle everything saw no island riots in 9 five-year games; sloppy ones 12 riot-days in all, no uprisings, no islands lost. Sloppy players who settle win 5 of 9 against 2 of 9 without: colonies help a struggling country too.
- **Settled islands use the province systems unchanged** (homes, jobs, unrest, uprisings, breaking away), except commuting, which stops at the shore, and migration, which crosses only between harbours. Phase D only needs to tune them (distance), not build them.
- **Locals are data only so far** (domain/islands/islandData.ts): a name and a number on three islands. Phase C decides what settling among them means, through the letter system (domain/uprising/demandRules.ts is the pattern).

## The race: what step 4 needs from the neighbours

- **The neighbours now choose their own voyages** (step 4, phase A): their computer rulers sail when they can spare the price and their temper wants it, rolling their own dice (domain/neighbours/neighbourRules.ts, neighbourDice), never the game's, so the balance games don't wobble (a shared random roll once flipped a Hard game). An island they take joins their country (its people, and homes), but its trait does nothing for them yet.
- **Measured 2026-10-19 with the computer rulers choosing:** over five years, a careful player who never settles loses 4.7 islands to them (Astravia, as a neighbour, takes the most); one who settles holds 5.1 and loses 0.9. Difficulty win counts are unchanged.
- **A claimed island can only be bought back** (step 4, treaties), never taken. Taking one is step 5 (the military).
- **Measured 2026-10-19 over five years:** a careful player who never settles loses 4 islands to the neighbours; one who settles holds about 5.4 and loses about 0.6, ending about 10,000 Cr richer and 24% bigger than one who doesn't.

## Relations: notes for trade and treaties

- **Relations are a mood, not a grudge.** Measured 2026-10-19: careful players who settle and win races end five years at neutral with both neighbours, because the -15 for a lost race fades within about 15 months. Trade (phase C) and treaties (phase D) are the natural things to gate on relations, and to move them upward; today almost nothing raises them except backing a neighbour's rulers.
- **The scripted player presses elections only with `treaties: true`**, and then only to warm a neighbour that holds an island; otherwise the balance games never see a warm or hostile neighbour. It declines every trade offer unless given `trade: true` (tests/support/carefulPlayer.ts).
- **Trade has goods now** (step 6, phase E). The neighbours' land fills their stores (wood from forests, ore and coal from hills; Veldoria's plains give it none), and they offer what you hold less than a lot of. Each wants the good its land lacks (Astravia coal, Caldenreich wood, Veldoria ore) and never sells it. Letters come at 10% a month per neighbour, down from 15%, so as not to crowd the player. Measured 2026-10-20 over nine five-year games: about 10 letters a game (was 4.7), most of them wood, coal or ore for sale, and Veldoria asking for ore.
- **Losing an island stings** (step 6, phase E). A neighbour won't sell an island within a year of taking it (`foreignIslandsSince`, BUY_BACK_HELD_DAYS), and the price doubled to 6,000 Cr and 4 a person. Measured 2026-10-20 over nine five-year games with a scripted player that trades, signs accords and backs the rulers of a neighbour holding an island, without settling: it buys back 16 of the 18 islands it lost (2 still held abroad at the end), spends about 20,000 Cr a game doing it, and ends with about 15,600 Cr against 34,600 for one that never buys; all games won. At the old price it bought all 18 for about 11,000 a game.
- **For step 5 (the military):** a neighbour's island is `foreignIslands`; `buyBackIsland` (application/actions/treatyActions.ts) shows what taking one hands over (province, homes and farm, people, scouted). A hostile neighbour (-30) is the obvious one to fight; an accord is the obvious thing a war would break.

## The army: notes for garrisons and war

- **Garrisons work only where they stand** (no garrisoned province rose in nine sloppy games), and a country can afford few, so they are a choice of where. The scripted player can keep them with `army: true` (tests/support/carefulPlayer.ts), which raises regiments when it has 3,000 Cr and stands each in the most troubled province without one.
- **A careful player gains little from garrisons today**: it rarely riots. Their real use comes with war (phases C and D), when regiments on an island are what a landing must beat.
- **A march goes through your own land and lost provinces only** (`canEnterAsYou` in application/actions/armyActions.ts), so a sea leg can't be blocked and a land march never enters a neighbour. Phase C opens a neighbour's island to it.
- **Fighting is deterministic** (domain/military/battleRules.ts: `fightRebels`, and `forecastFight` for the preview). Phase C can reuse it against a neighbour's garrison, with their regiments' strength in place of the rebels'.
- **Sea legs go round the coast** (step 6, phase B; presentation/seaRoutes.ts): a way through waypoints set 20 map units off every coast corner and island hull, worked out once per pair of places, and the counter moves along it by distance. Drawing only: the days at sea are unchanged, so a way that goes the long way round still takes the days a straight crossing would. The leg in and out of an island is drawn to the island's name, across its own land.
- **War is still cheap.** Measured 2026-10-20 (step 6, phase D) with the smarter scripted war: it keeps a garrison on each island it holds, declares only with three regiments free on the mainland, and lands only where `forecastLanding` says it wins. Over nine five-year games it fought 9 wars, took 9 islands, lost none and lost 1 regiment; with `settle: true` as well, it took 5, lost none and 8 regiments, and met 3 wars started against it. All games won. An island a year for 40 political power and a little support is a good price: WAR_POLITICAL_POWER, the weariness, or garrisons that defend harder are the levers, if war should cost more. Phase E looks at the island buy-back, which is the other way to the same islands.
- **The neighbours never fight each other**, and never take a province on the mainland: both are out of scope (ROADMAP step 5).
- **The browser check:** run tests/support scripts or the iPad driver from PowerShell (Start-Process), not from Git Bash in the background: from Git Bash the driver hung and looked like a frozen page.

## Province crises (step 6, F2)

- **Rules in domain/crises, run in application/day/crises.ts** (the last step of the day: crises end, an untended fever spreads, and on the 1st one may strike), answered in application/actions/crisisActions.ts. A crisis lives on its province (`crisis`); what outlasts it does too (`diked`, `seamYield`). A flood's farms are `condition: "ruined"`: out of use and not repairable, like "seized", until the flood ends.
- **Production** goes through `getLandProduction` (crisisRules.ts), the land's goods less what crises take; the province card uses `getProvinceYield`.
- **The scripted player reads its briefings now** (it never did, so the chapter letters piled up unread). That alone changed the dice of every balance game; the crisis roll waits until no letter is open.
- **Fever is rare** (one or two in nine careful games): only a province with 5% of its people homeless can catch it, and a careful player keeps homes ahead. The campaigns can strike one on purpose.
- **For F3 and the campaigns:** `strikeCrisis(state, provinceId, kind)` (application/day/crises.ts) starts one on purpose, letter and all.

## The campaigns: how a story is written (step 6, F onwards)

- **A story chapter is four entries:** its words in `STORY_CHAPTERS` (domain/chapters/chapterData.ts: `nation`, `after` for the chapter it follows, `by` for the month it opens at the latest, `letter`, `partyLines`, `ending`), its rules in `STORY_RULES` (application/chapters.ts: what opens it besides its date, and a check for each objective), where each objective is done in `STORY_DESTINATIONS` (presentation/navigation.ts), and its letter in `DECISIONS` with `story: true`, so it is never drawn at random.
- **Ids are "<nation>:<beat>"** for chapters; a choice is remembered as the deed "<letter>:<option>", which later chapters' rules and the `ending` lines read.
- **A story chapter opens nothing**, so the systems' dates and the difficulty ladder stand; but its letter's effects move the numbers, and the scripted player takes the option that raises support most. Each campaign needs its balance pass (tests/balance.test.ts), and its letters agreed before they are built.
- **Old saves see no story**: `allChaptersOpen` counts every story chapter done. A save from before F loads with no letters waiting.
- **tests/story.test.ts** tells a two-chapter story of its own to test the mechanism; it adds and removes its entries itself.
- **An answer's outcome** (F3): `outcome` on a story letter's option (StoryOutcome in domain/decisions/types.ts), applied by application/storyOutcome.ts after its numbers: `groups` (points to a group's backing), `politicalPower`, `build` and `pullDown` (in a named province, free and at once), `order` (a province's local order now), `lasting` (modifiers on the whole country for some days; GameState.lasting, read by getModifiers), `taxRelief`, `rises` (an uprising now), and `crisis` (strikeCrisis, letter and all). The letter lists every one of them in words (presentation/storyText.ts), and a story letter can't be closed unanswered.
- **A story branches** by giving two chapters the same `after` and opening each on a different choice (their STORY_RULES read the deed), and joins again with `after: [one, other]`.
- **The scripted player** takes the answer that raises support most, counting the groups it moves by their share of the vote. A campaign's balance pass should also try the other answers (a careful player won't always take the popular one).

## Process reminders

- Domain rules live in `src/domain/<concept>/`, cross-domain use cases in `src/application/`, and React only in `src/presentation/`.
- Every tunable number goes in `src/domain/constants.ts`.
- New `GameState` fields need a default in `hydrateGameState` (`src/presentation/hooks/gameSave.ts`) so old saves load. `tests/saves.test.ts` fails if one is missing.
- Player-facing text: plain sentences, no em dashes.
