# The World Game

A browser-based country-building strategy game, inspired by *Hearts of Iron IV* but about **economy, housing, population and politics** rather than war.

Time flows continuously, day by day. You pause, resume and speed up time while keeping your people fed, housed, employed and warm, and your government popular enough to win the next election.

You govern one of three fictional nations on an invented continent, in a period that feels like the years just before 1914: steam, rail, early factories. Nothing here is a real place or history.

## What the game is

- **Choose a nation and a party.** Astravia, Caldenreich or Veldoria, then one of its parties. Both are permanent for the game.
- **Build across your provinces.** Farms, factories, roads, housing, granaries, canneries and schools, each capped per province. Every province has its own people, homes and jobs, and people move toward free homes and work.
- **Trade for what your land lacks.** Terrain produces wood, ore, grain or fish; coal heats homes in winter. A supply-and-demand market sells the rest.
- **Govern.** Set taxes, hold rallies, court factions, take loans, hire scientists and police, and answer decisions as they arrive.
- **Choose a direction.** A Laws tree and a Research tree, each with four branches of three paths. Picking a path closes the others for good.
- **Win elections.** One comes every 18 months. The first needs 50% support, the second 54%, the third 58%. Lose one and the game ends; win three in a row and you've won. If stability hits zero, the government collapses.

The army and recruitment were removed on purpose: they had no reachable UI. See [ROADMAP.md](ROADMAP.md) for where the game is headed.

## How to install and run it

You need [Node.js](https://nodejs.org/) (version 18 or later is recommended).

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

Other useful commands:

```bash
npm run build     # Type-check and build a production bundle
npm run preview   # Preview the production build locally
npm run lint      # Run the linter
npm test          # Run the tests (tree shape and scripted balance games)
```

## Basic controls

- **Start screen**: pick a nation (a card or the map), then a party. Three save slots let you come back later.
- **Top bar**: the date, pause/resume and speed (1x, 2x, 3x, 5x), your key stats, and the tabs.
- **Map**: click one of your provinces to build there and see how it's doing. Click an island to charter a venture.
- **Tabs**: Build (buildings, people), Money (budget with taxes and loans, market), Politics (support, unrest with police, abroad), Laws, Research and Reports. Every thing lives in exactly one place.
- **Advisor strip**: the two or three things that need you most right now. Click one to go straight there.

## Project structure

The code follows a **screaming architecture**: folders are named after game concepts, not technical roles, and dependencies only point inward (UI → application → domain, never back out).

```
src/
  domain/            The rules of the world. Pure logic, no React, no I/O.
    country/            GameState, stats and the calendar.
    economy/ food/ industry/ roads/ housing/ labour/ population/
                        The daily rules for each part of the country.
    provinces/          Map geometry, per-province people, and migration.
    construction/ maintenance/
                        Projects under way, and buildings wearing out.
    resources/ market/  Terrain output, and supply-and-demand prices.
    politics/ parties/  Popularity, political power, factions, elections, the rival.
    laws/ research/ policy/ synergy/
                        The two trees, the rules they share, and links between them.
    decisions/ randomEvents/ unrest/ diplomacy/ expeditions/ loans/ workforce/ nations/ ledger/
    constants.ts        Every tunable number.

  application/        Use cases that combine domain rules.
    simulateDay.ts       The daily tick: calls each rule in order.
    startNewGame.ts      Builds the opening GameState.
    actions/             One file per player action.
    get*.ts              Read models for the UI (advisor, forecasts, province overview...).

  presentation/        React UI. Depends on domain and application, never the reverse.
    hooks/               The game clock and save slots.
    components/          Screens, panels, the map and icons.
    audio/               Sound effects.
  App.tsx              Wires the simulation and the clock to the UI.

tests/                 Vitest: tree shape, and scripted three- to five-year games.
```

See [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) for the reasoning behind this layering.

## Documentation

- [GAME_DESIGN.md](GAME_DESIGN.md): the game's systems and how they fit together.
- [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md): the code architecture.
- [ROADMAP.md](ROADMAP.md): what has shipped and what might come next.
- [TODO.md](TODO.md): the pre-commit checklist and known rough edges.
