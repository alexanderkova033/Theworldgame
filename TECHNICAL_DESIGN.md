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

- **`domain/`** — The rules of the world, grouped by game concept. Each subfolder (`economy`, `population`, `food`, `industry`, `roads`, `stability`, `politics`, `army`, `research`, `construction`, `country`) exports pure functions and types for that concept only. A function like `applyFoodConsumption(stats, days)` takes data in and returns new data out — no mutation, no side effects, no imports from React or `application/`.
- **`application/`** — Use cases that orchestrate multiple domain modules to do something meaningful: "simulate one day," "build a farm," "generate this month's report," "start a new game." This is the only layer allowed to call more than one domain module at a time.
- **`presentation/`** — React components and hooks. This layer calls `application/` functions in response to user input (button clicks) or time passing (the game clock hook), and renders whatever `GameState` it's given. It never contains simulation math itself.

This keeps the simulation logic testable and framework-independent, and makes it obvious where new functionality belongs: a new stat or system gets its own `domain/<name>/` folder; a new player action gets a new file in `application/actions/`; a new way of showing data gets a new component in `presentation/components/`.

## Game state structure

The entire simulation is one plain, serializable object: `GameState` (defined in `domain/country/types.ts`).

```ts
interface GameState {
  date: GameDate;          // { year, month, day } — see "Daily tick system" below
  isPaused: boolean;
  speed: GameSpeed;        // 1 | 2 | 3 | 5
  stats: CountryStats;     // treasury, population, food, industry, stability, army, research, popularity
  taxRate: number;         // 0–1
  projects: Project[];     // active construction/research projects
  events: GameEvent[];     // event log, newest first
  monthlyReports: MonthlyReport[]; // history of past reports
  history: DailyDelta[];   // rolling buffer of recent daily changes, used to build the next report
}
```

Because `GameState` is a plain object, saving/loading later (see ROADMAP) is just serializing/deserializing JSON — no special class instances or hidden state.

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
5. Advances any active `projects` by one day; when a project's `daysRemaining` hits 0, applies its completion effect (e.g., "+1 farm" → increases food production rate) and logs an event.
6. Applies stability and popularity adjustments based on the new food/tax/army numbers.
7. Applies slow population growth/decline based on food and stability.
8. Appends a `DailyDelta` to `state.history` (what changed today), used later for the monthly report.
9. Returns a **new** `GameState` object (the engine never mutates the state it's given — this keeps React's state updates predictable and makes the engine easy to unit test).

A simplified calendar is used: every month has 30 days, and every year has 12 months (360 days/year). This avoids leap-year/variable-month-length edge cases that add complexity without adding gameplay value in the MVP. It can be swapped for a real calendar later without touching any other system, since only `domain/country`'s calendar helper knows about day/month/year math.

## Monthly report system

`application/generateMonthlyReport.ts` exports `generateMonthlyReport(state: GameState): MonthlyReport`. It is called by `simulateDay` whenever `state.date.day` wraps back to 1 (i.e., a new month has started). It reduces the `DailyDelta[]` entries accumulated since the last report into a summary: total income, total expenses, net treasury change, population change, stability change, and any notable events. The resulting `MonthlyReport` is pushed onto `state.monthlyReports`, and `state.history` is cleared to start accumulating the next month's deltas.

## UI/simulation separation

`presentation/` never computes simulation values itself. Its two responsibilities are:

1. **Driving time**: `presentation/hooks/useGameClock.ts` is a `useEffect`-based hook that, once per interval (interval length depends on `speed`), calls `application/simulateDay.ts` and stores the resulting `GameState` in React state — but only while `isPaused` is false.
2. **Displaying state and forwarding actions**: components like `StatsPanel` or `ProjectsPanel` receive slices of `GameState` as props and render them. Components like `ActionsPanel` call `application/actions/*` functions (e.g., `buildFarm(state)`) when the player clicks a button, and hand the resulting new `GameState` back up to `App.tsx` to be stored.

`App.tsx` is the only place that owns the live `GameState` (via `useState`) and is the seam between `presentation/` and the rest of the app — it imports from `application/`, never directly from deep inside `domain/`.

## How future systems can be added

Because of the layering, most future features (see ROADMAP.md) follow the same recipe:

1. **New stat or resource** (e.g., "steel"): add it to `CountryStats`, add a `domain/steel/` module with its production/consumption rules, wire it into `simulateDay`, and add a line to `StatsPanel`.
2. **New player action** (e.g., "build a mine"): add a new file in `application/actions/`, following the same shape as `buildFarm.ts` (validate cost → deduct treasury → push a new `Project`).
3. **New system entirely** (e.g., trade, diplomacy, provinces): add a new `domain/<system>/` folder and a corresponding `application/` use case, without needing to touch unrelated domains. Multi-country play would mean `GameState` holds a collection of country objects instead of one, but the per-country rules in `domain/` stay the same.
4. **Persistence** (save/load): since `GameState` is a plain serializable object, this is a `presentation/` (or new `infrastructure/`) concern — serialize to `localStorage`/a file, no changes needed to `domain/` or `application/`.

The goal is that adding a feature almost always means *adding* a file, rarely *editing* several existing ones.
