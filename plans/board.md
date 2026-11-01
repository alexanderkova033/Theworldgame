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
| 11 | [Trained workers](tasks/11-trained-workers.md) | running: design agreed, being built | `task/11-trained-workers` | labour, balance, People | alone |

Work branch: `setup-screen-flags`, which holds the latest game (`main` is two commits behind it). Task branches start from it and merge back into it, with 04 last. After each merge, the manager reruns all the checks. The owner plays the result before anything is pushed, and decides when it goes to `main`.

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

## Watch

- Task 07 moved the ladder to Easy 10 and 27, Normal 0 and 18, Hard 0 and 7, Ruthless 0 and 3. Task 07b moved it to Easy 12 and 27, Normal 0 and 17, Hard 0 and 5, Ruthless 0 and 3, and task 08 to Easy 14 and 27, Normal 0 and 17, Hard 0 and 7, Ruthless 0 and 2 (recorded in `difficultyData.ts`). `balance.test.ts` allows Hard no lower than 5. Careful wins after 07b over 18 seeds, as Astravia, Caldenreich, Veldoria: Normal 10, 16, 5; Hard 5, 8, 0; Ruthless 5, 4, 0. The ladder games pass no laws, so they can't judge the scaled requirements.
- Veldoria now passes about three times as many Labour laws, but wins no more. It wins nothing on Hard or Ruthless. Why is not traced.
- "Population 12k / 12k" can show while a law is still locked (at 11,960, say), because of the number format.
- Hard's test title in `balance.test.ts` says "about a third", which no longer fits.

- One test failed once in `npm test` after task 02 merged, and was not identified. Task 04 then saw `tests/interruptions.test.ts` time out at 5 seconds and an unexplained failure in `tests/balance.test.ts`. The limit is now 30 seconds. If a failure recurs, save the name and the error.

## Small follow-ups from task 09b

- Ladder now Easy 14 and 27, Normal 0 and 20, Hard 0 and 7, Ruthless 0 and 2. Normal's "about half" is generous at 35 of 54 (10, 17, 8 by nation) and 20 sits under the test's ceiling of 22. Waiting on the owner's wording.
- A coal order with a high enough limit keeps a country warm, but at 1.5 of base it costs 2,200 to 4,200 Cr a year, and careful Veldoria's wins fell at most limits (8 with no order; 5, 7, 4, 4). Nothing tells the player an order's yearly cost.
- Veldoria still wins nothing on Hard or Ruthless, with or without orders.

## Small follow-ups from task 08b

- Countries are short of workers from month 1 in nearly every careful game, which is why the line is as high as 45% of workers. Whether a player reads this as "not enough workers" depends on how it's shown.
- A crude script that builds ahead of its people loses games (careful Normal 1, 2, 0 against 7, 8, 2). Watch this with task 11, since it is the behaviour the chapter answers.
- No game has tested whether islands relieve the shortage.

## Small follow-ups from task 10

- Coal order figures were measured before the 5 to 1 heating landed, so rerun them.
- Nothing tells a player that a coal order with a low price limit will fall short by winter.
- Orders make selling a surplus effortless (Caldenreich's coal, up to +2,171 Cr a year). Goods are being made, so this is allowed, but worth watching.
- The 500 Cr reserve can be seen but not set.

## Small follow-ups from task 09

- Veldoria digs no coal either and got none extra. Careful on Normal it goes cold in 8 of 16 second winters and 7 of 9 third winters, and its wins over 18 seeds fell from 4 to 2. The autumn warning shows every year there. The owner chose 60 extra coal: task 09b.
- Heat shares 0.8 and 0.65 have unit tests only, as no scripted game builds tenements or apartment blocks.
- Nobody has checked that a person acts on the warning in time.

## Small follow-ups from task 08

- `isAtJobCeiling` (no building slots left) never fired in 216 measured games. The owner meant not enough workers: task 08b replaces it.
- The 2,500 Cr rule in the scripted player holds back its scouting more than the date does.

## Small follow-ups from task 06

- Strike and riot crowds can stand partly over the shoreline (`placeCrowds`).
- A regiment passing over a name at sea hasn't been seen on screen.

## Small follow-ups from task 05

- With Build docked at 50rem, only 3 of Astravia's 6 provinces can be clicked at the default map position until the map is dragged. The owner should judge this in play.
- The money and goods cost tips stay `title`, because `Tooltips.tsx` only follows a changing `title`.

## Small follow-ups from task 03

- A burden offer opens over the window rather than holding it back.
- The "more waiting" sign shows on briefings only.
- A held window stays hidden for the day while a story letter is queued.

## Small follow-ups from task 01

- A stalled project's button always goes to Build, even when a good is short. The event would have to carry the cause.
- `getForecasts` leaves island flocks out, so food forecasts are too gloomy with a grazing island.
- The tip in `ProjectsPanel.tsx` can blame money when an earlier project took the last of a good.
- "lasts 1 days" and "Runs out in 1 days" have a wrong plural.

## Small follow-ups from task 02

- Caldenreich and Veldoria make no wood, so they can't start homes until the market opens, even on Easy with money in hand. Balance question for the owner.
- The repair step stays lit with "Go" for the 10 days after both repairs are paid, which holds back the farm step's guidance.
- The first-day wait reads 8 days, then 10 the next day: income shows +44 a day on Jan 1 and +29 from Jan 2. Cause not traced.
- The school, Thornwick farm and harbour steps have no guidance yet.

## Not taken from the 2026-10-31 feedback

- **Permanent text labels on the top tabs:** icon navigation was the owner's own choice on 2026-10-29. Look again if new players get lost.
- **Collapsing locked buildings:** the owner did not want locked things hidden, as the game would look small. Look again if new players get lost.
- **Objectives giving way to shortages:** the advisor row already puts the shortage first, with a red button to fix it.
- **More starting cash:** the empty treasury is part of the harder start. Task 02 explains the start instead.
