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
- [x] Visual map: 16 provinces, click-to-select, completed buildings shown as icons (national economy still one shared pool — see Version 0.2).
- [x] Permanent nation picker: choose Astravia, Caldenreich, or Veldoria on a start screen before the game begins; no way to change it afterward. The other two nations' territory shows on the map but isn't simulated yet (see Version 0.4).
- [x] Visual polish pass: serif display type, brass/gold accent palette, panel depth/shadows, gradient+shadow map rendering, shape-based building and stat icons.
- [x] Map-centric layout (map as the central canvas, side panels instead of everything stacked below it), a bigger world (extra unclaimed islands beyond the main continent), other nations rendered in their own colors instead of flat grey, and a real road network that visibly changes as roads are built, not just a slightly-thicker line.
- [x] Development/Military/Taxes actions (and their stats) temporarily hidden from the UI to focus on the core build/food/economy loop — see "Deliberately paused" below.
- [x] Catan-inspired raw resources: terrain produces Wood/Ore/Grain/Fish, buildings cost a matching resource alongside Crowns, and nations trade with the continental market (better rate with a coastal port). This pulled the "additional resources" idea forward from Version 0.3 below, scoped to bank trading rather than needing the other nations simulated first.
- [x] Random world events every 6 in-game months (droughts, trade booms, civil unrest, festivals, mineral finds, timber blight — a mix of positive and negative, hitting treasury/food/stability/resources). Pulled forward from Version 0.2 below.
- [x] The original 8 provinces split into 16 (same coastline and nation borders, just finer-grained), and a per-province build cap (3 farms / 2 factories / 5 roads) so growth means spreading across more territory, not piling everything into one province.
- [x] Build-action descriptions (what a Farm/Factory/Road actually produces, shown right on the button) and a food rebalance (farms no longer trivially oversupply the starting population) plus an Import Food option on the Trade panel for nations short on farmland.
- [x] A first, scoped step into two Version 0.3/0.4 ideas below: fixed-pair Laws (irreversible policy trade-offs, not yet a full toggleable tree) and scouting expeditions to the unclaimed islands (a one-time reward + "scouted" flag, not yet ownable territory).

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
- [ ] Better balancing pass with data-driven constants (a single tunable config file, sanity-checked against long simulated playtests).
- [ ] Basic settings: difficulty, starting country size.

## Version 0.3 — Depth in existing systems

- [ ] Later-era resources (steel, oil, coal) that consume the Catan-style raw resources (wood/ore) to produce, adding a production chain on top of the current flat terrain output.
- [ ] Technology tree: research points unlock discrete, named technologies with real effects instead of a generic multiplier.
- [ ] Political parties and government types, each with different bonuses/penalties.
- [ ] Elections: popularity determines whether the player's government (or a rival) stays in power.
- [ ] Laws: toggleable policies with trade-offs (beyond the tax slider) — a first, fixed set of mutually-exclusive law pairs already shipped in the MVP; this item is the fuller, freely-toggleable/expandable version.
- [ ] Rebellions: low stability can spawn an active rebellion mechanic, not just a passive risk.
- [ ] More random-event variety and weighting (rare vs. common events, event chains, events scoped to a specific province/terrain rather than always national).

## Version 0.4 — Beyond one isolated country

- [ ] Simulate the two non-player nations too (Caldenreich/Veldoria or Astravia, whichever the player didn't pick) instead of just displaying their territory.
- [ ] Direct nation-to-nation trade (not just the abstract market bank) once the other two nations are actually simulated and have their own resource stockpiles to trade from.
- [ ] Diplomacy: treaties, alliances, rivalries between nations.
- [ ] Basic AI nation behavior (simple heuristics, not full parity with the player).
- [ ] Turn the decorative islands (Kestrel Isles, Solmere, Vashtel Cay) into real, ownable territory — new nations to play as, or land the player's nation can colonize/settle. (The MVP already lets you scout them via a timed expedition for a one-time reward; this item is the fuller colonization/ownership version.)

## Long-term dream version

- [ ] Wars and fronts, if/when it makes sense to reintroduce a military layer with real depth.
- [ ] Rich AI countries with distinct personalities/strategies.
- [ ] Historical and custom scenarios (different starting years, map, or country setups).
- [ ] Deep political simulation: coalitions, factional infighting, ideology shifts.
- [ ] Full economic simulation: supply chains, market prices, private sector actors.
- [ ] Multiplayer or shared-world play (a much later, non-trivial architectural shift).

## Explicitly out of scope for now

To keep the MVP small, the following are deferred rather than partially built: a backend/server, multiplayer, real-world map data, and detailed military mechanics. These are revisited only once the core loop (time, economy, stability, construction) is solid and fun on its own.
