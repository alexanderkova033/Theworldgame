# Roadmap

This roadmap is intentionally staged: each step should leave a playable, stable game. Nothing here is a promise or a deadline. It's a map of plausible next steps.

## Shipped

The early MVP (a day-by-day clock, one nation, farms, factories and roads, monthly reports) has grown into a full game loop:

- [x] Choose one of three fictional nations and a party to lead it. The choice is permanent.
- [x] Sixteen provinces on one continent, each with its own people, homes and jobs. People move between provinces toward free homes and work.
- [x] Buildings: farms, factories, roads, housing, granaries, canneries and schools, each capped per province. Buildings wear out and need repairs.
- [x] Resources (wood, ore, coal, grain, fish) from terrain, and a market with supply-and-demand prices. A coastal port buys cheaper.
- [x] Seasons and heating: winter cuts farm output and burns fuel.
- [x] Taxes as a lever, with popularity reacting to them. Loans with compounding interest.
- [x] Popularity split across factions, political power, rallies, courting a group and crackdowns.
- [x] General elections every 18 months. Losing one ends the game; three wins in a row is outright victory. Stability reaching zero is a collapse.
- [x] A Laws tree and a Research tree: four branches each, three paths per branch, and choosing a path closes the other two for good. Laws are voted on, and both parties take stances. Some laws and research reinforce each other.
- [x] Unrest in stages (discontent, strikes, riots) before collapse, and police to soften it.
- [x] Decisions that arrive as letters and ask for a choice, random world events, and a rival party that campaigns against you.
- [x] Foreign affairs: lean on a neighbour's election. A friendly government there means better trade.
- [x] Scientists and police on the payroll.
- [x] Ventures to three unclaimed islands for one-time rewards (opened from the map).
- [x] Three named save slots, an advisor strip for "what needs you now", and a ledger that explains why each number moved.
- [x] Scripted balance tests: a careful player survives and wins, an idle one loses, and no single path wrecks a country.

Removed on purpose: the army and recruitment. It had no reachable UI and was dead weight in the state and the map. It comes back only with real depth (see "Long-term").

## Next: depth in what's already there

- [ ] A sink or a use for political power when a player only researches (see TODO.md).
- [ ] Rebellions: let riots grow into an active uprising in one province, not just a stage.
- [ ] Event chains, and events scoped to one province or terrain.
- [ ] Later production chains: steel or similar goods made from ore and coal.
- [ ] Settings: difficulty and starting country size.

## Later: beyond one country

- [ ] Simulate the two neighbouring nations' economies, not just their elections.
- [ ] Direct trade between nations once they have stockpiles of their own.
- [ ] Treaties, alliances and rivalries.
- [ ] Turn the islands into real territory to settle, instead of one-time rewards.

## Long-term dream version

- [ ] Wars and fronts, if a military layer with real depth ever makes sense.
- [ ] AI countries with distinct personalities.
- [ ] Historical and custom scenarios (different starting years, maps, or setups).
- [ ] Coalitions, factional infighting and ideology shifts.
- [ ] Multiplayer or a shared world (a much later, non-trivial change).

## Explicitly out of scope for now

A backend or server, multiplayer, real-world map data, and military mechanics. These are revisited only once the core loop is solid and fun on its own.
