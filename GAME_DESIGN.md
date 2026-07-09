# Game Design

## Core concept

The World Game is a single-country nation-building simulator. Instead of fighting wars, the player's main job is to grow their country's economy, infrastructure, and population while keeping their government stable and popular.

Time moves continuously and automatically, one in-game day at a time, rather than in discrete player turns. The player reacts to a running simulation: queue up buildings and policies, then watch (and periodically adjust) how the country evolves over months and years.

The intended feel is closer to a management/economy game (think city-builder or *Democracy*) wearing the visual language of a grand strategy game.

## Setting

The game takes place on an invented continent in a period that *feels* like the years just before 1914 — steam and rail infrastructure, early factories, telegraphs, expanding public education, and simmering great-power tension in the background. Nothing is tied to any real country or history: this sidesteps the real-world politics and research burden of a historical setting, avoids the (extremely crowded) WW2-strategy-game space, and means the map, nations, and events can be designed freely rather than constrained by real geography.

Before play begins, the player picks one of three nations sharing the continent — **Astravia**, **Caldenreich**, or **Veldoria** — at a start screen. This choice is permanent for that game; there is no way to switch nations mid-playthrough. The other two nations' territory is still visible on the map (so the world feels populated), but isn't yet controllable — playable AI neighbors are a roadmap item.

The currency is the **Crown** (shown as `Cr`), shared across the continent. Each nation controls a handful of the map's sixteen provinces (see "Map and provinces" below).

## Main stats/resources

Every country tracks the following core stats (see `CountryStats` in `src/domain/country/types.ts`):

| Stat | Meaning |
|---|---|
| **Treasury** | Money available to spend. Goes up from taxes/trade, down from upkeep and construction. |
| **Population** | Number of people. Grows slowly over time if food and stability are healthy. |
| **Food** | Stockpiled food. Produced by farms, consumed by population every day. |
| **Industry** | Industrial output capacity. Produced by factories; boosts income and construction speed. |
| **Stability** | How well-ordered the country is (0–100). Low stability risks unrest/collapse. |
| **Army Strength** | Military power, built from recruited soldiers. Costs upkeep. |
| **Research Points** | Accumulated science output, spent on research projects. |
| **Popularity** | Government approval (0–100). Affected by taxes, stability, and food shortages. |

The MVP simulates the player's chosen nation only — the other two nations exist on the map but aren't separately simulated yet. Playable/AI multi-nation simulation is a roadmap item.

**Scope note:** Army Strength, Research Points, and Popularity are still part of `CountryStats` and the simulation, but the actions that would let the player affect them (Recruit Soldiers, Invest in Education, Start Research, raise/lower taxes) are temporarily hidden from the UI while the core build/food/economy loop is being tuned. They're hidden together with their stats — see TODO.md for exactly what comes back and when.

## Map and provinces

The continent is divided into sixteen provinces, rendered as a stylized SVG map (an organic coastline with province borders, similar in spirit to a Paradox-style province map). These are a north/south or east/west split of the original eight regions (Redgate, Thornwick, Marrow Coast, Caldermoor, Ashford, Duskhaven, Veldshire, Brindlewood), so you'll see pairs like "North Redgate"/"South Redgate" sharing a name and a stretch of coastline. Each of the three nations controls four to six of them; the player's own territory is colored in their nation's crest color, with a star marking the capital. The other two nations render in *their* crest colors too (dimmed, non-interactive) rather than a flat "foreign" grey, so you can tell them apart at a glance. A few small unclaimed islands (Kestrel Isles, Solmere, Vashtel Cay) sit further out on the map — purely decorative for now, a hint that the world extends beyond the one continent. With sixteen provinces packed into the same coastline, the map supports scroll-to-zoom and click-and-drag panning so every label stays readable.

The player picks one of their own provinces before starting a build action ("Building in: Redgate — click the map to change"), and every completed farm, factory, or road is remembered as a small pictorial icon on the province it was built in. Roads are the exception: instead of a single icon, each road built adds a visible lane to an actual road line connecting that province back to the capital, so building more roads is always visibly different.

Provinces are geographic and visual in the MVP — **the national economy is still one shared pool** (treasury, food, industry, and so on are national totals, not per-province). Splitting the economy so each province has its own local stats is a natural next step, tracked in ROADMAP.md.

## Resources and trade

Inspired by *Catan*: each province's terrain determines a raw resource it produces every day, for as long as you own it — forest → **Wood**, hills → **Ore**, plains → **Grain**, coast → **Fish**. There's no dice roll; production is steady and automatic, but which terrains your nation happens to control still shapes what you have plenty of and what you're short on. A small map badge on each of your provinces shows what it produces, matching the terrain texture underneath.

This creates real asymmetry between the three nations: Astravia has no hills at all, so it can never produce Ore on its own; Veldoria has neither forest nor hills, so it's short on both Wood and Ore. Building costs treasury *and* a matching resource — a Farm needs Wood, a Factory and a Road both need Ore — so a nation without the right terrain has to trade to build at all.

Trading happens with "the continental market" (an abstract bank, not the other two nations directly — they aren't simulated yet, see above): any resource for any other, at a fixed rate, batched so one click moves a meaningful amount rather than one unit at a time. A nation that owns at least one coastal province has a **port** and trades at a better rate (2:1 instead of 4:1) — Catan's maritime trade, made automatic rather than tied to a specific dock.

## Time system

- The game clock advances one **day** at a time. A day is the smallest simulation unit ("tick").
- The player can **pause** and **resume** the clock at any time; while paused, nothing changes.
- The player can set a **speed**: 1x, 2x, 3x, or 5x, which controls how many real-world milliseconds pass per in-game day (higher speed = shorter real time per day).
- Every 30 in-game days is treated as one **month** for reporting purposes (a simplified calendar, not real calendar months — see TECHNICAL_DESIGN.md for why).
- At the start of a new month, a **monthly report** is generated summarizing the previous month's income, expenses, and stat deltas.
- Every **6 months**, a random world event fires — a mix of good and bad fortune (a bountiful harvest, a drought, a trade boom, civil unrest, a festival, a mineral strike, a timber blight) that nudges treasury, food, stability, or a resource up or down by a percentage. It's logged to the event log like anything else, colored by severity. Nothing the player does changes when the next one lands — it's a fixed cadence, not a random chance each day — so events are a predictable rhythm to plan around rather than a surprise that could strike on any given tick.

## Economy system

- **Income** comes from taxes on population and industry, scaled by the current tax rate.
- **Expenses** come from army upkeep and any active construction/research projects.
- Net treasury change each day = income − expenses.
- **Industry** increases the efficiency of income generation and shortens construction time.
- **Roads** provide a global "economic efficiency" multiplier that boosts income and reduces construction time, representing better logistics.

## Construction system

- The player starts **projects** (farm, factory, road, research, etc.) which cost treasury up front.
- Each project type has a fixed **duration** in in-game days (e.g., a factory takes 120 days).
- Projects show live progress (days elapsed / total days) in the Projects panel.
- When a project completes, its effect is applied permanently to the country (e.g., a completed farm permanently increases food production), and an event is logged.
- Multiple projects can run at once across different provinces — there's no limit on that.
- **Each individual province** does have a cap, though: at most 3 farms, 2 factories, and 5 roads per province (built *or* being built — queuing a 4th farm when 3 already exist is blocked the same as if all 3 were finished). This is what makes having sixteen smaller provinces matter mechanically, not just visually — a nation that wants more farms needs more provinces to spread them across, not just one province piled high.

## Stability, taxes, population, army, and research interactions

These systems are intentionally simple in the MVP but designed to be tuned and expanded later:

- **Taxes**: Higher tax rate → more income, but lower popularity over time. Popularity slowly drifts back toward a neutral baseline when taxes are moderate.
- **Food**: Every person consumes 1 food per day. If food stock runs low or goes negative, stability drops. Building farms is the main way to keep up with a growing population.
- **Stability**: Falls when food is scarce or popularity is very low. Very low stability increases the risk of a "collapse" event (early MVP: this is logged as a warning; full collapse consequences are a roadmap item).
- **Population**: Grows slowly when food and stability are both healthy; growth stalls or reverses under famine or unrest.
- **Army**: Recruiting soldiers costs treasury immediately and adds ongoing upkeep (a daily treasury cost). Army strength does not yet have a gameplay use beyond being a stat to manage (wars are a roadmap item).
- **Research**: Education investment and research points slowly increase the country's ability to complete research projects; research projects (once completed) are meant to unlock/improve future systems.

## Intended player experience

A session should feel like:

1. Start with a small, modest country: limited treasury, low industry, small population, a small stockpile of resources, and a handful of starting buildings scattered across the map.
2. Click a province on the map, then queue a few early buildings there (a farm or two, maybe a road) — checking that you have both the Crowns and the matching resource, trading at the market if you're short.
3. Let time pass at increased speed while watching stats and the event log.
4. Periodically pause to react to problems (falling stability, food shortages, an unpopular tax rate) or to queue new projects.
5. Read monthly reports to understand macro trends (are we growing, stagnating, or declining?).
6. Gradually snowball: more industry funds more projects, more research unlocks more capability, and the country becomes larger and more complex to manage.

The MVP is deliberately small — one country, ~10 stats, ~7 actions — so that the core loop (watch time pass, react, grow) is solid before adding breadth like trade, diplomacy, or war.
