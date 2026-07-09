# The World Game

A browser-based country-building strategy simulator, inspired by *Hearts of Iron IV* but focused on **economy, infrastructure, population, politics, and long-term national growth** rather than war.

Time flows continuously, day by day, instead of turns. You pause, resume, and speed up time while managing your country's treasury, food supply, industry, stability, and more.

You govern one of three fictional nations sharing an invented continent, in a period that feels like the years just before 1914 — steam, rail, early factories, and rising tension in the background. Nothing here is a real place or history, which keeps the game free of both real-world politics and the (very crowded) WW2-strategy-game space.

Before the clock starts, you choose your nation — **Astravia**, **Caldenreich**, or **Veldoria** — on a start screen. That choice is permanent for the game; there's no way to switch nations mid-playthrough.

This project is an **MVP (minimum viable product)** — a small, working foundation that is meant to be expanded over time. See [ROADMAP.md](ROADMAP.md) for where it's headed.

## What the game is

You govern one nation, made up of four to six provinces on a sixteen-province continent (the rest belongs to the other two nations, shown in their own colors but not yet playable — plus a few unclaimed islands further out, purely decorative for now). Every in-game day, the simulation updates your stats automatically:

- Farms grow food (each person eats 1 food/day — build enough farms to keep up), factories grow industry and income, roads improve efficiency and visibly connect your provinces to your capital.
- Every province also produces a raw resource based on its terrain — forest → Wood, hills → Ore, plains → Grain, coast → Fish (*Catan*-inspired) — and buildings cost that resource as well as Crowns. No nation has every terrain, so you'll need to trade with the continental market (better rates if you own a coastal "port" province) to build everything you want.
- Building happens in whichever province you've selected on the map.
- At the end of each in-game month, you get a report summarizing what happened.

**Currently trimmed down on purpose:** taxes, education/research, and recruiting soldiers are temporarily removed from the Actions panel (and their stats hidden) while the core build/economy/food loop gets nailed down. The underlying code for them still exists — see ROADMAP.md — they're coming back once the basics feel right.

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

- A start screen where you permanently choose one of three nations (Astravia, Caldenreich, Veldoria) — pick by clicking a card or clicking your nation directly on a preview map that shows the whole world, including the other nations and a few unclaimed islands.
- A map-centric layout: the map is the big central view, with stats/actions and projects/reports/events as scrollable side panels flanking it — not stacked underneath.
- Continuous day-by-day time system with a real in-game calendar (year/month/day).
- Pause / resume and speed controls (1x, 2x, 3x, 5x).
- Daily simulation ticks that update the economy, population, and stability.
- Monthly reports summarizing income, expenses, and stat changes.
- An event log that records important happenings (buildings finished, low food, low stability, etc).
- A stylized SVG map: your nation's territory is colored and clickable (with a star on your capital), the other two nations render in their own colors (dimmed, non-interactive), and a few decorative islands sit further out. Click a province to select it, then build there; completed buildings show up as small pictorial icons, and roads render as an actual dashed road network fanning out from your capital.
- Player actions: build farms, build factories, build roads — each capped per province (3 farms / 2 factories / 5 roads), so growth means spreading out across your territory, not piling everything into one spot. (Taxes/education/research/military are temporarily hidden — see "What the game is" above.)
- Construction projects that take in-game time and show live progress.
- A single-nation simulation with core stats: treasury, population, food, industry, and stability — each with its own pictorial icon in the stats panel.
- Raw resources (Wood, Ore, Grain, Fish) produced daily by your provinces' terrain, spent on building, and tradeable with the continental market — with a better rate if your nation has a coastal port.

See [GAME_DESIGN.md](GAME_DESIGN.md) for the full design and [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) for how it's built.

## Basic controls

- **Start screen** — pick your nation (card or map click). Permanent for the game — there's no undo.
- **Pause / Resume** — stop or continue the flow of time.
- **1x / 2x / 3x / 5x** — change how fast days pass while unpaused.
- **Map** — click one of your own provinces to choose where your next building goes.
- **Actions panel** (left sidebar) — spend treasury + a matching resource to build a farm, factory, or road in the selected province.
- **Trade panel** (left sidebar) — exchange one resource for another with the market.
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
    provinces/           Map geometry (8 provinces) + placed-building records.
    nations/             The 3 playable nations and which provinces each owns.
    resources/           Wood/ore/grain/fish: terrain production + market trade rates.
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
      StartScreen.tsx     Permanent nation picker, shown before the game starts.
      TopBar.tsx          Nation name, date display, pause/resume, speed controls.
      MapPanel.tsx        Clickable SVG map of your nation's provinces.
      StatsPanel.tsx      Country stats readout, with an icon per stat.
      ResourcesPanel.tsx  Wood/Ore/Grain/Fish readout.
      ActionsPanel.tsx    Buttons/controls for player actions.
      TradePanel.tsx      Give/receive resource trade with the market.
      ProjectsPanel.tsx   Active projects and progress bars.
      ReportsPanel.tsx    Monthly report history.
      EventLog.tsx        Scrolling log of important events.
      BuildingIcon.tsx    Shared shape-per-building-type glyph (map + legend).
      StatIcon.tsx        Shared glyph-per-stat icon (stats panel).
      ResourceIcon.tsx    Shared glyph-per-resource icon (map, resources, trade).
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
