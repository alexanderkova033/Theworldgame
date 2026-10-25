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

The game is about both governing a country and power across the map. Each step leaves a better game on its own and sets up the next; the military came last of the systems, once there was something real to fight over, and the campaigns follow it.

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
   - [x] E. The race: a neighbour can claim an unsettled island first (the bridge into step 4).
4. **Neighbours run by the computer.** Each neighbour is a country of its own with a computer ruler of its own temper. Built in this order:
   - [x] Groundwork: they live by the same numbers as you, a month at a time, and build by need and temper; the Neighbours page shows it.
   - [x] A. Their own voyages: each decides when it can afford settlers and wants an island, instead of the fixed schedule; islands they hold join their country.
   - [x] B. Relations: how each feels about you, moved by what you do.
   - [x] C. Trade: they offer by letter to buy or sell goods.
   - [x] D. Treaties: an island accord, and buying a claimed island back.
5. **A military with real depth.** Regiments are counters on the map, moved province to province and fighting where they meet (closer to HoI4 or WorldBox than to bars in a window). War reaches only islands and your own lost provinces, never a neighbour's mainland. The militia stays a separate, cheap home force for uprisings. Built in this order:
   - [x] Groundwork: the Army window, regiments raised, drilled, paid and marched on the map (over land, and by sea to your islands); the neighbours raise their own by temper.
   - [x] A. Garrisons: a regiment standing in a province holds down unrest and uprisings there, and steadies an island.
   - [x] B. Taking back a lost province: march in, and fight its rebels day by day.
   - [x] C. War over the islands: declare war, sail to an island a neighbour holds, besiege it; war weariness; peace by letter.
   - [x] D. The neighbours make war: a hostile, stronger neighbour may attack your islands, after a warning letter.
6. **A story for each country, and a calmer screen.** Each nation gets a campaign of its own, told through the chapters the game already has, and the rough edges left by steps 2 to 5 are closed first. One rule runs through the whole step: each thing is shown in one place. A campaign adds no window and no tab. Its story arrives as chapter letters and lives in the objectives box on the map. Built in this order, each phase leaving a note in TODO.md for the next:
   - [x] A. Borders that move. The frontier band is worked out from each nation's starting provinces (src/presentation/nationFrontiers.ts), so it still runs round a province that broke away. Work it out from the provinces the country holds now, `lostProvinceIds` taken out, and redraw when that list changes. The same fix covers ports: `nationHasPort` (domain/market/marketRules.ts) asks whether the country still holds a coast, not whether it started with one.
   - [x] B. Sea routes round the coast. A sea leg is drawn as a straight line (presentation/components/MapArmies.tsx) and can cross a neighbour's land. Route it through a few sea waypoints off each coast instead, so a ship's way reads as a ship's way. Drawing only: the days at sea stay as they are.
   - [x] C. One place for each thing. The rule: the top bar shows each headline figure once; a window shows it again only at the head of its own detail, never on its tab. Things shown twice or three times, each kept in the one place it belongs:
     - Support appeared on the nation's label, as the star in the top bar, on the Politics › Support tab, and in the chamber. The star keeps support, the nation's label now says what the election needs and when ("Needs 50% in 18 mo"), and the tab drops its badge.
     - The daily balance appeared in the top bar, on the Money › Budget tab and at the head of the budget. The tab drops its badge.
     - The order level appeared beside stability in the top bar and as a badge on the Politics › Unrest tab. The tab drops its badge (its icon still shows the level).
     - "What needs you": the "!" on Legend goes (the flags are on the map, and the legend still explains them). The advisor row stays the list of problems, Next problem walks the map's provinces, and a tab's "!" stays, since it says where in a window to look.
     - The full pass over every window, and what was left as it is, is written down in TODO.md.
   - [x] D. Smarter scripted players (tests/support/carefulPlayer.ts), so the measurements behind E and F are worth trusting: one that keeps a garrison on its islands at war, one that chooses Long Reign burdens instead of taking the first offered, and a careless one that really does lose a province (and wins it back).
   - [x] E. Losing an island stings, and trade matters. Measure with D, then: buying back an island costs more, and a neighbour won't sell one it settled within the last year (BUY_BACK_BASE_PRICE and treatyRules.ts). The neighbours keep stores of wood, ore and coal from their own land and offer them by letter, so trade is about more than food. Each change is measured and written up in TODO.md like the rest.
   - [x] F. Campaign groundwork. A chapter can belong to one nation. Story chapters sit between the chapters that open the game's systems and open nothing themselves, so every system still opens by the month it does today and the difficulty ladder holds. A story chapter can bring a letter with a choice (the decisions system, domain/decisions), a few objectives, and a line for the ending screen. A story beat can lead to the next one (the first event chains from "Alongside the road"). A party gets its own lines where the two parties of a nation would see things differently. No new window: the briefing letter and the objectives box carry it all.
   - [x] F2. Province crises. Trouble that strikes one province, chosen by its land and its state, about once a year in any nation: a letter naming it, a lasting condition there, and a few ways out, usually one that ends it for good. The river floods (plains and coast: farms ruined for the season, half its homes washed away; build a dike, rebuild as it was, or leave it), the seam runs out (hills: ore and coal stop for good and the works lose jobs; sink a deeper shaft, retool the works, or close the pits), the forest is felled bare (wood stops for two years; replant, or let it regrow), fever in the town (a crowded province; quarantine, send doctors, or let it spread), and the fishing grounds fail (coast; send the boats further out, or wait). Shown only as a mark on the province, a line on its card, and the letter.
   - [x] F3. Letters that matter. A story letter's choice can move one group of voters sharply, raise or take away buildings in a named province, set a province's order for years, lay a lasting effect on the country for a year or two, start an uprising or a crisis, and change which beat comes next.
   - [x] G. Astravia: the Harvest Republic, in eight beats (agreed 2026-10-22): the Founders' Promise (break up the Thornwick estates, or let the promise wait); the Marrow in Flood (the first crisis, set off on purpose); a Lean Year (open the granaries, sell abroad, or ration); the Coast Asks for a Say (a charter, or the coast stops paying taxes); the Island over the Water (settle among the Kestrel folk, or buy their fishing rights); the Thornwick Question (the new farmers prosper, or Thornwick rises, by the first choice); the Great Felling (a crisis on purpose: replant, or keep cutting and buy wood abroad); and Founding Day (a festival, or a school), with a line on the ending screen for each turn the story took. The Harvest Union and the Merchants' Assembly see the land question differently.
   - [x] H. Caldenreich: the Chancellor's Kingdom. An old kingdom proud of its schools and its order, with a king growing old. Outline: the king's speech sets out what the crown expects of your government; the academy asks for its share of a growing budget; the Duskhaven coal pits strike; the question of who comes after the king; at the end, a coronation, and what the new reign inherits. The Crown Loyalists and the Reform Circle want different things from the succession.
   - [ ] I. Veldoria: Smoke and Iron. A small country that industrialised first and meets its troubles first. Outline: the streets come early (its unrest chapter opens sooner, with a balance pass); the foundries want ore the country can't dig; Brindlewood's forests are cut faster than they grow; with so little land, the islands matter more to it than to anyone; at the end, the great exhibition of Veldoria's industry, and what it cost. The Ironworkers' Guild and the National Vanguard read the strikes differently.
   - [ ] J. Bring TECHNICAL_DESIGN.md up to date with everything above.

   The three outlines are a starting point: each campaign's letters are written and agreed before they are built. Each nation's campaign is its own phase with its own balance pass, so the three can be played and judged one at a time.

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
