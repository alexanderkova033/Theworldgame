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

All five items are done. No stop-and-ask condition came up.

### What changed, old and new wording

**1. No food left.** `getForecasts` now reports `days: 0` when the store is empty and `netFood` is below zero. Each place that shows the forecast reads that.

| Where | Old | New |
| --- | --- | --- |
| Alert | Food: 1 day | Food exhausted |
| Alert detail | If nothing changes, the food runs out around Jan 2, Year 1. Build farms, or buy food. | The food is gone and the people are going hungry. Build farms, or buy food. |
| Top bar tip | ...Runs out around Jan 2, Year 1 if nothing changes... | ...None left... |
| Top bar screen reader label | ...Runs out in 1 days if nothing changes... | ...None left... |
| Top bar popover | Runs out around Jan 2, Year 1 (1 days) if nothing changes, counting the lean winter harvests. | None left, and less comes in each day than goes out. |
| Top bar chip | hourglass 1d | hourglass 0d |
| People window | lasts 1 days | none left |

Any food left, or an empty store that is filling up, keeps the old wording.

**2. One notice for one event.** When the game actually pauses for the food, `applyDangerPause` removes that day's shortage notice. The pause rule is unchanged.

| Day the food runs out | Old | New |
| --- | --- | --- |
| Faster than 1x, first time this season | "Paused: the food has run out. Resume when you're ready (Space)." and "Food shortage! The population is going hungry." | "Paused: the food has run out. Resume when you're ready (Space)." |
| 1x, or the season's pause already used, or already paused by something else | "Food shortage! The population is going hungry." | The same. There is no pause notice in these cases, so this one has to stay. |

Later days of the same shortage still log their notice, as before.

**3. Say what stalled a project.** The old message for every cause was "Homes construction has stalled: there isn't enough to pay for it." The new ones:

- Money: "Homes construction has stalled: short of money. It needs 6 Cr a day to resume."
- A good: "Homes construction has stalled: short of wood. It needs 0.3 wood a day to resume."
- Both: "Homes construction has stalled: short of money and wood. It needs 6 Cr and 0.3 wood a day to resume."

Amounts round up (money to a whole Crown, goods to a tenth), so having the amount named is always enough to resume.

**4. The Neighbours tab's reason.** The trigger and `by` are unchanged.

- Old: "Opens when a neighbour first meddles in your affairs"
- New: "Opens when a neighbour meddles in your affairs from June of the first year, or in March of the second year at the latest"

**5. Comments in `src/domain/constants.ts`.** Repaired by undoing the garbling, not by copying `fcfb959`, because two of those comments had their wording updated since then (`BREAKDOWN_CHANCE_PER_DAY`, `LOAN_INTEREST_RATE_PER_DAY`) and those updates are kept. It came to 31 lines, not the 26 the task counted. With comments stripped, the code is identical to before. `ResourceTicker.css` had the same garbling in 4 comment lines, which was trivial, so those are repaired too.

New tests: `tests/preciseWarnings.test.ts`, 12 tests covering items 1, 2 and 3.

### Checks

- `npx tsc -b`: exit 0, no output.
- `npm run lint`: exit 0, the five known warnings and no others (`BuildingIcon.tsx`, `Gauge.tsx`, `ResourceIcon.tsx` fast refresh; `useGameClock.ts`, `App.tsx` hook dependencies).
- `npm run build`: exit 0, "built in 356ms".
- `npm test`: Test Files 30 passed (30), Tests 420 passed (420). Before the change: 29 files, 408 tests, all passing.
- Balance: `tests/balance.test.ts` and `tests/support/` are untouched and pass. Nothing in `src/application` or `src/domain` reads the event log to decide a rule, and forecasts are only read for display, so the simulation's results do not change. I did not compare seeded runs number by number against the old commit.

### Looked at in a browser

Headless Chrome on this branch, with a save set to no food and no farms, at 1400px and 1000px wide:

- Seen: "Food exhausted" in the alert strip, the top bar tip and label, and the 0d chip. No sideways scroll at 1000px.
- Seen at 1400px only: the popover. It was not open in the 1000px screenshot.
- Not seen on screen, covered by tests or by reading the code only: the People window's "none left", the Neighbours tip, the stall notices, and the single pause notice.

### Left open

- **Stall button:** it still goes to Build, even when a good is short. The event carries only a topic, and the button is chosen from the topic, so it can't tell the cause. Sending the player to the Market would need the event to carry the cause.
- **A shared pause:** if another danger pauses the game on the same day and is listed first, the pause's button goes to that danger, and with the shortage notice gone that day's "Buy food" button goes too. The notice's text still names the food.
- **A pause from something else:** about 15% of runs in a sampled starving first day were already paused by something else, with no pause notice. I did not identify what. The shortage notice stays in that case, so the player still gets one notice.

Noticed and not touched:

- `getForecasts` leaves island flocks (`getGrazingFood`) out of its daily projection, so food forecasts are too gloomy with a grazing island. An empty store whose flocks cover the need can still read "Food: 1 day".
- The tip in `ProjectsPanel.tsx` works out what a stalled project lacks from the whole stock, not the running balance `buildings.ts` uses. When an earlier project took the last of a good, it blames money.
- "lasts 1 days" and "Runs out in 1 days" have the same wrong plural in the People window and the top bar label.

