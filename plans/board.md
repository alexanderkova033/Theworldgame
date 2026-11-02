# Board

Kept by the manager. Agents read this but do not edit it.

Statuses: `ready`, `running`, `in review`, `merged`, `waiting on owner`.

Baseline before any task (`cebb053`, 2026-10-31): 408 tests pass in 29 files, and `npx tsc -b` is clean.

| # | Task | Status | Branch | Touches | Run with |
|---|------|--------|--------|---------|----------|
| 01 | [Precise warnings](tasks/01-precise-warnings.md) | merged | `task/01-precise-warnings` | day messages, advisor alerts, one chapter line, comment encoding | 02, 03 |
| 02 | [The first minute](tasks/02-first-minute.md) | merged | `task/02-first-minute` | Objectives panel | 01, 03 |
| 03 | [Fewer interruptions](tasks/03-fewer-interruptions.md) | merged | `task/03-fewer-interruptions` | `App.tsx`, how briefings and letters follow each other | 01, 02 |
| 04 | [Warning before a breakdown](tasks/04-worn-buildings.md) | merged | `task/04-worn-buildings` | maintenance rules, Repairs, map, balance | alone |
| 05 | [Winter, the Build window, top bar lines](tasks/05-look.md) | merged | `task/05-look` | map season CSS, Build rows and window size, top bar CSS | 06 |
| 06 | [Country titles](tasks/06-country-titles.md) | merged (names at sea) | `task/06-country-titles` | map names | 05 |
| 07 | [Starting populations and wood](tasks/07-starting-countries.md) | merged | `task/07-starting-countries` | starting state, balance | alone |
| 07b | [Law requirements and Caldenreich's lead](tasks/07b-nation-balance.md) | merged | `task/07b-nation-balance` | laws, starting state, balance | alone |
| 08 | [Earlier scouting](tasks/08-earlier-scouting.md) | merged | `task/08-earlier-scouting` | chapters, balance | alone |
| 09 | [Heating](tasks/09-heating.md) | merged, with 120 extra coal for Astravia and an earlier warning | `task/09-heating` | housing rules, balance | alone |
| 09b | [Veldoria's extra coal](tasks/09b-veldoria-coal.md) | merged | `task/09b-veldoria-coal` | starting state, balance | alone |
| 08b | [Scouting opens when workers run short](tasks/08b-worker-ceiling.md) | merged | `task/08b-worker-ceiling` | chapters, balance | alone |
| 10 | [Trading orders](tasks/10-trading-orders.md) | merged | `task/10-trading-orders` | market, a day step | alone |
| 11 | [Trained workers](tasks/11-trained-workers.md) | merged, with limits that aren't exact | `task/11-trained-workers` | labour, balance, People | alone |
| 12 | [Leftovers: advice and trading](tasks/12-advice-and-trading-leftovers.md) | merged | `task/12-advice-trading` | messages, Objectives, forecasts, market orders | 13 |
| 13 | [Leftovers: windows, map, workers](tasks/13-windows-map-workers-leftovers.md) | merged, with crowds kept clear of buildings before land | `task/13-windows-map-workers` | window holds, People, Repairs, map, tests | 12 |

Work branch: `setup-screen-flags`, which holds the latest game (`main` is behind it). Task branches start from it and merge back into it. After each merge, the manager reruns all the checks. The owner decides when anything is pushed and when it goes to `main`.

Owner's decisions, 2026-10-31: buildings warn before breaking, and a new game's level defaults to Easy (done).

## Owner's list, 2026-10-31 (starts after tasks 01 to 04, as tasks 05 to 11)

1. Winter's white effect on the map should be weaker.
2. Too much text under each building in Build, and nothing says the first payment is only half the total.
3. Country titles block the view of the map and what is happening in each province.
4. Each country should start with a different number of people.
5. The Build window should be the same size as People.
6. Scouting islands should open earlier, since employment hits a ceiling.
7. Specialised workers: a country has a set number of farmers and factory workers, everyone else starts less efficient, and the player chooses how many work where.
8. More comfortable trading: more automatic buying and selling, including sell when the price is above X and buy when it is below X.
9. Heating: the owner asks how it works now, and suggests wood is five times less efficient than coal and better buildings have better insulation.
10. The red lines under items in the top bar are slightly annoying.

Owner's decisions on this list, 2026-10-31:

- Untrained workers improve with time in the job (about a year to reach full efficiency).
- Workers are assigned across the whole country, not per province. People moved keep working in their previous job until the month ends.
- Caldenreich and Veldoria get some starting wood.
- A service costs 30% of the build price. It also needs a couple of workers, slower and dearer when untrained: built in task 11, since training doesn't exist until then.
- The first payment stays at 60%, shown on each building's row.
- The Build window is one size for both sections, between today's two.

Owner's decisions on the worker design, 2026-11-01: everyone working on day one is trained; using the choice well may win more games; building ahead of your people is not softened, and Build gets a tip saying where the workers come from; an untrained crew means fewer than 90% of that trade trained. The note's smaller choices are accepted as proposed.

Planned order: the look (1, 2, 3, 5, 10), then the numbers one at a time (4, 6, 9), then trading (8), then workers (7) alone and last. Item 3 gets real screenshots of options for the owner to pick from.

## Left open

Tasks 12 and 13 took the board's other follow-ups. Details and measurements are under Results in each task file.

### For the owner to decide

- **The first day's income.** A new game's `stats.industry` starts at 6 whatever is broken or unstaffed, and day 1 really pays on it, so the top bar shows a higher rate on Jan 1 only. Correcting it takes up to 15 Cr off day 1 at every level, which could move the ladder.
- **Veldoria.** It fails on stability, not at elections. Won, collapsed, voted out, of 18: Normal 6, 8, 4; Hard 0, 17, 1; Ruthless 0, 16, 2. Causes: no stability income, more province drag (one of four weighs more than one of six, inferred), thin food, and less from police (not traced). With Caldenreich's stability it stops collapsing but is voted out, 9, 0, 1 wins. No single change tried opens Hard or Ruthless.
- **The `agriculture-machines` research path.** It wins 12 of 54 on Normal, against 33 for no path followed, and leaves 22% jobless with or without a limit.
- **Coal orders at high limits win less.** Careful Normal, 6 seeds, wins with no order and at limits 1.0, 1.15, 1.3, 1.5: Astravia 4, 5, 4, 3, 3; Veldoria 3, 0, 2, 1, 1. Few games. A high limit costs up to 4,095 Cr a year.

### To judge in play

- A limit isn't exact, and setting almost any limit pays a little (owner accepted, to judge).
- A window held back by letters comes back for one day when a story letter is due the next day, which may read as a flicker.
- With Build docked at 50rem, only 3 of Astravia's 6 provinces can be clicked at the default map position until the map is dragged.
- A regiment at sea hides a few letters of a name as it passes. Still shots only, no march watched.
- Whether a player acts on the winter warning in time, and reads "short of workers" as the reason scouting opened.
- Building ahead of your people loses games, on money. Not softened, by the owner's decision.
- Orders make selling a surplus effortless (Caldenreich's coal, up to +2,171 Cr a year).

### Small things found, not fixed

- `.progress-bar` has no base style, so the bars in Laws, Research and Ventures are probably invisible. Repairs moved to `Gauge`. Showing them changes the look, so see them first.
- `App.tsx` can show an ultimatum stacked with a demand or a crisis.
- A burden letter plays no arrival sound, unlike the others.
- When farms are held only by a limit, a real factory shortage stays hidden behind the farm row, as it already was behind any farm row.
- Crowds partly over the shore: 14, 16, 20 of 44 with 2, 3, 6 buildings a place (were 20, 20, 23). Touching a building: 0, 1, 6, as before. Keeping them all on land put 8, 11, 19 on buildings, against the rule that pictures never overlap. Levers not tried: smaller crowds where room is short. A crowd near a coast can also stand close to a name at sea.
- The whole-game war test needs games without garrisons: no war came in 90 games with garrisons and war on together, as the garrison habit appears to scatter the regiments.
- Islands relieve the worker shortage little: only Veldoria on Easy at month 48 (jobs over workers 24% to 19%). Island people can't commute. Thin evidence above Easy, as the script rarely settles.

### Watch

- Ladder: Easy 14 and 27, Normal 0 and 19, Hard 0 and 8, Ruthless 0 and 1. Ruthless sits on the test's floor of 1, so one more lost game fails `balance.test.ts`. Normal's ceiling is 22.
- Veldoria's careful Normal is 6 of 18, and it wins nothing on Hard or Ruthless.
- `balance.test.ts` can hit its 30-second limits when other sessions load the machine. Task 12 saw only timeouts in the errors it read, passing with a 300-second limit. Task 13 saw two failures it didn't capture, which passed alone and in the next run. If a failure recurs, save the name and the error.
- Hard's start screen says about one game in four: careful wins are 15 of 54.
- Nobody has played any of this, nor have touch screens or other browsers been checked.

## Not taken from the 2026-10-31 feedback

- **Permanent text labels on the top tabs:** icon navigation was the owner's own choice on 2026-10-29. Look again if new players get lost.
- **Collapsing locked buildings:** the owner did not want locked things hidden, as the game would look small. Look again if new players get lost.
- **Objectives giving way to shortages:** the advisor row already puts the shortage first, with a red button to fix it.
- **More starting cash:** the empty treasury is part of the harder start. Task 02 explains the start instead.
