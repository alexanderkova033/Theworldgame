# Game Design

## Core concept

The World Game is a single-country nation-building simulator. Instead of fighting wars, you grow your country's economy, housing and population while keeping your government stable and popular enough to keep winning elections.

Time moves continuously, one in-game day at a time, rather than in turns. You react to a running simulation: order buildings, pass laws, steer research, then watch (and adjust) how the country evolves over months and years.

The intended feel is closer to a management game (a city-builder, or *Democracy*) wearing the visual language of a grand strategy game, set in a hand-coloured ledger.

## Setting

An invented continent in a period that *feels* like the years just before 1914: steam and rail, early factories, schools spreading, and tension in the background. Nothing is tied to a real country or history, so the map, nations and events can be designed freely.

Before play you choose a mode and a difficulty, then one of three nations (**Astravia**, **Caldenreich** or **Veldoria**) and then one of its parties to lead. Both choices are permanent for that game. The other two nations are on the map with their own governments, which you can lean on but not run.

The currency is the **Crown** (`Cr`).

## How a game is won or lost

- **General elections** come every 18 months. On Normal the first needs 50% support, the second 54%, the third 58%: voters ask more of a government the longer it governs. The vote counts support as election day begins, before that morning's campaign moves land.
- **Lose an election** and the opposition takes power: the game is over.
- **Win three in a row** and your party has won outright. A careful game takes about four and a half in-game years.
- **Stability at zero** is a collapse: order breaks down and the government falls.
- **After a loss** the end screen says how it happened: the number that failed over its last four months against the line it had to hold, the three causes that pulled it down most, and one thing to do differently.
- **Checkpoints.** The game is saved each time a chapter opens. After a loss you may go back to the start of that chapter, as often as the difficulty allows.

## The Long Reign

The second mode has no finish line. The game goes on until the party loses an election or the government collapses, and the measure is how long it lasted. It is built to end:

- **The line keeps rising.** Past the difficulty's third line, each election asks 2 more points of support (on Normal: 58%, 60%, 62%...).
- **Burdens of office.** Each election won, a letter offers two burdens and you must take one. From the third win on, a second is drawn by chance. Burdens are permanent and stack: Weary Voters (support drifts lower), The Rival's Machine, Lean Years, Ageing Works, Harder Winters, Growing Appetites, Short Tempers, A Stubborn Assembly, Dear Markets, Dear Builders, Bitter Hardship, Crowded Cities and Hollow Rallies (rallies and courting lift less). The burdens carried are listed in the slip on the map.
- **One life.** No checkpoints and no retries.
- **A record.** The longest reign on each difficulty is kept, and the end screen sets each reign against it.

Chapters still open as usual. The scripted players in `tests/reign.test.ts` keep it honest: a careful player on Normal outlasts Three Terms and is voted out after about 12 years, sooner on Hard.

## Difficulty

Four levels, chosen before the nation. Each changes only what its card says, and the scripted players in `tests/balance.test.ts` keep them apart: a careless player mostly wins on Easy and mostly loses from Normal up, and a careful one can still lose on Ruthless.

| Level | Election lines | Voters expect | Political power | Start | Rival | Bad luck | Retries |
|---|---|---|---|---|---|---|---|
| Easy (Steward) | 50, 52, 54% | less | +15% | 2,000 Cr | weaker | halved | 5 |
| Normal (Minister) | 50, 54, 58% | a little more | as is | nothing extra | as is | as is | 3 |
| Hard (Chancellor) | 52, 56, 60% | more | −15% | nothing extra | stronger | 1.5× | 1 |
| Ruthless (Iron Chancellor) | 54, 58, 62% | much more | −30% | half the food | much stronger | 2× | 0 |

"Bad luck" scales the losses from random events and how often buildings break down.

## Chapters

Systems arrive as they matter, and not before. A game opens with only building, taxes and loans. Each later system is shut, in the rules and not just the interface, until its chapter opens. A chapter opens on a trigger in play or by a fixed month at the latest, pauses the game, and arrives as a short briefing letter with one or two objectives. Every nation has the same chapters with the same latest months; what happens in play decides which comes first.

| Chapter | Opens | By month |
|---|---|---|
| The First Winter | at the start: build, tax, borrow | |
| The Exchange Opens | the market | 2 |
| The Assembly Sits | laws, once political power has built up | 6 |
| The Royal Society | research, scientists and schools | 9 |
| Know Your Voters | courting factions, when support runs close to the line | 13 |
| Trouble in the Streets | police and crackdowns, at the first unrest | 14 |
| Envoys Arrive | pressure abroad, once a neighbour campaigns | 15 |
| A Captain's Offer | ventures to the islands | 20 |

Open chapters and their objectives sit in a slip at the top right of the map; an objective still to do opens the window where it is done. Letters about a later system (a border incident, a general strike) wait for its chapter, and the advisor only suggests what is open.

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

Both are trees with four branches. Each branch has one shared root and then three paths; choosing a path closes the other two. For laws that is for good. In research it lasts until the path is finished: a year after its last step, the area may take up one of the paths it passed over, and over a long reign it can take all three.

Some laws and research come in **pairs**: with both in force, each does more. A chain-link mark on a node shows how much of its pair is in force (faint with neither, gilt with one, green with both), so the missing half is easy to find from either tree.

- **Laws** (labour, sustenance, order, revenue) cost political power and Crowns and go to a vote. Your party and the rival take stances that move the odds. A law also needs the country to reach a stat first, such as a population, a stock of food or a number of factories, and the game says how to get there.
- **Research** (industry, agriculture, administration, housing) has no vote and no price. You choose the direction, and each area progresses daily from its buildings, its scientists and your schools. A finished technology still rolls how well it turned out: one in five is a **breakthrough** worth half as much again, announced with its own gilt notice and bells, and one in five disappoints.

## Unrest

Falling stability brings stages before collapse: discontent slows industry, strikes stop factories, riots wreck buildings. Police soften strikes and riots, and a crackdown pulls the country back a stage.

**Uprisings.** A province that riots on its own for too long (30 days on Normal, 60 on Easy) rises against the government. Its farms, factories, roads, schools and food works are seized, it pays no taxes, and it drags national stability down twice as hard as a rioting province. Its homes stay with its people, so many drift away to find work. Rebel strength (0 to 100) says how hard it is to end: it grows by itself and with people sleeping rough there, fades while the country is calm (stability 45 or more), and is held down by police. **Militia** companies (200 Cr, then 2 Cr a day, up to 4) are sent in from Politics, Unrest; each order costs 15 political power and 2 support with every group, and each company wears 1.2 strength a day off. At zero the uprising is over and the buildings come back. One put down by force leaves the province aggrieved for half a year: it rises again after a third of the usual rioting, and stronger.

## Time

- One **day** is one tick. Pause, or run at 1x, 2x, 3x or 5x.
- The calendar is simplified: 30-day months, 12 months a year.
- Each month ends with a **report** that explains why the numbers moved (the ledger).
- A **random world event** lands every 6 months.
- At higher speeds the game pauses itself when something dangerous happens for the first time in a season.

## Intended player experience

1. Start small: a modest treasury, a loan to consider, and a few buildings. Nothing else is open yet.
2. Keep people fed, housed, employed and warm. Each new system arrives with a briefing when it starts to matter.
3. Pick a law path and a research direction that suit your nation and party, and look for their pairs.
4. Watch support before each election, and spend political power when it matters.
5. Read the reports to see why things moved, then adjust. If it goes wrong, the end screen says why.

The game stays deliberately small: one country to run, a handful of buildings, and two trees. Breadth (simulated neighbours, war) waits until this loop is solid and fun.
