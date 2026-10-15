# Game Design

## Core concept

The World Game is a single-country nation-building simulator. Instead of fighting wars, you grow your country's economy, housing and population while keeping your government stable and popular enough to keep winning elections.

Time moves continuously, one in-game day at a time, rather than in turns. You react to a running simulation: order buildings, pass laws, steer research, then watch (and adjust) how the country evolves over months and years.

The intended feel is closer to a management game (a city-builder, or *Democracy*) wearing the visual language of a grand strategy game, set in a hand-coloured ledger.

## Setting

An invented continent in a period that *feels* like the years just before 1914: steam and rail, early factories, schools spreading, and tension in the background. Nothing is tied to a real country or history, so the map, nations and events can be designed freely.

Before play you choose one of three nations (**Astravia**, **Caldenreich** or **Veldoria**) and then one of its parties to lead. Both choices are permanent for that game. The other two nations are on the map with their own governments, which you can lean on but not run.

The currency is the **Crown** (`Cr`).

## How a game is won or lost

- **General elections** come every 18 months. You need at least 50% popularity to win.
- **Lose an election** and the opposition takes power: the game is over.
- **Win three in a row** and your party has won outright. A careful game takes about four and a half in-game years.
- **Stability at zero** is a collapse: order breaks down and the government falls.

## Main stats

| Stat | Meaning |
|---|---|
| **Treasury** | Money to spend. Taxes and industry fill it daily; building, wages, rallies and loan interest drain it. |
| **Population** | People, province by province. They need food, homes, work and, in winter, heat. |
| **Food** | The national stock. Farms grow it (more in autumn, much less in winter); everyone eats about one a day. |
| **Industry** | Output from working factories. Raises income and unlocks the later labour laws. |
| **Stability** | Order, 0 to 100. Falls with hunger, homelessness, cold, debt and low support. |
| **Popularity** | Support for your government, 0 to 100: a weighted average of how each faction feels about you. |
| **Political power** | Builds up daily, faster when you're popular. Spent on laws, rallies, courting a faction, crackdowns and pressure abroad. |

## Map and provinces

Sixteen provinces on one continent, each nation holding four to six, plus three unclaimed islands offshore. Every province has its own people, homes and jobs. Each day some of the homeless and jobless move to provinces with free homes and open work; unrest puts people off a province.

You build in whichever of your provinces is selected. Each building type is capped per province, so growth means spreading out:

| Building | Cost | Does |
|---|---|---|
| Farm | 800 Cr + wood | Grows food. Needs workers. |
| Factory | 1,600 Cr + ore | Adds industry. Needs workers. |
| Road | 450 Cr + ore | Speeds the economy; drawn as a road to the capital. |
| Housing | 350 Cr + wood | Homes for people. |
| Granary | 900 Cr + wood | Turns grain into food over time. |
| Cannery | 1,100 Cr + ore | Turns fish into food. |
| School | 400 Cr + wood | Speeds research and allows more scientists. |

Construction pays part of the price when ordered and the rest during the build. Buildings wear out at random and need repairs.

## Resources and the market

Each province's terrain produces a raw resource daily: forest gives **wood**, hills **ore**, plains **grain**, coast **fish**. **Coal** heats homes in winter. No nation has every terrain, so you trade.

The market holds a stock of every good, and prices follow how scarce it is. Buying pays a markup over the mid price (less with a coastal port); selling gets a little over half of it. Daily taxes and industry are meant to be your living; the market fills gaps.

You can also take loans in batches. Interest compounds daily, and heavy debt costs stability and support.

## Politics

- **Taxes** are a lever: more money, less support above the rate people accept.
- **Factions** each have their own approval; your popularity is their weighted average.
- **Rallies** lift every faction a little; **courting** lifts one a lot; a **crackdown** restores order at a cost in support.
- A **rival party** campaigns against you, and **decisions** arrive as letters asking you to choose.
- **Foreign affairs**: pressure a neighbour's election toward the party you back. A friendly government there means better trade.

## Laws and research

Both are trees with four branches. Each branch has one shared root and then three paths; choosing a path closes the other two for good. Some laws and research reinforce each other.

- **Laws** (labour, sustenance, order, revenue) cost political power and Crowns and go to a vote. Your party and the rival take stances that move the odds. A law also needs the country to reach a stat first, such as a population, a stock of food or a number of factories, and the game says how to get there.
- **Research** (industry, agriculture, administration, housing) has no vote and no price. You choose the direction, and each area progresses daily from its buildings, its scientists and your schools.

## Unrest

Falling stability brings stages before collapse: discontent slows industry, strikes stop factories, riots wreck buildings. Police soften strikes and riots, and a crackdown pulls the country back a stage.

## Time

- One **day** is one tick. Pause, or run at 1x, 2x, 3x or 5x.
- The calendar is simplified: 30-day months, 12 months a year.
- Each month ends with a **report** that explains why the numbers moved (the ledger).
- A **random world event** lands every 6 months.
- At higher speeds the game pauses itself when something dangerous happens for the first time in a season.

## Intended player experience

1. Start small: a modest treasury, a loan to consider, and a few buildings.
2. Keep people fed, housed, employed and warm, trading for what your land doesn't produce.
3. Pick a law path and a research direction that suit your nation and party.
4. Watch support before each election, and spend political power when it matters.
5. Read the reports to see why things moved, then adjust.

The game stays deliberately small: one country to run, a handful of buildings, and two trees. Breadth (simulated neighbours, war) waits until this loop is solid and fun.
