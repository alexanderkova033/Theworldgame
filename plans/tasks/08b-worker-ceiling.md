# 08b: Scouting opens when workers run short

Branch: `task/08b-worker-ceiling`. Read `CLAUDE.md` first, and Results in `plans/tasks/08-earlier-scouting.md`. Runs alone, after heating is merged.

## Why

The owner asked for scouting to open "as you hit the ceiling in employment". Task 08 took that as no building slots left, which never happens. On 2026-11-01 the owner said what they meant: **not enough workers**. Only a share of people work (`LABOUR_SHARE`), so a player builds farms and factories and then can't staff them. Islands are the way to more people.

## What to do

1. Measure first: in scripted careful and sloppy games on Easy and Normal, for all three nations, record when jobs first go unfilled for lack of workers across the country, how many, and whether it lasts. `getLabourSituation` has the totals. A player building ahead of its people is what this is about, so include a player who builds work, as task 08 did.
2. Replace `isAtJobCeiling` and `src/application/getJobCeiling.ts` with a check for this: from `CAPTAIN_FROM_MONTH` (6), the chapter opens once the country is short of workers by a meaningful amount, as a named constant chosen from your figures. It must not fire on a broken factory's few unfilled jobs or on one bad day. `by: 12` stays. Remove `hasBuildingSlot` only if nothing else needs it.
3. Update the chapter's `until` line so that it's true, and keep it short. Update the briefing only if it no longer fits.
4. Update `tests/chapters.test.ts`, `TODO.md`, and `GAME_DESIGN.md` if it describes the trigger.

## Out of scope

Venture prices and rewards, `LABOUR_SHARE`, and the other chapters' dates.

## Done when

- Tests cover: short of workers before and after the floor month, a small shortage not firing, and the latest month.
- All checks in `CLAUDE.md` pass.
- Results report the measured months by nation, how often the trigger fires before month 12, and the 27-game ladder by nation over both sets of seeds.

## Stop and ask if

The ladder moves by more than 3 wins of 27 at any level, or Hard falls below what `balance.test.ts` allows.

## Results

Done, and no stop condition was hit. **The ladder did not move: all 432 games on both sets of seeds came out the same.** The scripted ladder players never open the chapter early, so it opens early only for a player who builds ahead of its people.

### What changed

- `isShortOfWorkers` (new, `domain/labour/labourRules.ts`): true when `jobs - workers` is at least `CAPTAIN_WORKER_SHORTAGE` (0.45) of `workers`, across the whole country.
- `daysShortOfWorkers` (new `GameState` field, default 0 in `startNewGame` and `hydrateGameState`): days in a row short of workers, counted in `simulateDay`, back to 0 when the shortage ends.
- `TRIGGERS.captain`: from `CAPTAIN_FROM_MONTH` (6), once `daysShortOfWorkers` reaches `CAPTAIN_SHORTAGE_DAYS` (14). `by: 12` stays.
- `src/application/getJobCeiling.ts` is deleted. `hasBuildingSlot` is folded back into `canBuild`, with the same conditions, as nothing else needed it.
- `until` is now "Opens in December of the first year, or from June if you have far more jobs than workers". The briefing still fits and is unchanged.
- `tests/chapters.test.ts`: the old ceiling tests are replaced by seven new ones. I broke the day count, the floor month, the threshold and the shortage sum in turn, and matching tests failed each time. The save test was added after that.
- `TODO.md` entry rewritten, and the `GAME_DESIGN.md` chapter table names the trigger.

### What I took "short of workers" to mean

The measure is jobs minus all workers, not jobs left unfilled. Unfilled jobs equal that figure plus the idle, so they include jobs open in one province while people stand idle in another, because only 70% commute. More people from an island isn't the answer to that.

A broken factory has no jobs at all (`isWorking`), so it lowers the shortage instead of raising it. The task's worry about its "few unfilled jobs" can't happen with this measure, and a test covers it. Mending one can raise the shortage, but that then has to last 14 days.

### Measured

324 five-year games at the starting commit: Easy and Normal, careful and sloppy, three nations, the nine ladder seeds, with three players of 108 games each.

- **Scripted:** `playCarefully` as it is. It builds only farms and homes.
- **For the idle:** also builds a factory once 100 or more stand idle and the market is open, as task 08 did.
- **Ahead:** also builds factories and farms, turn about, whenever it holds 1,000 Cr and the market is open, idle or not.

**The main finding: being short of workers is the normal state of these countries, from the first month.** Starting countries have more jobs than workers once their buildings are working (`startingCountries.test.ts` expects up to 1.3 times). A careful script is over the line of "any shortage" in month 1 in every game. So a threshold near zero would open the chapter in June for almost everyone: 88 of 108 scripted games at any shortage, which is why the line is high.

First month of any national shortage, and the share of days short up to month 24, median of each nation (Astravia, Caldenreich, Veldoria):

| Player | Easy careful | Easy sloppy | Normal careful | Normal sloppy |
|---|---|---|---|---|
| Scripted | 1, 1, 1; 99%, 99%, 99% | 4, 13, 3; 40%, 18%, 58% | 1, 1, 1; 90%, 63%, 97% | 3, 3, 3; 32%, 15%, 36% |
| For the idle | 1, 1, 1; 99%, 99%, 99% | 4, 6, 3; 86%, 79%, 84% | 1, 1, 1; 99%, 97%, 67% | 3, 3, 3; 28%, 14%, 46% |
| Ahead | 1, 1, 1; 99%, 99%, 99% | 4, 5, 3; 83%, 76%, 88% | 1, 1, 1; 98%, 99%, 83% | 3, 3, 3; 39%, 15%, 40% |

How many short, median jobs minus workers (share of workers), careful on Easy:

| Player | Astravia month 6, month 12 | Caldenreich month 6, month 12 | Veldoria month 6, month 12 |
|---|---|---|---|
| Scripted | 942 (31%), 854 (27%) | 832 (32%), 716 (27%) | 744 (36%), 694 (33%) |
| For the idle | 1,592 (52%), 2,156 (69%) | 832 (32%), 722 (27%) | 744 (36%), 699 (33%) |
| Ahead | 1,242 (41%), 1,805 (57%) | 833 (32%), 1,678 (63%) | 1,044 (51%), 1,927 (91%) |

At month 24 the ahead player is short by 3,094 to 3,499 people, at 104% to 137% of its workers.

Does it last? Once past the line for 14 days, the median player stays past it for 91% (for the idle) to 98% (ahead) of the next 180 days. Short spells do happen: before month 12, about one spell in five past 45% ended within 14 days (29 of 148), and 6 lasted a single day.

### The threshold: 45%, for 14 days

- **The ceiling of doing nothing special:** the most a script holds for 14 days before month 12 is 39% careful and 41% sloppy, both Veldoria on Normal. The second is before June, so it can't fire. 40% would clear these by a single point, and 38% already fires in 7 scripted games.
- **What should cross it:** by arithmetic, one factory (650 jobs) on top of the careful script's figure gives about 54% in Astravia, 58% in Caldenreich and 70% in Veldoria. One farm (300) gives about 42%, 44% and 53%. So one factory beyond the country's needs crosses it, and a single farm only in Veldoria.
- **Why a share and not a number:** Astravia has half as many workers again as Veldoria.
- **Why 14 days:** it excludes the short spells above. 30 days would drop 0 to 3 more games a nation for each builder and delay the rest, and a breakdown takes jobs away and restarts the count, so a long wait would be harder on a country whose buildings break.

### How often scouting opens before December

The month the chapter actually opened, played with the new code. Games per nation are 36 for each player: Easy and Normal, careful and sloppy, nine seeds.

| Player | Astravia | Caldenreich | Veldoria |
|---|---|---|---|
| Scripted | 0 | 0 | 0 |
| For the idle | 18, median month 6 | 10, median 7 | 11, median 8 |
| Ahead | 16, median 9 | 15, median 9 | 23, median 6 |

Months run from 6 to 11. The share is mostly careful players on Easy:

| Player and level | Astravia | Caldenreich | Veldoria |
|---|---|---|---|
| For the idle, careful Easy (of 9) | 9, months 6-10 | 3, 7-10 | 3, 7-11 |
| For the idle, careful Normal | 5, 6-8 | 5, 6-8 | 1, 10 |
| For the idle, sloppy Easy | 3, 11 | 0 | 4, 6-10 |
| For the idle, sloppy Normal | 1, 11 | 2, 6-10 | 3, 6-10 |
| Ahead, careful Easy | 9, 9-10 | 9, 9 | 9, 6 |
| Ahead, careful Normal | 5, 9-11 | 5, 9 | 5, 6-10 |
| Ahead, sloppy Easy | 2, 10 | 1, 11 | 8, 9-11 |
| Ahead, sloppy Normal | 0 | 0 | 1, 6 |

Sloppy Normal counts are low partly because few of those games reach that far: of 9 Astravia and 9 Veldoria games, 2 to 4 are still going at month 12 (Caldenreich 9). On these 324 games, results at the new commit match those at the starting commit, by nation, for all three players.

### The 27-game ladder

Sloppy and careful wins. By nation is Astravia, Caldenreich, Veldoria. "Before" was replayed at this task's starting commit `a87332b`, and on the ladder seeds matches `difficultyData.ts` exactly.

| Level | Ladder seeds, before and now | Careful by nation | Sloppy by nation | Seeds 11 to 19, before and now | Careful by nation | Sloppy by nation |
|---|---|---|---|---|---|---|
| Easy | 14 and 27 | 9, 9, 9 | 5, 8, 1 | 12 and 27 | 9, 9, 9 | 5, 7, 0 |
| Normal | 0 and 17 | 7, 8, 2 | 0, 0, 0 | 0 and 12 | 3, 9, 0 | 0, 0, 0 |
| Hard | 0 and 7 | 4, 3, 0 | 0, 0, 0 | 0 and 7 | 2, 5, 0 | 0, 0, 0 |
| Ruthless | 0 and 2 | 0, 2, 0 | 0, 0, 0 | 0 and 3 | 1, 2, 0 | 0, 0, 0 |

0 of 432 games changed result or final month, and the chapter's month changed in none. It opened before month 12 in none of them, at any level. The moved-by limit of 3 and Hard's bound of 5 aren't approached. `difficultyData.ts` is unchanged, as the ladder didn't move.

### Checks

Run once, in this order, on the finished code. `npm test` did not fail, so there is no intermittent failure to record.

- `npx tsc -b`: no output, exit 0.
- `npm run lint`: the five known warnings only (`useGameClock.ts`, `App.tsx`, `Gauge.tsx`, `ResourceIcon.tsx`, `BuildingIcon.tsx`), exit 0.
- `npm run build`: "built in 522ms", exit 0.
- `npm test`: 37 files passed, 566 tests passed, in 201.55s, exit 0.

The measuring tests and the copy of the scripted player were temporary and are deleted. The figures are in the scratchpad (`m08b-*.json`, `ladder-*.json`).

### Not verified

- **A real player.** Only scripts were measured. How soon a person crosses 45% is unknown.
- **That the two builder scripts are fair copies of a person.** They spend crudely, and their months depend on their rules for when to build.
- **That islands relieve the shortage.** None of these games sends a venture, so nothing here shows an island's people closing the gap, or how fast.
- **The new tip on screen.** I changed its words and did not open a browser: the line shows only in the locked Harbour row's `data-tip`, as task 08 found.
- **Why month 1 has idle people and then a shortage.** Jobs start below workers (by 150 to 350 on Easy, 800 to 1,000 on Normal). I read this as the buildings that start broken being repaired, but did not trace it.

### Open for the owner

1. **Is 45% where it should feel like the ceiling?** A country that builds nothing beyond its needs is already 20% to 40% short and gets no chapter early, which is on purpose but is a judgement. If it should open for more players, the line can't go below about 40% without firing for the plain careful script.
2. **Building ahead loses games.** The ahead script wins far less: careful on Normal 1, 2, 0 against 7, 8, 2, and careful on Easy 9, 9, 4 against 9, 9, 9. The script is crude, but this is the very behaviour the chapter now answers, and task 08's note 4 saw the same thing. Worth watching with task 11.
3. **The shortage is permanent for most countries.** Factories go quiet from the start. Whether the player sees that as "not enough workers" before June is a question for how it is shown, not this task.

