# Technical Design

How the code is laid out and why. What the game is, as the player sees it, is in GAME_DESIGN.md; what comes next is in ROADMAP.md.

## Architecture overview

The project uses a **clean architecture** with a **screaming folder structure**:

- **Clean architecture**: dependencies point inward only. The UI depends on the application layer, the application layer on the domain, and the domain on nothing (no React, no browser APIs, no timers). Delete `presentation/` and the game still compiles and can be tested on its own.
- **Screaming architecture**: folder names say what the software does (economy, crises, military, chapters) rather than what kind of file sits in them. Opening `src/domain/` should tell you this is a country simulator, not a React app.

```
presentation/   →   application/   →   domain/
   (React)          (use cases)         (rules & types)
```

- **`domain/`** holds the rules of the world, one folder per concept: `chapters`, `construction`, `country`, `crises`, `decisions`, `difficulty`, `diplomacy`, `economy`, `expeditions`, `food`, `housing`, `industry`, `islands`, `labour`, `laws`, `ledger`, `loans`, `maintenance`, `market`, `military`, `nations`, `neighbours`, `parties`, `policy`, `politics`, `population`, `provinces`, `randomEvents`, `reign`, `research`, `resources`, `roads`, `stability`, `synergy`, `unrest`, `uprising` and `workforce`. Each exports pure functions and types: data in, new data out, no mutation and no imports from React or `application/`.
- **`application/`** holds use cases that combine several domain modules into one meaningful thing: one day of play (`simulateDay.ts` and `day/`), a player action (`actions/`), a chapter opening (`chapters.ts`), or a question the UI asks (`getAdvisorOutlook.ts`, `getForecasts.ts`, `getProvinceOverview.ts`...). It is the only layer allowed to call across domain modules.
- **`presentation/`** holds React components, the game clock and saves. It calls `application/` in response to clicks and to time passing, and renders the `GameState` it is given. It never does simulation math.

Every number worth tuning lives in `src/domain/constants.ts`, with a comment saying what it does. Difficulty levels change a few of them through `domain/difficulty/difficultyData.ts`.

## Game state

The whole game is one plain, serialisable object, `GameState` (`domain/country/types.ts`). The type is the reference; in outline it holds:

- **The setup, fixed at the start**: `difficulty`, `nationId`, `partyId` and `mode` (Three Terms or the Long Reign).
- **The clock**: `date`, `isPaused`, `speed`, and `isGameOver`, `outcome` and `gameOverReason`.
- **The country's figures**: `stats` (treasury, population, food, industry, stability, political power, popularity), `resources` (wood, ore, coal, grain, fish), `taxRate`, `debt`, `unrestStage`, `factionApproval`, and the building counts (`farmCount`, `factoryCount` and the rest).
- **Places**: `provinces` (each province's own people, order, uprising, crisis, dike and seam), `placedBuildings` (every finished building and where it stands, with its condition: broken, repairing, seized or ruined), `projects` under way, `lostProvinceIds` and `freeProvinces` (provinces that broke away, and their rebels), and the islands (`settlements`, `settledIslandIds`, `expeditions`, `scoutedIslandIds`).
- **Policy**: enacted laws and research, `activeLaw`, `researchFocus`, `researchProgress`, `researchOutcomes`, `researchPathsFinished`, the `workforce` (scientists and police), and `lasting` effects laid on by a story's choices.
- **The world**: `neighbours` (each a country run by the computer), `foreignPolitics`, `foreignIslands` and `foreignIslandsSince`, `foreignVoyages`, `market`, `regiments` (every country's), `wars`, `sieges` and `ultimatum`.
- **Letters waiting**: `pendingDecisionId`, `pendingDemand`, `pendingCrisis`, `pendingOffer`, `ultimatum` (until answered), `burdenOffer`, and unread chapter briefings in `chapters.unread`.
- **The story so far**: `chapters` (opened, done, unread, the deeds and choices made, and story letters still to send), `decisionHistory`, `burdens`, `electionsWon`, `retriesUsed`, `crisisQuietUntil` and `dangerPauses`.
- **The record**: `events`, `monthlyReports`, `history` (the days since the last report), `pendingLedger` and `lastDayLedger`.

Because it is plain data, saving is a JSON round trip. `presentation/hooks/gameSave.ts` keeps three named slots in `localStorage`, plus a checkpoint per slot that a lost game can go back to. A save written before a field existed loads without it, so **every new field needs a default in `hydrateGameState`**; `tests/saves.test.ts` fails if one is missing.

What is not in `GameState`: anything only the screen cares about, such as which province is selected, which window is open, or whether resting tooltips are turned on. That lives in React state or, for preferences, in `localStorage` on its own.

## The day

`application/simulateDay.ts` exports `simulateDay(state): GameState`, called once per in-game day. It never mutates the state it is given. Each step lives in its own file under `application/day/` and shares a `Day` (`day/dayContext.ts`): the state as the day began, today's modifiers (read once, so a law taking force today counts from tomorrow), the season, road efficiency, the event log being written, and the ledger of why each number moved.

In order:

1. **buildings**: projects, ventures, laws and research advance; repairs and breakdowns.
2. **goods**: resources from the land (less what crises take), the market, processing, heating, debt interest.
3. **money**: taxes and industry in, wages out.
4. **food**: farms and processing against what is eaten. Industry and political power follow, one line each.
5. **order**: stability, unrest, collapse.
6. **support**: popularity drifts toward its target, group by group.
7. **people**: births, deaths, migration between provinces, each province's own order. Then **uprisings**: provinces rising, rebel strength, demands, provinces breaking away.
8. The day is recorded and the calendar turns. On the first of a month the old month gets its report (`generateMonthlyReport.ts`), and **newMonth** rolls world events, the rival's campaign and the season.
9. **election**, when one is due. A decision may arrive on the first of the month.
10. **army**: an ultimatum may run out into war; every regiment drills, marches or fights; islands change hands.
11. **neighbours**: on the first of the month each neighbour lives a month, builds, recruits, may send settlers and may write a trade offer.
12. **crises** (`day/crises.ts`): one whose time is up ends, a neglected fever spreads, and one may strike.
13. A waiting story letter goes out (`sendStoryLetter`) and chapters open or complete (`advanceChapters`).

`application/playDay.ts` wraps it: after the day it checks for a danger showing for the first time this season (strikes, a province rioting, cold homes, food running out, dangerous debt) and pauses with a notice, once per danger per season, never at 1x speed.

The calendar is simplified on purpose (`domain/country/calendar.ts`): twelve months of 30 days. Only the calendar helpers know that.

**The ledger** (`domain/ledger`) is how the game explains itself. Every step books what it changed against a cause; player actions book theirs into `pendingLedger` through `recordAction`, and the next day folds it in. The monthly report and the top bar's "why" popovers read it back. Changes that happen after the calendar turns are booked to `late`, so they belong to the new month.

**Modifiers** (`domain/policy`) are how everything that bends the rules is folded together. Laws, research (scaled by how well each turned out), the party's creed, the nation's character, law and research pairs (`domain/synergy`) and lasting story effects each describe their effect as `ModifierEffects`; `getModifiers(state)` adds them up, and every rule reads its factor from there. A new kind of effect is wired into the rule it changes once.

## Letters and the clock

The game stops for anything that needs an answer. `presentation/hooks/useGameClock.ts` is the only place with a timer; it runs `playDay` once per tick and refuses to resume while `isLetterWaiting(state)`: an unread briefing, a burden to choose, a decision, a demand, a crisis, a trade offer or an unanswered ultimatum. The simulation sets `isPaused` when one arrives; the clock makes sure Resume can't skip past it.

Letters never stack. A random decision rolls only when none is pending, a random crisis only when no other letter waits, and a story letter waits in `chapters.letters` until the decision slot is free.

## Provinces and people

Sixteen provinces on one continent plus six islands, all in `domain/provinces/provinceData.ts` and `domain/islands/islandData.ts` as hardcoded SVG geometry (no geometry library ships to the browser). Provinces and settled islands read as one kind of place through `getPlace` and `getOwnedProvinceIds` (`provinceRules.ts`).

Each province is a place people live (`ProvinceState`): its population, which sums to the nation's; local stability and unrest stage, drifting toward the nation's minus local troubles; and its uprising, crisis, dike and seam. Homes are counted province by province (`domain/housing`), and jobs are filled from each province's own people first, then by commuters (`domain/labour`). People move toward free homes and work (`provinceMigration.ts`).

Buildings are built through `application/actions/createBuildAction.ts`. Each build action carries `.canBuild(state, provinceId)` and `.maxPerProvince`, so the UI asks the same question the action answers. The cap counts finished and queued buildings together. A finished project is placed by `placeBuilding` in `applyProjectCompletion.ts`, which also raises the national count; `pullDownBuilding` is its reverse, used by crises and story letters.

**Uprisings** (`domain/uprising`): a province that riots long enough rises, its workplaces seized. Rebel strength grows or falls by the day; police, militia, a calm country and the rebels' own terms bring it down. Left at full strength for a month it breaks away (`application/loseProvince.ts`): its people leave the country, it joins `lostProvinceIds`, and its rebels hold it in `freeProvinces` until regiments take it back (`retakeProvince.ts`).

## Resources, the market and trade

Each terrain gives a resource (`domain/resources`). `getLandProduction` (`domain/crises/crisisRules.ts`) is the country's day of goods from every province it holds, less what crises take.

The continental market (`domain/market`) holds a stock of every good, and prices come from that stock against its seasonal equilibrium. Selling into it lowers the price, buying raises it, and buying always costs more than selling. `holdsPort(state)` asks whether the country still holds a mainland coast today, not whether it started with one; a port buys cheaper. A settled island's coast doesn't count: it trades through its harbour.

## Neighbours

Each neighbour is a country of its own (`domain/neighbours`), living a month at a time by the same numbers as the player's, and choosing by its ruler's temper (`neighbourData.ts`). Its dice are its own, drawn from the nation and the month (`neighbourDice`), so nothing a neighbour does shifts the luck of anything else; the balance tests rely on that.

- **Stores**: a neighbour's land fills its stores of wood, ore and coal each month (`NEIGHBOUR_STORE_PER_PROVINCE`, `NEIGHBOUR_COAL_PER_HILLS`, up to `NEIGHBOUR_STORE_CAP`).
- **Trade by letter** (`tradeRules.ts`): now and then a neighbour offers to sell, under the market, food it has to spare or goods from its stores that you are short of, or to buy the one good its land lacks (Astravia coal, Caldenreich wood, Veldoria ore). Prices are fixed when the letter is written.
- **Relations** (`relationsRules.ts`): -100 to 100, moved by what you do and remembered as a few feelings with reasons.
- **Treaties** (`treatyRules.ts`): an island accord, or buying back an island. `whyNoBuyBack` refuses until the neighbour has held the island for `BUY_BACK_HELD_DAYS`, counted from `foreignIslandsSince`; the price is a base plus so much per person living there.

## Islands

`domain/islands` and `domain/expeditions`: a venture scouts an island, then a settler ship founds a settlement, and on landing the island becomes one of the country's provinces. Harbours on both sides link a colony (people cross, no supply fee). An island with people of its own is settled on terms. Neighbours race for the islands with their own voyages: a neighbour's ruler decides when to set out with the rest of its month (`day/neighbours.ts`), and its ships sail and land with the buildings step (`day/race.ts`).

## The military

`domain/military`: `regiments` holds every country's regiments as counters on the map.

- `militaryRules.ts`: how many a country can keep, how they march (a few days over land, a few weeks by sea), and how a computer ruler raises its own.
- `battleRules.ts`: fighting a day at a time, with no chance in it. Regiments in a province that broke away wear its rebels down; landing on a neighbour's island means a battle with its garrison, then a siege. `forecastFight` and `forecastLanding` say how it will go before you commit.
- `warRules.ts` and `threatRules.ts`: war is fought over islands only, never a neighbour's mainland. You may declare it; a hostile, stronger neighbour may send an ultimatum first and then sail.

The militia (`militiaActions.ts`) is separate: a cheap home force for uprisings, not a counter on the map.

## Province crises

Trouble that strikes one province (`domain/crises`): a flood, a worked-out seam, a forest felled bare, fever, failing fishing grounds. `crisesFor(province, terrain, capacity, season)` says which a province's land and state lay it open to.

- `day/crises.ts` rolls and runs them. A random crisis strikes on the first of a month, from `CRISIS_FROM_MONTH` on (`CRISIS_CHANCE_PER_MONTH`, times the difficulty's `crisisChance`), weighted by kind (`CRISIS_WEIGHTS`), and only when no other letter waits, no crisis is under way anywhere, and the quiet spell after the last one (`crisisQuietUntil`) is over. A neglected fever spreads next door: it is the same crisis.
- `actions/crisisActions.ts` answers one. Each answer is paid at once and sets how long the crisis runs and what share of the province's goods comes in meanwhile; retooling or closing a worked-out seam ends it there and then.
- While it lasts the province's mood sits lower (`getCrisisUnrest`), its goods fall (`getProvinceYield`), and a flood leaves its farms `ruined` until it is over.
- The player sees it in three places only: a mark on the province, a line on its card, and the letter.

## Chapters and stories

`domain/chapters/chapterData.ts` holds the words; `application/chapters.ts` decides when each chapter opens and when its objectives are met.

**System chapters** open the game's systems one by one (the market, the assembly, research, unrest...). Each has a trigger and a date by which it opens anyway (`by`), so bad luck can delay a system but never keep it shut.

**Story chapters** (`STORY_CHAPTERS`, ids `"<nation>:<beat>"`) belong to one nation and open nothing, so every system still opens when it would and the difficulty ladder holds. Each campaign is two files:

- `domain/chapters/stories/<nation>.ts`: the chapters (title, briefing, party lines, objectives, an optional crisis, ending lines keyed by choice) and the letters (`DecisionDefinition`s marked `story: true`, so they never enter the random pool).
- `application/stories/<nation>.ts`: `StoryRules` per chapter, `opens(state, month)` and `checks`, built from the helpers in `storyChecks.ts` (`answered`, `chose`, `crisisDealtWith`). They are gathered into `STORY_RULES`.

A story chapter opens only once the chapter it follows (`after`, one id or several) is **told**: opened, its briefing read, and its letter answered (`isTold`). Waiting on "told" rather than "done" keeps a story from stalling on an objective the player can't meet yet. A beat can branch by testing an earlier choice in its `opens` rule (Veldoria's sixth beat is the congress or the general strike, by the first letter's answer).

Reading a story briefing (`readBriefing`) queues its letter and strikes its crisis, if it has one, provided the province is held, free of a crisis and, for a flood, not diked. Story crises ignore the quiet spell: the story calls for them.

A story letter's answer applies its numbers like any decision, then its `StoryOutcome` (`application/storyOutcome.ts`): move a group's backing, political power, raise or pull down buildings in a named province, change a province's order, lay a lasting effect on the country (`GameState.lasting`, read by `getModifiers` until it runs out), make a province rise, start a crisis, or let a province off its taxes. The choice is kept as a deed (`"<letter>:<option>"`), which later rules and `storyEnding` read; the ending screen shows a line for each turn the story took. `presentation/storyText.ts` writes an outcome out in plain words on the letter.

## Difficulty and the Long Reign

`domain/difficulty/difficultyData.ts`: each level changes a few numbers, and every change is listed on the start screen in plain words. The levels are measured, not guessed (see Tests). A lost game may go back to its last checkpoint a number of times set by the difficulty (`retriesUsed`).

`domain/reign`: in the Long Reign, each election won brings a choice of burdens, which stack. The longest reign per difficulty is kept in the browser (`presentation/hooks/records.ts`).

## Presentation

`App.tsx` owns the live game through `useGameClock` and wires it into the windows. It is the seam: it imports from `application/` and reads from `domain/` only for data.

**One place for each thing.** `presentation/navigation.ts` alone decides which window and section answers each problem, so the tab layout can change without touching the rules. The rule it keeps: the top bar shows each headline figure once, and a window shows it again only at the head of its own detail, never as a badge on its tab. A tab's "!" stays, since it says where in a window to look. A campaign adds no window or tab: its story arrives as briefing letters and lives in the objectives box on the map. `objectiveDestination` and `STORY_DESTINATIONS` send each objective to where it is done.

**The map** (`MapPanel.tsx`) is the centre of the screen, an SVG whose `viewBox` is the camera. Wheel zoom uses a native non-passive listener (React's is passive, so `preventDefault` would fail); every camera move goes through `clampViewBox`; a press that moves more than `DRAG_CLICK_THRESHOLD` pixels is a drag, not a click.

- `nationFrontiers.ts`: each nation's outer frontier as line segments, worked out from the provinces it holds now (`nationShapes(lostProvinceIds)`, cached per set of lost provinces), so a province that broke away falls outside the band and the nation's name moves onto the land it still holds.
- `MapArmies.tsx`: regiment counters, picked up and sent by tapping. A march is a dashed line along the way still to go, with the counter moving along it by distance. At sea the way comes from `seaRoutes.ts`: waypoints a little off every coast (each corner of the continent, each corner of every island's convex hull) and the shortest way between those that can see each other without crossing land. Drawing only: the days at sea are the rules'.

**Tooltips** (`Tooltips.tsx`, `tipPreference.ts`): one tooltip for the whole game takes over plain `title` attributes. It is asked for, not thrown at the player: it shows only once the pointer has rested (`TIP_REST_MS`, shorter when reading along a row), Shift shows it at once, a click puts it away until the pointer leaves, and resting tips can be turned off from the top bar. The province card on the map follows the same rest. On touch, a press and hold shows a tip.

**Words**: `glossary.ts` names each thing once, and `tests/vocabulary.test.ts` checks the player-facing text uses those names. Player-facing text is plain sentences.

## Tests

Vitest, in `tests/`. Two kinds:

- **Rules**: focused tests per system (crises, uprisings, sea routes, saves, each nation's story...).
- **Played games**: `tests/support/carefulPlayer.ts` plays whole games by script, seeded through `tests/support/seededRandom.ts` (the game rolls `Math.random`; tests swap in a seeded generator, so a result can be repeated). It plays careful or sloppy, can follow one path of a tree, chooses Long Reign burdens, keeps garrisons, answers crises, and with `neglect` lets things slide until a province is lost.

`tests/balance.test.ts` holds the ladder: 27 five-year games per difficulty, with bars for the sloppy and careful players (the measured results are in `difficultyData.ts`). Any change that touches balance should be measured against it, and the measurement written up in TODO.md.

Before a commit: `npx tsc -b`, `npm run lint`, `npm test` and `npm run build`.

## Adding things

Most features follow one of these recipes, and most mean adding files rather than editing many:

1. **A new figure or system**: a `domain/<name>/` folder with its rules, a step (or a line) in the day, and a place on screen chosen by the one-place rule in `navigation.ts`.
2. **A new player action**: a file in `application/actions/`, exported from `actions/index.ts`, booking what it changed through `recordAction`.
3. **A new `GameState` field**: a default in `hydrateGameState`, or old saves break.
4. **A new crisis kind**: its answers and costs in `crisisRules.ts`, what it does in `day/crises.ts` and `crisisActions.ts`, its words in `presentation/crisisText.ts`, its mark in `CrisisIcon.tsx`.
5. **A new story beat**: a chapter and letter in `domain/chapters/stories/<nation>.ts`, its rules in `application/stories/<nation>.ts`, a destination for any new objective in `navigation.ts`, and a line in that nation's story test.
6. **A new modifier**: a field in `ModifierEffects` (`domain/policy/modifiers.ts`), read by the rule it changes; laws, research, creeds and story effects can all then use it.
