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

