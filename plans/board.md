# Board

Kept by the manager. Agents read this but do not edit it.

Statuses: `ready`, `running`, `in review`, `merged`, `waiting on owner`.

Baseline before any task (`cebb053`, 2026-10-31): 408 tests pass in 29 files, and `npx tsc -b` is clean.

| # | Task | Status | Branch | Touches | Run with |
|---|------|--------|--------|---------|----------|
| 01 | [Precise warnings](tasks/01-precise-warnings.md) | merged | `task/01-precise-warnings` | day messages, advisor alerts, one chapter line, comment encoding | 02, 03 |
| 02 | [The first minute](tasks/02-first-minute.md) | merged | `task/02-first-minute` | Objectives panel | 01, 03 |
| 03 | [Fewer interruptions](tasks/03-fewer-interruptions.md) | merged | `task/03-fewer-interruptions` | `App.tsx`, how briefings and letters follow each other | 01, 02 |
| 04 | [Warning before a breakdown](tasks/04-worn-buildings.md) | running | `task/04-worn-buildings` | maintenance rules, Repairs, map, balance | alone |
| 05 | [Winter, the Build window, top bar lines](tasks/05-look.md) | waiting on 04 | `task/05-look` | map season CSS, Build rows and window size, top bar CSS | 06 |
| 06 | [Country titles](tasks/06-country-titles.md) | waiting on 04, stops for the owner to pick | `task/06-country-titles` | map names | 05 |
| 07 | [Starting populations and wood](tasks/07-starting-countries.md) | waiting on 05 and 06 | `task/07-starting-countries` | starting state, balance | alone |
| 08 | [Earlier scouting](tasks/08-earlier-scouting.md) | waiting on 07 | `task/08-earlier-scouting` | chapters, balance | alone |
| 09 | [Heating](tasks/09-heating.md) | waiting on 08 | `task/09-heating` | housing rules, balance | alone |
| 10 | [Trading orders](tasks/10-trading-orders.md) | waiting on 09 | `task/10-trading-orders` | market, a day step | alone |
| 11 | [Trained workers](tasks/11-trained-workers.md) | waiting on 10, stops for the owner to agree a design | `task/11-trained-workers` | labour, balance, People | alone |

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
- The first payment stays at 60%, shown on each building's row.
- The Build window is one size for both sections, between today's two.

Planned order: the look (1, 2, 3, 5, 10), then the numbers one at a time (4, 6, 9), then trading (8), then workers (7) alone and last. Item 3 gets real screenshots of options for the owner to pick from.

## Watch

- One test failed once in `npm test` after task 02 merged, while another agent was running, and passed in 4 more full runs. It was not identified. If it recurs, save the name.

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
