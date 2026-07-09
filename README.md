# The World Game

A browser-based country-building strategy simulator, inspired by *Hearts of Iron IV* but focused on **economy, infrastructure, population, politics, and long-term national growth** rather than war.

Time flows continuously, day by day, instead of turns. You pause, resume, and speed up time while managing your country's treasury, food supply, industry, stability, and more.

This project is an **MVP (minimum viable product)** — a small, working foundation that is meant to be expanded over time. See [ROADMAP.md](ROADMAP.md) for where it's headed.

## What the game is

You govern a single country. Every in-game day, the simulation updates your stats automatically:

- Farms grow food, factories grow industry and income, roads improve efficiency.
- Taxes fund your treasury but affect how popular your government is.
- Your population needs food and stability to stay content.
- You can construct buildings, invest in education, recruit soldiers, and start research — all of which take real in-game time to complete.
- At the end of each in-game month, you get a report summarizing what happened.

There is no win/lose condition yet. The current goal is to build and manage a stable, growing nation.

## How to install and run it

You need [Node.js](https://nodejs.org/) (version 18 or later is recommended).

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Then open the URL Vite prints in your terminal (usually `http://localhost:5173`).

Other useful commands:

```bash
npm run build     # Type-check and build a production bundle
npm run preview   # Preview the production build locally
npm run lint      # Run the linter
```

## Current features (MVP)

- Continuous day-by-day time system with a real in-game calendar (year/month/day).
- Pause / resume and speed controls (1x, 2x, 3x, 5x).
- Daily simulation ticks that update the economy, population, and stability.
- Monthly reports summarizing income, expenses, and stat changes.
- An event log that records important happenings (buildings finished, low food, low stability, etc).
- Player actions: build farms, build factories, build roads, invest in education, recruit soldiers, adjust taxes, start research.
- Construction and research projects that take in-game time and show live progress.
- A single-country simulation with core stats: treasury, population, food, industry, stability, army strength, research points, and government popularity.

See [GAME_DESIGN.md](GAME_DESIGN.md) for the full design and [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) for how it's built.

## Basic controls

- **Pause / Resume** — stop or continue the flow of time.
- **1x / 2x / 3x / 5x** — change how fast days pass while unpaused.
- **Actions panel** — spend treasury/resources to start a building, research, or policy change.
- **Tax slider/buttons** — raise or lower the tax rate, trading income for popularity.
- Everything else (food, income, stability, etc.) updates automatically as time passes.

## Project structure

The code follows a **clean, screaming architecture**: folders are named after game concepts (`economy`, `population`, `construction`, `politics`...), not technical roles, and dependencies only point inward (UI → application → domain, never back out).

```
src/
  domain/            The rules of the world. Pure logic, no React, no I/O.
    country/            GameState & GameDate types — the shape of a country.
    economy/            Income/expense/treasury rules.
    population/         Population growth/decline rules.
    food/               Food production & consumption rules.
    industry/            Industry output rules.
    roads/               Economic efficiency rules from infrastructure.
    stability/           Stability gain/loss rules.
    politics/            Tax rate & popularity rules.
    army/                Recruitment & upkeep rules.
    research/            Research point accumulation rules.
    construction/        Project types + progress/completion rules.
    constants.ts         Tunable balancing numbers shared by domain rules.

  application/        Use cases. Orchestrates domain rules into meaningful actions.
    simulateDay.ts       The daily tick use case (calls each domain rule in order).
    generateMonthlyReport.ts
    startNewGame.ts      Builds the initial GameState for a new game.
    actions/             One file per player action (buildFarm, setTaxRate, ...).

  presentation/        React UI. Depends on domain + application, never the reverse.
    hooks/
      useGameClock.ts     Drives the day-by-day loop (pause/resume/speed).
    components/
      TopBar.tsx          Date display, pause/resume, speed controls.
      StatsPanel.tsx      Country stats readout.
      ActionsPanel.tsx    Buttons/controls for player actions.
      ProjectsPanel.tsx   Active projects and progress bars.
      ReportsPanel.tsx    Monthly report history.
      EventLog.tsx        Scrolling log of important events.
    App.tsx              Wires simulation state + hook to the UI panels.

  main.tsx             React entry point.
  index.css            Global styles.
```

See [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) for the full rationale behind this layering.

Documentation:

- [GAME_DESIGN.md](GAME_DESIGN.md) — the game's design: stats, systems, and intended player experience.
- [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) — the code architecture and how systems fit together.
- [ROADMAP.md](ROADMAP.md) — planned versions and long-term feature ideas.
- [TODO.md](TODO.md) — a practical checklist of remaining/near-term tasks.
