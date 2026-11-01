# 04: A warning before a building breaks

Branch: `task/04-worn-buildings`. Read `CLAUDE.md` first. Runs alone, after tasks 01 to 03 are merged.

## Why

A playtester found repeated sudden breakdowns less interesting than the game's political choices: a repair notice arrives, and there was nothing to decide. The owner agreed on 2026-10-31 that a building should show wear first, and the player can pay to service it. The pressure of "A government always falling apart" stays. It becomes a choice about where to spend, made before the damage.

## What to do

1. **Worn comes first.** Today `rollBreakdowns` (`src/domain/maintenance/maintenanceRules.ts`) breaks a building the moment its roll fails. Instead, the failed roll marks it worn, and it keeps working for `WORN_WARNING_DAYS` (start at 30), then breaks as it does today. Use a separate optional field on `PlacedBuilding`, not a new `condition`: `isWorking` means `condition === undefined`, and a worn building is still working. Keep the chance of a roll as it is.
2. **Service.** While worn, the player may pay `SERVICE_COST_SHARE` of the build price (start at 0.1, against 0.25 for a repair), in money and the good, as a repair does. It clears the wear at once and takes the building out of service for no days. Follow `src/application/actions/repairBuilding.ts`.
3. **Riots are unchanged.** `rollRiotDamage` and the buildings broken at the start of a game skip the warning.
4. **Show it where repairs already live.** The Repairs list in Build lists worn buildings and their days left, with a Service button. The map marks a worn building in the same family as its broken mark. No new window or tab.
5. **Don't add noise.** A building turning worn logs one notice that folds with others (`src/presentation/eventKinds.ts`), and does not pause the game or send a letter. Task 03 just reduced interruptions, so don't undo that.
6. **Say so in the docs.** Update TODO.md's rough edges with what was measured.

Both numbers go in `src/domain/constants.ts`.

## Out of scope

Maintenance budgets, research changes, a change to breakdown chances, repair prices or the difficulty settings.

## Done when

- Tests cover: worn then broken after the warning, service clearing it, the service price, riots skipping it, and old saves loading.
- All checks in `CLAUDE.md` pass.
- **Balance is measured:** the 27-game difficulty ladder (sloppy and careful, all four levels), with the scripted players ignoring service, and again with the careful player servicing whenever it can pay. Report both against the ladder recorded in `difficultyData.ts`. Add a scripted-player option for servicing, off by default.
- Results include browser screenshots of the Repairs list and the map with a worn building, with their file paths, so the owner can judge the look.

## Stop and ask if

The ladder moves by more than 3 wins of 27 at any level, in either run. Report the figures and what you would change. Do not retune the levels yourself.

## Results

### Stop and ask: the ladder moves too far

With the careful player servicing, Hard moves by 7 wins of 27 (limit 3). The levels and the numbers are left as the task gave them. **Question for the owner: which of these?**

- **A, my pick: raise `SERVICE_COST_SHARE` to 0.3.** This is the only change that brought the ladder back in these runs, and it changes no level. It makes a service dearer than a repair's 0.25, but it still saves the 10 days out of use. At 0.1 servicing is always right, so it isn't a choice about where to spend. At 0.3 it is. The owner set "start at 0.1, against 0.25", so this needs a yes.
- **B: keep 0.1 and retune the levels and the recorded ladder** for a player who services. Hard then wins as often as Normal does without service, so Hard and probably Normal would need to get harder.
- **C: keep 0.1 and record it as what a good player earns.** Cheapest, but Hard would no longer mean "about one game in four" for anyone who uses the button.

### Balance

Each figure is wins of 27 five-year games. The scripted players build as they did. Baseline is commit 9b961cc re-measured with the same script, and it matches the ladder in `difficultyData.ts` exactly. Sloppy never services, as the task asks only for the careful player to, so its column is the same in both runs.

| Level | Recorded (sloppy, careful) | Run 1: ignoring service | Move | Run 2: careful servicing | Move |
| --- | --- | --- | --- | --- | --- |
| Easy | 9, 27 | 12, 27 | +3, 0 | 27 | 0 |
| Normal | 0, 14 | 0, 15 | 0, +1 | 16 | +2 |
| Hard | 0, 7 | 0, 7 | 0, 0 | **14** | **+7** |
| Ruthless | 0, 3 | 0, 3 | 0, 0 | 6 | +3 |

Easy sloppy (+3) and Ruthless servicing (+3) are exactly at the limit, which is "more than 3". Only Hard is past it.

Other measurements, careful player only, not committed code:

| | Easy | Normal | Hard | Ruthless |
| --- | --- | --- | --- | --- |
| Second seeds (11 to 19), ignoring | 26 | 14 | 9 | 2 |
| Second seeds, servicing at 0.1 | 27 | **23** | 15 | 5 |
| Ladder seeds, servicing at 0.2 | 27 | 16 | 13 | 3 |
| Ladder seeds, servicing at 0.3 | 27 | 15 | 6 | 4 |
| Ladder seeds, servicing at 0.4 | 27 | 15 | 6 | 2 |
| Second seeds, servicing at 0.3 | 26 | 17 | 7 | 5 |

So the rise is not chance: Normal rises by 9 on the second seeds. The cause: breakdowns a year (riots included) for the careful player on Hard go from 11 to 1.6, while its average final treasury goes from 1,719 to 5,265 Cr. 0.2 barely helps; 0.3 does.

Notices a year (what `eventKinds.ts` lets pop up, counted before the folding below, so an upper bound):

| | Easy | Normal | Hard | Ruthless |
| --- | --- | --- | --- | --- |
| Careful, before | 17.3 | 45.8 | 55.0 | 90.5 |
| Careful, ignoring service | 18.6 | 46.1 | 60.5 | 83.3 |
| Careful, servicing | 16.6 | 39.6 | 44.1 | 67.8 |
| Sloppy, before | 57.1 | 133.9 | 185.5 | 213.1 |
| Sloppy, after | 66.6 | 127.7 | 196.9 | 228.6 |

Buildings turning worn, a year, careful: 1.8, 5.7, 8.8, 8.8. These games differ in length and luck, so small differences mean little. An ignored building now gives two notices, wear and then the breakdown, and the sloppy player shows it (up to 15 more a year). No letters or pauses were added.

### What changed

1. **Worn comes first.** `rollBreakdowns` marks a building worn (`wornUntilDay` on `PlacedBuilding`) on a failed roll. It breaks when the day comes. The chance of a roll is the same, and a worn building doesn't roll again.
2. **Service.** `src/application/actions/serviceBuilding.ts`, following `repairBuilding`. `getServiceCost` shares its rounding with `getRepairCost`, and the same things make it cheaper (`repairCostMultiplier`).
3. **Riots unchanged.** Riots and starting works break at once. A riot on a worn building drops its wear.
4. **Shown** in the Repairs list (worn below broken, soonest first, days left and a Service button) and on the map: an amber "!" at the corner of the picture on the land, and an amber "!" beside the red one in the province icons. The Build tab's "!" and hint count worn buildings, and the Repairs section appears for them. Also one line on the map's province tip and "(1 worn)" on the province card, where broken ones are already told.
5. **Noise.** One `worn` event per building, foldable. No pause, no letter. It does pop up, as the `Toasts` notice "Wear and tear" with a Service button, with one fixed message so that any more while it shows fold into it. I also made same-tick duplicates fold, which any repeated toast benefits from. In the browser, 11 buildings turning worn together gave one notice and one "×11" log line.
6. **Docs.** TODO.md's rough edges. The scripted player has `service`, off by default.

Choices the task left open:

- **`wornUntilDay` is a date, not a countdown** like `repairDaysRemaining`. A countdown would change `placedBuildings` every day that anything is worn, which is most days, and redraw the memoized map each time.
- **Rebels or a flood taking a worn building drop its wear.** It can't be serviced while they hold it, so it shouldn't come back due to break. No test covers the flood's one line; the rebels' does.
- **The notice pops up at all** (`toast: "always"`). Without it a player away from the map would learn of the wear only from the log. If the owner finds it noisy, `toast: "never"` in `eventKinds.ts` is one word.

### Checks

- `npx tsc -b`: exit 0, no output.
- `npm run lint`: the five known warnings and no others (`useGameClock.ts:53`, `Gauge.tsx:125`, `BuildingIcon.tsx:8`, `ResourceIcon.tsx:5`, `App.tsx:333`).
- `npm run build`: built in 696ms.
- `npm test`, final code, four full runs: three gave Test Files 33 passed (33), Tests 483 passed (483). One failed on a timeout, below. Before this work: 30 files, 426 tests were recorded after task 03.

**The intermittent failure.** Run 3 failed `tests/interruptions.test.ts > stops in a careful game's first six months on Normal > are fewer, by one for each story letter joined to its briefing` with "Test timed out in 5000ms". An earlier full run, before the seed change below, also failed `tests/balance.test.ts > following one path > research path industry-precision leaves the country standing`; my filter hid its error, so I can't say it was a timeout, but that group passed when run alone. Both are several scripted games on the default 5-second limit, with every test file running at once. This is probably the unidentified failure already seen on this code, but that isn't proven. I left the limits alone.

**One test changed.** `tests/army.test.ts`, "happens in a played game, lost to neglect and won back by the army", failed every time on seed 35: wear changes how the random numbers fall, and in that game no province was lost. It now uses seed 8. Of the first 60 seeds, 30 lose a province and 16 win one back, so the story still happens. I have no count for those seeds before the change. The test's comment records an earlier seed change for the same reason.

### Screenshots

Not committed. All in `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\worn\`:

- `repairs-1440.png`, `repairs-1000.png`: the Repairs list, broken and worn together
- `repairs-1000-after-service.png`: after paying for one
- `map-land-1440.png`, `map-land-1000.png`, `map-land-closeup.png`: worn buildings on the land
- `map-icons-1440.png`: the province icons, amber beside red
- `notice-1440.png`: the notice, with eleven buildings worn at once (forced by a patched `Math.random`, which is why so many are marked)
- `log-1440.png`: the folded log line. It shows an earlier wording, "Homes in East Marrow Coast is worn", changed afterwards because it read badly. The new wording was not looked at in a browser.

These use a save edited to have worn buildings. The look is new, and `CLAUDE.md` asks that the owner picks from screenshots before building. The task asked for it to be built, so these are for the owner to judge.

### Could not verify, and left open

- **Scripted players service everything or nothing**, so nobody has measured a player who chooses, which is the point of the feature. Nor do they build the larger buildings.
- **An old grammar fault:** the existing log line "Homes in X has broken down" reads badly. Left alone.
- **The flood dropping wear** has no test, and the Build tab's "!" was read from its hint text, not seen in a screenshot.
- **Left alone, out of scope:** the advisor and "Next problem" don't mention worn buildings. `GAME_DESIGN.md` ("Buildings wear out at random and need repairs") and `TECHNICAL_DESIGN.md`'s list of conditions don't mention wear. TODO.md's `balance.test.ts` line still gives an older ladder (15 and 27, 4 and 26, 0 and 13, 0 and 3). `npm ci` reports 6 known vulnerabilities in dependencies.

