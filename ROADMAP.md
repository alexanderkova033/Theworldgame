# Roadmap

This roadmap is intentionally staged: each version should be a playable, stable improvement over the last. Nothing here is a promise or a deadline — it's a map of plausible next steps.

## MVP (current)

- [x] Continuous day-by-day time system with pause/resume and 1x/2x/3x/5x speed.
- [x] Single-country simulation: treasury, population, food, industry, stability, army, research, popularity.
- [x] Player actions: build farm, build factory, build road, invest in education, recruit soldiers, raise/lower taxes, start research.
- [x] Construction/research projects that take in-game time and show progress.
- [x] Daily simulation ticks driving all systems.
- [x] Monthly reports.
- [x] Event log.
- [x] Clean/screaming architecture separating domain rules, use cases, and UI.

## Version 0.2 — Make it a real game loop

- [ ] Save/load (localStorage first; file export/import later).
- [ ] Basic win/lose-adjacent conditions or milestones (e.g., stability collapse consequences, population milestones).
- [ ] More granular construction: build queue/limits, cancel a project, multiple farms/factories with independent progress.
- [ ] Random events (positive and negative) that interrupt the steady simulation — droughts, trade booms, unrest, discoveries.
- [ ] Better balancing pass with data-driven constants (a single tunable config file, sanity-checked against long simulated playtests).
- [ ] Basic settings: difficulty, starting country size.

## Version 0.3 — Depth in existing systems

- [ ] Additional resources: steel, oil, coal, grain (beyond the abstract "food"/"industry" of the MVP).
- [ ] Technology tree: research points unlock discrete, named technologies with real effects instead of a generic multiplier.
- [ ] Political parties and government types, each with different bonuses/penalties.
- [ ] Elections: popularity determines whether the player's government (or a rival) stays in power.
- [ ] Laws: toggleable policies with trade-offs (beyond the tax slider).
- [ ] Rebellions: low stability can spawn an active rebellion mechanic, not just a passive risk.

## Version 0.4 — Beyond one isolated country

- [ ] Multiple countries simulated simultaneously (at least a few AI-controlled neighbors).
- [ ] Trade: import/export resources between countries, affecting prices and availability.
- [ ] Diplomacy: treaties, alliances, rivalries between countries.
- [ ] Provinces/map: split a country into regions with local stats instead of one national pool.
- [ ] Basic AI country behavior (simple heuristics, not full parity with the player).

## Long-term dream version

- [ ] Wars and fronts, if/when it makes sense to reintroduce a military layer with real depth.
- [ ] Rich AI countries with distinct personalities/strategies.
- [ ] Historical and custom scenarios (different starting years, map, or country setups).
- [ ] Deep political simulation: coalitions, factional infighting, ideology shifts.
- [ ] Full economic simulation: supply chains, market prices, private sector actors.
- [ ] Multiplayer or shared-world play (a much later, non-trivial architectural shift).

## Explicitly out of scope for now

To keep the MVP small, the following are deferred rather than partially built: a backend/server, multiplayer, real-world map data, and detailed military mechanics. These are revisited only once the core loop (time, economy, stability, construction) is solid and fun on its own.
