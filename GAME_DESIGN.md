# Game Design

## Core concept

The World Game is a single-country nation-building simulator. Instead of fighting wars, the player's main job is to grow their country's economy, infrastructure, and population while keeping their government stable and popular.

Time moves continuously and automatically, one in-game day at a time, rather than in discrete player turns. The player reacts to a running simulation: queue up buildings and policies, then watch (and periodically adjust) how the country evolves over months and years.

The intended feel is closer to a management/economy game (think city-builder or *Democracy*) wearing the visual language of a grand strategy game.

## Main stats/resources

Every country tracks the following core stats (see `CountryStats` in `src/simulation/types.ts`):

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

The MVP models one country only. Multi-country play is a roadmap item.

## Time system

- The game clock advances one **day** at a time. A day is the smallest simulation unit ("tick").
- The player can **pause** and **resume** the clock at any time; while paused, nothing changes.
- The player can set a **speed**: 1x, 2x, 3x, or 5x, which controls how many real-world milliseconds pass per in-game day (higher speed = shorter real time per day).
- Every 30 in-game days is treated as one **month** for reporting purposes (a simplified calendar, not real calendar months — see TECHNICAL_DESIGN.md for why).
- At the start of a new month, a **monthly report** is generated summarizing the previous month's income, expenses, and stat deltas.

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
- Multiple projects can run at once; there is no hard limit in the MVP (a queue/limit system is a roadmap item).

## Stability, taxes, population, army, and research interactions

These systems are intentionally simple in the MVP but designed to be tuned and expanded later:

- **Taxes**: Higher tax rate → more income, but lower popularity over time. Popularity slowly drifts back toward a neutral baseline when taxes are moderate.
- **Food**: Population consumes food daily. If food stock runs low or goes negative, stability drops. Building farms is the main way to keep up with a growing population.
- **Stability**: Falls when food is scarce or popularity is very low. Very low stability increases the risk of a "collapse" event (early MVP: this is logged as a warning; full collapse consequences are a roadmap item).
- **Population**: Grows slowly when food and stability are both healthy; growth stalls or reverses under famine or unrest.
- **Army**: Recruiting soldiers costs treasury immediately and adds ongoing upkeep (a daily treasury cost). Army strength does not yet have a gameplay use beyond being a stat to manage (wars are a roadmap item).
- **Research**: Education investment and research points slowly increase the country's ability to complete research projects; research projects (once completed) are meant to unlock/improve future systems.

## Intended player experience

A session should feel like:

1. Start with a small, modest country: limited treasury, low industry, small population.
2. Queue a few early buildings (a farm or two, maybe a road) to establish a stable base.
3. Let time pass at increased speed while watching stats and the event log.
4. Periodically pause to react to problems (falling stability, food shortages, an unpopular tax rate) or to queue new projects.
5. Read monthly reports to understand macro trends (are we growing, stagnating, or declining?).
6. Gradually snowball: more industry funds more projects, more research unlocks more capability, and the country becomes larger and more complex to manage.

The MVP is deliberately small — one country, ~10 stats, ~7 actions — so that the core loop (watch time pass, react, grow) is solid before adding breadth like trade, diplomacy, or war.
