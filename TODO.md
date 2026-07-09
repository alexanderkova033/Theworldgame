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
- [x] Roads fixed to fan out as separate visible lanes per road built (plus a "×N" count badge past 5), since a single line only getting marginally thicker wasn't a visible enough change. Same fix applied to army: a crossed-swords marker + number now appears at the capital once you've recruited any soldiers. All 8 stat-panel icons upgraded from abstract shapes to pictorial models (coin stack, person, wheat sheaf, factory, shield, crossed swords, flask, star), and the 3 nation crests on the start screen got a thematic emblem each (wheat sheaf / book / gear).
- [x] Map made bigger and moved to the center of a new layout (side panels flank it, nothing stacked below anymore); other nations now render in their own crest colors instead of flat grey; 3 decorative islands added beyond the main continent; food rebalanced so 1 person eats 1 food/day (farms rebalanced to match); Development/Military/Taxes actions and stats hidden from the UI for now (code untouched, see ROADMAP.md's "Deliberately paused" section).
- [x] Catan-inspired resources: `domain/resources/` (Wood/Ore/Grain/Fish tied to terrain, produced daily per owned province), building costs now require a matching resource as well as Crowns, and a new Trade panel lets you exchange resources with the market at 4:1 (2:1 with a coastal port). `ResourcesPanel`, `TradePanel`, `ResourceIcon`, and a small per-province resource badge on the map are all new.
- [x] Simplified two duplicated patterns: `application/actions/createBuildAction.ts` is now the one place `buildFarm`/`buildFactory`/`buildRoad` share, and `presentation/components/iconShapes.ts` holds the `starPoints`/`cogPoints` math instead of it being copy-pasted between `StatIcon.tsx` and `StartScreen.tsx`.
- [x] Icons redone bigger and more literal (StatIcon/ResourceIcon are colorful mini-illustrations now, not small single-color glyphs) since the old ones were too small/abstract to read at a glance. Terrain textures made much bolder and extended to every province (not just owned ones), with hills changed from wavy lines to solid mound shapes since it looked too much like the coast pattern. The map also got zoom (scroll wheel, or +/−/Reset buttons) and pan (click-and-drag) — `MapPanel` now owns a `viewBox` as local camera state, with drag-vs-click disambiguated by a movement threshold so panning never accidentally reselects a province.
- [x] Random world events every 6 in-game months: `domain/randomEvents/` (8 events, mix of good/bad, affecting treasury/food/stability/a resource by a percentage), triggered from `simulateDay` via a new `isEveryNMonths` calendar helper, logged to the event log with the right severity color. Verified deterministically (events land on exactly day 180, 360, 540, 720...) and in the running UI.

## Known rough edges / near-term follow-ups

- [ ] No save/load yet — refreshing the page resets the game, including your nation choice. (Planned for v0.2.)
- [ ] Taxes, education/research, and recruiting soldiers are hidden from the UI on purpose (see ROADMAP.md). Don't be alarmed that `application/actions/taxActions.ts` etc. look unused — nothing currently imports them except `application/actions/index.ts`.
- [ ] The 3 decorative islands have no provinces and aren't ownable — purely visual for now (v0.4 item if they become real territory).
- [ ] The map is visual only — all provinces still draw from one national economic pool. Splitting per-province stats is the top v0.2 item.
- [ ] Trading is bank-only (a fixed-rate abstract market) — there's no direct nation-to-nation trade yet since the other two nations aren't simulated. That's a v0.4 item.
- [ ] Grain and Fish have no direct building cost yet — they're currently pure trade bait (convert them into Wood/Ore via the market). Intentional Catan-style asymmetry, not a bug, but worth a look once Development actions come back (e.g., research/education could plausibly cost Grain or Fish).
- [ ] The two nations you don't pick exist only as colored territory on the map — they aren't simulated, have no AI, and can't be interacted with. That's a v0.4 item.
- [ ] No hard cap on simultaneous projects — a player could queue many at once. Acceptable for MVP, worth revisiting with a build queue in v0.2.
- [ ] Stability "collapse" is currently just a logged warning event, not a real consequence. Full collapse mechanics are a v0.2+ item.
- [ ] Balancing numbers in `domain/constants.ts` are a first pass, not deeply playtested — expect them to need tuning as more people play.
- [ ] Random events are uniformly-random and always national in scope (no weighting toward rarer/bigger events, no per-province targeting) — see ROADMAP.md's v0.3 note for where this goes next.
- [ ] No automated tests yet. Domain layer is pure functions and should be straightforward to unit test — worth adding before the codebase grows further.
- [ ] No mobile/responsive layout pass — designed for desktop browser widths first.
- [ ] No accessibility pass (keyboard navigation, ARIA labels) yet — the map in particular relies on mouse clicks with no keyboard equivalent.

## Process reminders

- New stats/systems get their own `src/domain/<name>/` folder — don't bolt new logic onto an unrelated module.
- New player actions get their own file in `src/application/actions/` — keep one action's logic self-contained.
- Keep `domain/` and `application/` free of React imports; if a function needs `useState` or DOM access, it belongs in `presentation/`.
