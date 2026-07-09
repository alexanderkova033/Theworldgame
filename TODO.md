# TODO

A practical, near-term checklist. For bigger-picture future ideas, see [ROADMAP.md](ROADMAP.md).

## MVP build checklist

- [x] Project scaffold (Vite + React + TypeScript).
- [x] Documentation: README, GAME_DESIGN, TECHNICAL_DESIGN, ROADMAP, TODO.
- [x] Domain layer: types + rules for country, economy, population, food, industry, roads, stability, politics, army, research, construction, provinces, nations.
- [x] Application layer: `simulateDay`, `generateMonthlyReport`, `startNewGame(nationId)`, and one file per player action.
- [x] Presentation layer: `useGameClock` hook, `StartScreen`, `TopBar`, `MapPanel`, `StatsPanel`, `ActionsPanel`, `ProjectsPanel`, `ReportsPanel`, `EventLog`, `BuildingIcon`, `StatIcon`, `App.tsx`.
- [x] Wire everything together and confirm `npm run dev` runs a playable loop.
- [x] Basic balancing pass so the game doesn't collapse or trivially snowball in the first few in-game years.
- [x] Fictional setting (3 nations on one continent) and SVG province map, clickable and tied to where buildings get placed.
- [x] Permanent start-screen nation picker (card grid + clickable preview map); no in-game way to change nations.
- [x] Visual pass: serif display font, brass/gold palette, panel shadows/depth, map gradients + drop-shadow, shape-based building/stat icons.
- [x] Roads render as an actual dashed road network (capital hub → connected provinces, thicker with more roads) instead of a dot icon; provinces got decorative terrain textures (hills/forest/coast); building icons upgraded to pictorial (barn, chimney'd factory, book, flask).

## Known rough edges / near-term follow-ups

- [ ] No save/load yet — refreshing the page resets the game, including your nation choice. (Planned for v0.2.)
- [ ] The map is visual only — all provinces still draw from one national economic pool. Splitting per-province stats is the top v0.2 item.
- [ ] The two nations you don't pick exist only as colored territory on the map — they aren't simulated, have no AI, and can't be interacted with. That's a v0.4 item.
- [ ] No hard cap on simultaneous projects — a player could queue many at once. Acceptable for MVP, worth revisiting with a build queue in v0.2.
- [ ] Stability "collapse" is currently just a logged warning event, not a real consequence. Full collapse mechanics are a v0.2+ item.
- [ ] Balancing numbers in `domain/constants.ts` are a first pass, not deeply playtested — expect them to need tuning as more people play.
- [ ] No automated tests yet. Domain layer is pure functions and should be straightforward to unit test — worth adding before the codebase grows further.
- [ ] No mobile/responsive layout pass — designed for desktop browser widths first.
- [ ] No accessibility pass (keyboard navigation, ARIA labels) yet — the map in particular relies on mouse clicks with no keyboard equivalent.

## Process reminders

- New stats/systems get their own `src/domain/<name>/` folder — don't bolt new logic onto an unrelated module.
- New player actions get their own file in `src/application/actions/` — keep one action's logic self-contained.
- Keep `domain/` and `application/` free of React imports; if a function needs `useState` or DOM access, it belongs in `presentation/`.
