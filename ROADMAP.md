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

Removed on purpose: the army and recruitment. It had no reachable UI and was dead weight in the state and the map. It comes back only with real depth, as the last step of the road below.

## The road ahead

The game is about both governing a country and power across the map. Each step leaves a better game on its own and sets up the next; the military comes last, once there is something real to fight over.

1. **Rough edges in what is there.**
   - [ ] A use for political power when a player only researches (see TODO.md).
   - [x] Objectives that lead somewhere: each one still to do opens the window where it is done.
   - [x] Research paths reopen: a year after an area finishes a path, it may take up another.
2. **Rebellions.** Riots in one province grow into an uprising to put down or win back. Conflict without an army, and the first step from police towards soldiers.
   - [x] An uprising as its own state in a province: seized workplaces, no taxes, rebel strength, and a militia to put it down.
   - [x] Demands and concessions: workers asking for a pay rise even in a decent province, a dispute if refused, and rebels' terms that end an uprising in peace.
   - [x] Spreading to the provinces next door, and a province that breaks away if left at full strength for a month.
3. **Settle the islands.** A scouted island can be settled and held like a province. Six islands, some peopled and some empty, no cap on settlements. Built in this order, each phase leaving a note in TODO.md for the next:
   - [x] Groundwork: six islands, each with a terrain, a trait, and locals or nobody; provinces and islands read as one kind of place.
   - [x] A. Settling an empty island: scout, found a settlement, and it becomes a province.
   - [x] B. The sea: harbours, a supply fee, settler ships, and each island's trait.
   - [x] C. Islands with people: settling one is a choice about its locals (buy land, live alongside, or drive them out).
   - [x] D. Colony politics: distance unrest; colonies can rise and break away like provinces.
   - [ ] E. The race: a neighbour can claim an unsettled island first (the bridge into step 4).
4. **Neighbours with economies of their own.**
   - [ ] Simulate the two neighbouring nations' economies, not just their elections.
   - [ ] Direct trade between nations once they have stockpiles.
   - [ ] Treaties, alliances and rivalries.
5. **A military with real depth.**
   - [ ] Garrisons and soldiers growing out of police and uprisings.
   - [ ] Borders and contested islands worth fighting over; wars and fronts.

Alongside the road, whenever they fit:

- [ ] Event chains, and events scoped to one province or terrain.
- [ ] Later production chains: steel or similar goods made from ore and coal.
- [ ] A setting for starting country size.

## Long-term dream version

- [ ] AI countries with distinct personalities.
- [ ] Historical and custom scenarios (different starting years, maps, or setups).
- [ ] Coalitions, factional infighting and ideology shifts.
- [ ] Multiplayer or a shared world (a much later, non-trivial change).

## Explicitly out of scope for now

A backend or server, multiplayer, and real-world map data. These are revisited only once the core loop is solid and fun on its own.
