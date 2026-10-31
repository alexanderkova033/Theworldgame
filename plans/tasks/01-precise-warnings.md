# 01: Precise warnings

Branch: `task/01-precise-warnings`. Read `CLAUDE.md` first.

## Why

A playtester was told things that were not true: "Food: 1 day" with no food left, and "not enough to pay for it" with money in hand and no wood. A warning that misleads costs more trust than having no warning. All of these were checked against the code at `cebb053`.

## What to do

1. **No food left.** `getForecasts` counts from today's stock, so at zero it reports 1 day, and `src/application/getAdvisorOutlook.ts:168-177` prints "Food: 1 day". When the store is empty and food is still falling, the alert must say the food is gone (for example "Food exhausted"), and its detail must say so too instead of giving a future date. Check the top bar's food tip as well (`ResourceTicker.tsx:234`, `runOut`).
2. **One notice for one event.** The day the food runs out, two notices appear together: "Paused: the food has run out..." (`src/application/playDay.ts:45`) and "Food shortage! The population is going hungry." (`src/application/day/food.ts:23`). The player should see one. Keep the pause working.
3. **Say what stalled a project.** `src/application/day/buildings.ts:68` blames money whatever ran out. Name the real cause: money, or the good (`project.resourceType`), with what is needed per day to resume (`resourceCostPerDay`, `treasuryCostPerDay`). If both ran out, name both. Its button (`stall` in `src/presentation/eventKinds.ts`) goes to Build. If that can't send the player to the Market when a good is short, because the notice doesn't know the cause, note it under Results and leave it.
4. **The Neighbours tab's reason.** `chapterData.ts` says the envoys chapter "Opens when a neighbour first meddles in your affairs". But meddling can happen earlier than the trigger in `src/application/chapters.ts` (`envoys`, `month >= 6`) will notice it, so a report can name a meddling neighbour while the tab stays shut. Change the `until` line so it is true. Do not change the trigger or `by`: that moves the chapter's timing.
5. **Repair the comments in `src/domain/constants.ts`.** 26 comment lines came out garbled (`â€”` and similar) in a recent commit. `git show fcfb959:src/domain/constants.ts` has them right. Touch comments only: the diff must not change any value. Leave `ResourceTicker.css`, whose garbling is older, unless it is trivial.

## Out of scope

Rules, numbers, what triggers anything, any change to the look.

## Done when

- Tests cover items 1, 2 and 3 (`tests/support/calmStart.ts` is the pattern).
- All checks in `CLAUDE.md` pass, and the balance figures in `tests/balance.test.ts` are unchanged.
- Results list the old and new wording of each message.

## Stop and ask if

A fix would change the simulation's results, or item 2 would need a different pause rule.

## Results

