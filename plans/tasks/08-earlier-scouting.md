# 08: Scouting opens earlier

Branch: `task/08-earlier-scouting`. Read `CLAUDE.md` first. Owner's list item 6.

## Why

A player reaches the ceiling on jobs well before scouting opens, and has nowhere to grow. The "captain" chapter opens ventures only from month 13 on a chance roll, and at month 20 at the latest (`TRIGGERS.captain` in `src/application/chapters.ts`, `by: 20` in `src/domain/chapters/chapterData.ts`).

## What to do

1. Measure first: in scripted careful and sloppy games on Easy and Normal, for all three nations, record the month when people first stand idle with no building slots left that would employ them. Check `getLabourSituation` and the per-province building caps.
2. Change the trigger so the chapter opens when the country hits that ceiling, from an early floor month based on your measurements. Bring `by` forward to about month 12, unless the figures argue otherwise.
3. Update the chapter's `until` line so that it is true, and its briefing if it no longer fits.
4. Check what later rules assume about ventures opening late: the neighbours' race for islands (TODO.md, "The race"), the story chapters that mention islands, and `tests/chapters.test.ts`.

## Out of scope

Venture prices and rewards. The other chapters' dates.

## Done when

- Tests cover the new trigger and the new latest month.
- All checks in `CLAUDE.md` pass.
- Results report the measured months, and the 27-game ladder against `difficultyData.ts`.
- `TODO.md` records what was measured.

## Stop and ask if

The ladder moves by more than 3 wins of 27 at any level, or a story's letter stops making sense.

## Results

**The main finding: the ceiling this task describes did not appear in any measured game.** `by: 12` opens the chapter every time, and the new trigger never fired outside the tests. The owner's report of hitting a ceiling may be about something else. See "Open for the owner".

### What changed

- `TRIGGERS.captain` (`src/application/chapters.ts`): the chance roll is gone. It now opens from `CAPTAIN_FROM_MONTH` (6, in `constants.ts`) if `isAtJobCeiling`.
- `src/application/getJobCeiling.ts` (new): `isAtJobCeiling` is true when at least one person is idle and no building that employs anyone has a slot left in any province held. Only buildings open to the country today count. Money and materials do not count, and neither do provinces held by rebels. The whole country is asked, because 70% of the idle commute to new jobs on the mainland.
- `createBuildAction.ts`: `hasBuildingSlot` split out of `canBuild`, with the same conditions.
- `chapterData.ts`: `by` from 20 to 12, and a new `until`: "Opens in December of the first year, or from June if idle people have no building left to work in". The briefing still fits, so it is unchanged.
- `tests/chapters.test.ts`: five new tests. They cover the latest month, the ceiling from the floor month, a ceiling with one slot free or nobody idle, shut buildings and want of money, and the race and stories keeping their own months. I broke `by` and the trigger in turn, and the matching tests failed each time.
- `TODO.md`: one rough-edges entry and one race entry.

### Measured: when does the ceiling come?

108 games at this task's starting commit (`8ff12c3`): Easy and Normal, careful and sloppy, three nations, the nine ladder seeds, five years. The scripted players build no factories beyond what stories give them, so 108 more were played by a temporary player that builds work for anyone idle once the market is open.

| First month of... | Scripted (108) | Building work (108) |
|---|---|---|
| 100 or more idle, or 5% of workers idle | month 1, every game | month 1, every game |
| Idle, and no slot of any open building in the country | never | never |
| Idle, and no farm or factory slot in the country | never | never |
| More idle than all remaining slots could employ | never | never |
| A province with idle people and no slot of any open building | never | never |
| A province with idle people and no farm or factory slot | never | 3 games: Astravia month 42, Caldenreich months 50 and 52 |

So there is no month to report for any nation, on either level, for either skill. At month 12, in the 184 of 216 games still going, room for more jobs in farms and factories alone was 8,500 to 16,450, and in all open buildings 23,620 to 41,530. Idle people numbered 0 to 2,490.

The national ceiling looks out of reach by arithmetic. Astravia's month 12 average is about 4,000 jobs and 38,580 jobs of room, so full slots would need about 170,000 people to leave anyone idle, against 12,000 at the start.

- **Latest month, 12:** kept as the task suggested. Nothing measured argues against it. Careful players at month 12 hold on average 5,300 to 8,400 Cr on Easy and 1,400 to 1,800 Cr on Normal, against a venture's 800 Cr. The poorest single careful game on Normal had -728 Cr.
- **Floor, month 6:** the ceiling gave no figure to base this on, so it is my judgement. By then the assembly has sat, and careful players hold on average 3,350 to 4,800 Cr on Easy and 1,500 to 1,900 Cr on Normal.
- **Trigger:** built as written, but in practice it is dead code.

### What later rules assume (step 4)

- **The race:** `RACE_FROM_MONTH` (27) holds the neighbours back whatever the captain does. First voyages stayed at month 27 to 29. The gate on ventures in `day/neighbours.ts` already could not bind at 20, and still cannot.
- **The army chapter:** its trigger counts settlers at sea only from month 18, and none sail before 27, so it does not move. Measured army months are the same before and now.
- **Stories:** `astravia:coast` (month 20) and `veldoria:islands` (month 26) also ask for the captain, which was already certain by those months. Caldenreich's story has no islands in it. `astravia:island` and `veldoria:islands` could already find a player holding an island, as a careful player on Easy settled by month 16 before this change. That window is a little longer now, but no letter stopped making sense.
- **Order of chapters:** the captain now usually arrives before Know Your Voters (13), Streets (14) and Envoys (15), where those have not already opened. That makes one more stop in months 12 to 15.
- **Random letters:** none waits on ventures.

### The 27-game ladder

Nine ladder seeds, every nation, sloppy and careful. The "Before" column was replayed at `8ff12c3` and matches `difficultyData.ts` exactly.

| Level | Recorded and before | Now | Change | Sloppy now (before) | Careful now (before) |
|---|---|---|---|---|---|
| Easy | 12 and 27 | **14 and 27** | sloppy +2 | 5, 8, 1 (4, 8, 0) | 9, 9, 9 (9, 9, 9) |
| Normal | 0 and 17 | **0 and 17** | none | 0, 0, 0 (same) | 7, 8, 2 (6, 8, 3) |
| Hard | 0 and 5 | **0 and 7** | careful +2 | 0, 0, 0 (same) | 4, 3, 0 (3, 2, 0) |
| Ruthless | 0 and 3 | **0 and 2** | careful -1 | 0, 0, 0 (same) | 0, 2, 0 (2, 1, 0) |

By nation is Astravia, Caldenreich, Veldoria. The largest move is 2, inside the limit of 3. Hard stays above its bound of 5, and 11 of the 216 games changed result. I did not change `difficultyData.ts` or the ladder line in `TODO.md`: this task doesn't ask for it, and the recorded ladder belongs to the owner.

Seeds 11 to 19, against task 07b's figures: Easy 13 and 27 (same), Normal 0 and 14 (same), Hard 0 and 8 (same), Ruthless 0 and 3 (0 and 6). Ruthless falling by 3 on these seeds is the largest move anywhere, and is at the limit. By nation now: careful Normal 3, 9, 2; Hard 3, 5, 0; Ruthless 1, 2, 0.

### What the ladder shows about ventures opening earlier, and what it can't

The ladder players never send a venture, so the ladder cannot measure whether earlier scouting helps or hurts. What it shows is that the change does not upset the levels. Its moves look like reshuffled dice rather than an effect of scouting, though that is an inference. A control that only removed the roll, still opening at month 20, gave 13 and 27, 0 and 17, 0 and 5, 0 and 3, with nations moving too (careful Hard 2, 3, 0; Ruthless 1, 2, 0). So removing the roll alone moves nation figures. Hard's 5 to 7 and Ruthless's 3 to 2 appear only with the earlier opening, and I did not trace why. An opening briefing changes when letters roll, which is one possible route.

The only evidence on ventures themselves is a separate careful `settle: true` run of 27 games a level, before and now:

| Level | Wins | First scout, median month | First island, median month | Islands held at the end | Neighbours' islands at the end |
|---|---|---|---|---|---|
| Easy | 27 to 27 | 15 to 13 | 17 to 15 | 3.9 to 3.7 | 2.1 to 2.3 |
| Normal | 17 to 17 | 34 to 29 | 38 to 35 | 1.0 to 1.2 | 2.6 to 2.8 |
| Hard | 5 to 7 | 44 to 35 | 46 to 40 | 0.2 to 0.1 | 1.3 to 1.3 |
| Ruthless | 3 to 2 | 43 to 52 | 47 to none | 0.1 to 0.0 | 0.5 to 0.4 |

Game by game, settling changed no result and no final month against the same game without it, before or now. Only 48 of the 108 games scouted at all (46 before). So these games say little about whether earlier islands help a country. On Normal and above, scouting starts long after the chapter opens, because the script scouts only above 2,500 Cr. That money rule holds it back more than the date does. The changes in islands held are small and go both ways, so there is no clear gain from the head start. Neither run can show how a person would spend those extra months, or whether earlier islands relieve anything they feel.

### Checks

Run once, in this order, on the finished code. `npm test` did not fail, so there is no intermittent failure to record.

- `npx tsc -b`: no output, exit 0.
- `npm run lint`: the five known warnings only (`BuildingIcon.tsx`, `useGameClock.ts`, `App.tsx`, `Gauge.tsx`, `ResourceIcon.tsx`).
- `npm run build`: "built in 266ms".
- `npm test`: 36 files passed, 540 tests passed, in 117.59s.

The measuring tests and the copy of the scripted player were temporary and are deleted. The figures are in the scratchpad (`ladder-*.json`, `settle-*.json`, `m08-*.json`).

### Not verified

- Whether a real player reaches any ceiling. Only scripted players were measured.
- The new tip as it appears on screen. In Chrome, at 1400 and 1000 wide, the locked Harbour row in Build carries the new words in its `data-tip`, the page has no sideways scroll and there are no console errors. I read the attribute and did not hover to see the tip drawn. This row is the only place the `until` line shows: the Ventures tab has no locked state.
- Why the earlier opening alone moves Hard and Ruthless (see above).

### Open for the owner

1. **What is the ceiling the owner meant?** Not job slots, on these figures. Candidates, none measured here: homes, money with nothing to spend it on (a careful player on Easy holds 5,300 to 8,400 Cr at month 12), or how a full province looks on the map. If it is something else, the trigger should read that. As built it could be deleted with no measured change, leaving only `by: 12`.
2. **The recorded ladder** in `difficultyData.ts` and the `balance.test.ts` line in `TODO.md` still say 12 and 27, 0 and 17, 0 and 5, 0 and 3. Updating them is the owner's or manager's call.
3. **`GAME_DESIGN.md` line 65** still says the captain's latest month is 20, and its table is ordered by month. It is outside this task, so I left it. It now needs 12.
4. **A player who builds work for anyone idle did worse on Normal:** careful wins 4, 6, 0 against 6, 8, 3. That script spends its money crudely, so this is one data point, but it's worth watching with task 11.

