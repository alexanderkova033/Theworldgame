# Technical Design

## Architecture overview

This project uses a **clean architecture** with a **screaming folder structure**:

- **Clean architecture** means dependencies only point inward: the UI depends on the application layer, the application layer depends on the domain layer, and the domain layer depends on nothing (no React, no browser APIs, no timers). You could delete `presentation/` entirely and the game logic would still compile and be testable on its own.
- **Screaming architecture** means the top-level folder names describe *what the software does* (economy, population, construction, politics...) instead of *what kind of file it is* (components, hooks, utils). Opening `src/domain/` should tell you this is a country simulator, not "a React app."

There are three layers:

```
presentation/   →   application/   →   domain/
   (React)          (use cases)         (rules & types)
```

- **`domain/`** — The rules of the world, grouped by game concept. Each subfolder (`economy`, `population`, `food`, `industry`, `roads`, `stability`, `politics`, `army`, `research`, `construction`, `provinces`, `nations`, `country`) exports pure functions and types for that concept only. A function like `applyFoodConsumption(stats, days)` takes data in and returns new data out — no mutation, no side effects, no imports from React or `application/`.
- **`application/`** — Use cases that orchestrate multiple domain modules to do something meaningful: "simulate one day," "build a farm," "generate this month's report," "start a new game." This is the only layer allowed to call more than one domain module at a time.
- **`presentation/`** — React components and hooks. This layer calls `application/` functions in response to user input (button clicks) or time passing (the game clock hook), and renders whatever `GameState` it's given. It never contains simulation math itself.

This keeps the simulation logic testable and framework-independent, and makes it obvious where new functionality belongs: a new stat or system gets its own `domain/<name>/` folder; a new player action gets a new file in `application/actions/`; a new way of showing data gets a new component in `presentation/components/`.

## Game state structure

The entire simulation is one plain, serializable object: `GameState` (defined in `domain/country/types.ts`).

```ts
interface GameState {
  nationId: string;        // chosen once, at the start screen; fixed for the rest of the game
  date: GameDate;          // { year, month, day } — see "Daily tick system" below
  isPaused: boolean;
  speed: GameSpeed;        // 1 | 2 | 3 | 5
  stats: CountryStats;     // treasury, population, food, industry, stability, army, research, popularity
  taxRate: number;         // 0–1
  farmCount: number; factoryCount: number; roadCount: number;
  educationLevel: number; researchLevel: number;
  projects: Project[];     // active construction/research projects (each has a provinceId)
  placedBuildings: PlacedBuilding[]; // completed buildings, remembered for the map
  events: GameEvent[];     // event log, newest first
  monthlyReports: MonthlyReport[]; // history of past reports
  history: DailyDelta[];   // rolling buffer of recent daily changes, used to build the next report
}
```

Because `GameState` is a plain object, saving/loading later (see ROADMAP) is just serializing/deserializing JSON — no special class instances or hidden state.

Note what's *not* in `GameState`: which province is currently selected on the map to build in next. That's ephemeral UI selection, not simulation truth, so it lives as local `useState` in `App.tsx` (see "Map and provinces" below) rather than polluting the state the simulation engine reasons about.

## Simulation engine structure

Each `domain/<concept>/` module exposes small pure functions that take relevant pieces of `CountryStats` (or the whole `GameState` when a rule needs cross-cutting data, like stability needing food) and return the updated values. For example:

```ts
// domain/food/foodRules.ts
export function produceFood(stats: CountryStats): number { ... }
export function consumeFood(stats: CountryStats): number { ... }
```

```ts
// domain/stability/stabilityRules.ts
export function updateStability(stats: CountryStats): number { ... }
```

None of these functions know about days, projects, or the UI — they just transform numbers. That composition happens one layer up, in `application/simulateDay.ts`.

## Daily tick system

`application/simulateDay.ts` exports `simulateDay(state: GameState): GameState`, which is called once per in-game day. It:

1. Advances `state.date` by one day (`domain/country` calendar helper).
2. Applies economy rules (income from tax/industry, expenses from army/projects) to `treasury`.
3. Applies food production/consumption to `food`.
4. Applies industry, roads, and research accumulation.
5. Advances any active `projects` by one day; when a project's `daysRemaining` hits 0, applies its completion effect (e.g., "+1 farm" → increases food production rate), records a `PlacedBuilding` at that project's `provinceId` (so the map can show it), and logs an event.
6. Applies stability and popularity adjustments based on the new food/tax/army numbers.
7. Applies slow population growth/decline based on food and stability.
8. Appends a `DailyDelta` to `state.history` (what changed today), used later for the monthly report.
9. Returns a **new** `GameState` object (the engine never mutates the state it's given — this keeps React's state updates predictable and makes the engine easy to unit test).

A simplified calendar is used: every month has 30 days, and every year has 12 months (360 days/year). This avoids leap-year/variable-month-length edge cases that add complexity without adding gameplay value in the MVP. It can be swapped for a real calendar later without touching any other system, since only `domain/country`'s calendar helper knows about day/month/year math.

## Map and provinces

`domain/provinces/` holds the map's static geometry (`provinceData.ts` — an SVG coastline path plus eight province polygons, generated once offline with a Voronoi diagram clipped to a procedural coastline, then hardcoded; no geometry library ships to the browser) and a `PlacedBuilding` type (`{ id, provinceId, type }`).

Every `Project` now carries a `provinceId`, set by whichever province is selected on the map when the player clicks a build action. When `applyProjectCompletion` finishes a project, it appends a `PlacedBuilding` to `state.placedBuildings` in addition to incrementing the usual national count (`farmCount`, etc.) — the map is a second, purely additive view of the same event, not a separate source of truth.

Deliberately **not** modeled yet: per-province stats. `treasury`, `food`, `industry`, and the rest remain one national pool regardless of where buildings are placed — `domain/economy`, `domain/food`, and friends are untouched by provinces. Splitting the economy per-province (so a province's own farms feed its own population, etc.) is a real architectural change — probably a `Province` gaining its own `CountryStats`-shaped slice — and is tracked as a ROADMAP item rather than done here, to keep this step additive instead of a rewrite.

`presentation/components/MapPanel.tsx` renders the geometry as an SVG: provinces are clickable `<path>` elements (selection is forwarded up to `App.tsx`, which owns `selectedProvinceId` as local `useState`), and `placedBuildings` are grouped by province and drawn using `BuildingIcon.tsx` (a small pictorial glyph per type: barn/chimney'd factory/book/flask) so the map fills in as the country develops. Roads are drawn differently — see below. Provinces the player doesn't own render dimmed and un-clickable but filled with *their actual owning nation's* color (via `getNationForProvince`), not a flat "foreign" grey — `MapPanel` has no special-cased "enemy color," it just looks up whoever owns a province and uses their color at reduced opacity.

`MAP_GEOMETRY` also carries `otherLandmasses`: a few small decorative island coastlines (no provinces, no owner) rendered the same way as the main continent, just to make the world feel bigger than one landmass. They're generated the same offline way as the main coastline (smooth sine-harmonic noise around a circle, not per-vertex random jitter — the latter produces spiky, self-intersecting shapes) and hardcoded like everything else in `provinceData.ts`.

**Roads get their own rendering**, not `BuildingIcon`: each road built adds a parallel "lane" line from the capital to that province (up to 5 visible lanes; beyond that a "×N" text badge takes over) rather than just making one line thicker. This was a deliberate fix — an earlier version only changed stroke width per road, which plateaued after ~4 roads and made "build more roads" feel like it did nothing. The same lesson was applied to the army: recruiting soldiers now shows a crossed-swords marker + number at the capital, since previously it had zero map presence at all.

## Nations and the start screen

`domain/nations/` defines a `Nation` (`{ id, name, color, capitalProvinceId, provinceIds, blurb }`) and a static roster of three (`nationData.ts`), each owning a disjoint subset of the eight provinces. `getNationForProvince(provinceId)` answers "who owns this province," used by both the in-game map and the start-screen preview map.

The game doesn't begin with a `GameState` — `useGameClock`'s state starts as `null`, and `application/startNewGame.ts` now takes a `nationId` argument (it looks up the `Nation`, seeds starting buildings inside that nation's own provinces via its `capitalProvinceId` and `provinceIds`, and stamps `nationId` onto the resulting `GameState`). `App.tsx` renders `StartScreen` whenever `state` is `null`; the moment `onSelectNation` fires, `useGameClock.startGame(nationId)` creates the real `GameState` and the app switches to the normal game view. There is no action anywhere in `presentation/` that can set `nationId` again or return `state` to `null` — "locked in once chosen" is enforced simply by that action not existing, not by a runtime check.

## Monthly report system

`application/generateMonthlyReport.ts` exports `generateMonthlyReport(state: GameState): MonthlyReport`. It is called by `simulateDay` whenever `state.date.day` wraps back to 1 (i.e., a new month has started). It reduces the `DailyDelta[]` entries accumulated since the last report into a summary: total income, total expenses, net treasury change, population change, stability change, and any notable events. The resulting `MonthlyReport` is pushed onto `state.monthlyReports`, and `state.history` is cleared to start accumulating the next month's deltas.

## UI/simulation separation

`presentation/` never computes simulation values itself. Its two responsibilities are:

1. **Driving time**: `presentation/hooks/useGameClock.ts` is a `useEffect`-based hook that, once per interval (interval length depends on `speed`), calls `application/simulateDay.ts` and stores the resulting `GameState` in React state — but only while a game has started and `isPaused` is false. Before the player picks a nation, `state` is `null` and the effect is a no-op.
2. **Displaying state and forwarding actions**: components like `StatsPanel` or `ProjectsPanel` receive slices of `GameState` as props and render them. Components like `ActionsPanel` call `application/actions/*` functions (e.g., `buildFarm(state)`) when the player clicks a button, and hand the resulting new `GameState` back up to `App.tsx` to be stored.

`App.tsx` is the only place that owns the live `GameState` (via `useState`) and is the seam between `presentation/` and the rest of the app — it imports from `application/`, never directly from deep inside `domain/`.

**Layout**: the map is the central, dominant element rather than a banner above everything else. `App.tsx` renders `TopBar`, then a `.game-layout__main` flex row of `[left sidebar][map stage][right sidebar]` — `StatsPanel`/`ActionsPanel` on the left, `ProjectsPanel`/`ReportsPanel`/`EventLog` on the right, each independently scrollable, with the map filling all remaining space (`MapPanel`'s `<svg>` uses `preserveAspectRatio="xMidYMid meet"` so it scales cleanly rather than being capped at a fixed height). Below ~1100px viewport width, `.game-layout__main` switches to a column layout via a media query so it degrades to something usable on narrow screens instead of squeezing three columns.

**Temporarily-hidden actions**: Development/Military/Taxes were removed from `ActionsPanel` (and their corresponding rows from `StatsPanel`) to keep the UI focused on the core build/food/economy loop. This was a presentation-only change — `application/actions/investEducation.ts`, `startResearch.ts`, `recruitSoldiers.ts`, `taxActions.ts` and their domain rules are untouched, just currently unreferenced by any component. Re-adding them later is re-adding a couple of button groups to `ActionsPanel.tsx`, not rebuilding anything.

## How future systems can be added

Because of the layering, most future features (see ROADMAP.md) follow the same recipe:

1. **New stat or resource** (e.g., "steel"): add it to `CountryStats`, add a `domain/steel/` module with its production/consumption rules, wire it into `simulateDay`, and add a line to `StatsPanel`.
2. **New player action** (e.g., "build a mine"): add a new file in `application/actions/`, following the same shape as `buildFarm.ts` (validate cost → deduct treasury → push a new `Project`).
3. **New system entirely** (e.g., trade, diplomacy): add a new `domain/<system>/` folder and a corresponding `application/` use case, without needing to touch unrelated domains — `domain/provinces/` and `domain/nations/` (see above) are examples of this already done. Fully simulating the two non-player nations (instead of just displaying their territory) would mean `GameState` holds a collection of country objects instead of one, but the per-country rules in `domain/` stay the same.
4. **Persistence** (save/load): since `GameState` is a plain serializable object, this is a `presentation/` (or new `infrastructure/`) concern — serialize to `localStorage`/a file, no changes needed to `domain/` or `application/`.

The goal is that adding a feature almost always means *adding* a file, rarely *editing* several existing ones.
