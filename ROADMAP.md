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
- [x] Fictional setting (a pre-1914-feeling continent) instead of a real historical war.
- [x] Visual map: 8 provinces, click-to-select, completed buildings shown as icons (national economy still one shared pool — see Version 0.2).
- [x] Permanent nation picker: choose Astravia, Caldenreich, or Veldoria on a start screen before the game begins; no way to change it afterward. The other two nations' territory shows on the map but isn't simulated yet (see Version 0.4).
- [x] Visual polish pass: serif display type, brass/gold accent palette, panel depth/shadows, gradient+shadow map rendering, shape-based building and stat icons.
- [x] Map-centric layout (map as the central canvas, side panels instead of everything stacked below it), a bigger world (extra unclaimed islands beyond the main continent), other nations rendered in their own colors instead of flat grey, and a real road network (lanes that visibly multiply per road built, not just a thicker line).
- [x] Development/Military/Taxes actions (and their stats) temporarily hidden from the UI to focus on the core build/food/economy loop — see "Deliberately paused" below.

## Deliberately paused (hidden, not deleted)

Removed from the UI on purpose while the basics get solid — the domain/application code for all of these is untouched, so bringing each back is a presentation-layer change, not a rebuild:

- [ ] Re-add Taxes actions (raise/lower) and the Popularity stat.
- [ ] Re-add Development actions (Invest in Education, Start Research) and the Research Points stat.
- [ ] Re-add Military actions (Recruit Soldiers) and the Army Strength stat, plus its existing map marker.

## Version 0.2 — Make it a real game loop

- [ ] Split the economy per-province: each province gets its own local stats (food, industry, etc.) instead of one national pool, so *where* you build actually matters mechanically, not just visually.
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

- [ ] Simulate the two non-player nations too (Caldenreich/Veldoria or Astravia, whichever the player didn't pick) instead of just displaying their territory.
- [ ] Trade: import/export resources between nations, affecting prices and availability.
- [ ] Diplomacy: treaties, alliances, rivalries between nations.
- [ ] Basic AI nation behavior (simple heuristics, not full parity with the player).
- [ ] Turn the decorative islands (Kestrel Isles, Solmere, Vashtel Cay) into real, ownable territory — new nations to play as, or land the player's nation can colonize/settle.

## Long-term dream version

- [ ] Wars and fronts, if/when it makes sense to reintroduce a military layer with real depth.
- [ ] Rich AI countries with distinct personalities/strategies.
- [ ] Historical and custom scenarios (different starting years, map, or country setups).
- [ ] Deep political simulation: coalitions, factional infighting, ideology shifts.
- [ ] Full economic simulation: supply chains, market prices, private sector actors.
- [ ] Multiplayer or shared-world play (a much later, non-trivial architectural shift).

## Explicitly out of scope for now

To keep the MVP small, the following are deferred rather than partially built: a backend/server, multiplayer, real-world map data, and detailed military mechanics. These are revisited only once the core loop (time, economy, stability, construction) is solid and fun on its own.
