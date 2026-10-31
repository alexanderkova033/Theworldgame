# Board

Kept by the manager. Agents read this but do not edit it.

Statuses: `ready`, `running`, `in review`, `merged`, `waiting on owner`.

Baseline before any task (`cebb053`, 2026-10-31): 408 tests pass in 29 files, and `npx tsc -b` is clean.

| # | Task | Status | Branch | Touches | Run with |
|---|------|--------|--------|---------|----------|
| 01 | [Precise warnings](tasks/01-precise-warnings.md) | merged | `task/01-precise-warnings` | day messages, advisor alerts, one chapter line, comment encoding | 02, 03 |
| 02 | [The first minute](tasks/02-first-minute.md) | ready | `task/02-first-minute` | Objectives panel | 01, 03 |
| 03 | [Fewer interruptions](tasks/03-fewer-interruptions.md) | ready | `task/03-fewer-interruptions` | `App.tsx`, how briefings and letters follow each other | 01, 02 |
| 04 | [Warning before a breakdown](tasks/04-worn-buildings.md) | ready, after 01 to 03 are merged | `task/04-worn-buildings` | maintenance rules, Repairs, map, balance | alone |

Work branch: `setup-screen-flags`, which holds the latest game (`main` is two commits behind it). Task branches start from it and merge back into it, in the order 01, 03, 02, 04. After each merge, the manager reruns all the checks. The owner plays the result before anything is pushed, and decides when it goes to `main`.

Owner's decisions, 2026-10-31: buildings warn before breaking, and a new game's level defaults to Easy (done).

## Owner's list, 2026-10-31 (starts after tasks 01 to 04; not yet written up as tasks)

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

## Small follow-ups from task 01

- A stalled project's button always goes to Build, even when a good is short. The event would have to carry the cause.
- `getForecasts` leaves island flocks out, so food forecasts are too gloomy with a grazing island.
- The tip in `ProjectsPanel.tsx` can blame money when an earlier project took the last of a good.
- "lasts 1 days" and "Runs out in 1 days" have a wrong plural.

## Not taken from the 2026-10-31 feedback

- **Permanent text labels on the top tabs:** icon navigation was the owner's own choice on 2026-10-29. Look again if new players get lost.
- **Collapsing locked buildings:** the owner did not want locked things hidden, as the game would look small. Look again if new players get lost.
- **Objectives giving way to shortages:** the advisor row already puts the shortage first, with a red button to fix it.
- **More starting cash:** the empty treasury is part of the harder start. Task 02 explains the start instead.
