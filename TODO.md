# TODO

A practical, near-term checklist. For bigger-picture future ideas, see [ROADMAP.md](ROADMAP.md).

## MVP build checklist

- [x] Project scaffold (Vite + React + TypeScript).
- [x] Documentation: README, GAME_DESIGN, TECHNICAL_DESIGN, ROADMAP, TODO.
- [x] Domain layer: types + rules for country, economy, population, food, industry, roads, stability, politics, army, research, construction.
- [x] Application layer: `simulateDay`, `generateMonthlyReport`, `startNewGame`, and one file per player action.
- [x] Presentation layer: `useGameClock` hook, `TopBar`, `StatsPanel`, `ActionsPanel`, `ProjectsPanel`, `ReportsPanel`, `EventLog`, `App.tsx`.
- [x] Wire everything together and confirm `npm run dev` runs a playable loop.
- [x] Basic balancing pass so the game doesn't collapse or trivially snowball in the first few in-game years.

## Known rough edges / near-term follow-ups

- [ ] No save/load yet — refreshing the page resets the game. (Planned for v0.2.)
- [ ] No hard cap on simultaneous projects — a player could queue many at once. Acceptable for MVP, worth revisiting with a build queue in v0.2.
- [ ] Stability "collapse" is currently just a logged warning event, not a real consequence. Full collapse mechanics are a v0.2+ item.
- [ ] Balancing numbers in `domain/constants.ts` are a first pass, not deeply playtested — expect them to need tuning as more people play.
- [ ] No automated tests yet. Domain layer is pure functions and should be straightforward to unit test — worth adding before the codebase grows further.
- [ ] No mobile/responsive layout pass — designed for desktop browser widths first.
- [ ] No accessibility pass (keyboard navigation, ARIA labels) yet.

## Process reminders

- New stats/systems get their own `src/domain/<name>/` folder — don't bolt new logic onto an unrelated module.
- New player actions get their own file in `src/application/actions/` — keep one action's logic self-contained.
- Keep `domain/` and `application/` free of React imports; if a function needs `useState` or DOM access, it belongs in `presentation/`.
