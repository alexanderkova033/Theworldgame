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

