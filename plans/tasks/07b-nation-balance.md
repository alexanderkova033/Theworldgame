# 07b: Law requirements that fit the country, and Caldenreich's lead

Branch: `task/07b-nation-balance`. Read `CLAUDE.md` first, and Results in `plans/tasks/07-starting-countries.md`. Runs alone.

## Why

Countries now start with different populations, but the law requirements in `QUOTAS` (`src/domain/laws/lawData.ts`) name fixed populations from 10,000 to 14,000. Astravia meets the first Labour laws on day one, and Veldoria's stay shut for most of a game. Separately, Caldenreich now wins all 18 careful games on Normal.

## What the owner decided (2026-11-01)

1. Population requirements scale with each country's starting size.
2. Caldenreich's starting stability bonus drops from +10 to +5, only if it is still winning nearly everything after the first change. In this task, "nearly everything" means 16 or more of 18 careful games on Normal.

## What to do

1. **Scale the requirements.** A law's population requirement becomes its listed threshold times the nation's `startingPopulation`, divided by 10,000, in one function that everything reads. Check `lawsRules.ts` (the status and `getQuotaProgress`), the Laws window, the tree hints and the scripted player. Only `population` requirements change. The text shown to the player must give the scaled number. Old saves use their own nation's figure.
2. **Measure** careful wins by nation over all 18 seeds (ladder seeds and 11 to 19) on Normal, Hard and Ruthless, against the table in task 07's Results. Normal, Astravia, Caldenreich, Veldoria was 10, 18, 5.
3. **Caldenreich.** If it wins 16 or more of 18 on Normal, set `caldenreich: 5` in `STARTING_STABILITY_BONUS` (`src/application/startNewGame.ts`) and measure again. Keep the neighbour in step (`createNeighbour` in `neighbourRules.ts` has its own 70 against 60). Otherwise leave it, and say so.
4. **Record the result.** Update the ladder in the comment in `difficultyData.ts` and the `balance.test.ts` line and rough edges in `TODO.md`. Check each level's `summary` still tells the truth: Normal says a careful player wins about half the time, and Hard about one game in four. Report any that no longer fit. Do not rewrite them or retune levels.
5. **Caldenreich's opening view.** Playing Caldenreich, Astravia's name at sea is cut off at the bottom by about 30px, and there is empty sea at the top. Move that nation's opening view so every name is in view at 1440x900 and 1000x760, with its own land still fully shown. See `tests/nationSeaNames.test.ts`. If that isn't possible at both sizes, get as close as you can and report it.

## Out of scope

Difficulty settings, starting populations, wood, law prices, and other nations' bonuses.

## Done when

- Tests cover: the scaled requirement for each nation, the status and progress reading it, and old saves.
- All checks in `CLAUDE.md` pass.
- Results report the by-nation tables and the 27-game ladder.

## Stop and ask if

The ladder moves by more than 3 wins of 27 at any level against the task 07 figures (Easy 10 and 27, Normal 0 and 18, Hard 0 and 7, Ruthless 0 and 3), or a nation can't win any careful game on Normal.

## Results

Done. No stop condition was hit. Caldenreich's bonus was cut to +5, and it still wins 16 of 18 on Normal.

### What changed

- **Requirements:** `getQuotaThreshold` in `src/domain/laws/lawsRules.ts` is the one function: the listed figure times the nation's `startingPopulation`, over `LAW_QUOTA_BASE_POPULATION` (10,000, in `constants.ts`). Only `population` rows change. The status, `getQuotaProgress` and all of `LawsPanel.tsx` read it, so nothing outside that function reads `node.quota.threshold`. The scripted player goes through `canEnactLaw` and the tree hints through the status, so neither needed a change.
- **Caldenreich:** `caldenreich: 5` in `STARTING_STABILITY_BONUS`, and 65 against 60 in `createNeighbour`.
- **Opening view:** `homeView` in `mapCommon.ts` now takes the nation. `HOME_VIEW_SOUTH` sets Caldenreich's view 60 map units south of the middle of its land. No other nation's view moved. Reset returns to the same place.
- **Records:** the ladder in `difficultyData.ts`, and the ladder line and two entries in `TODO.md`. I added "pass no laws" to what that comment says the scripted players leave out.
- **Tests:** new `tests/lawQuotas.test.ts`. `tests/nationSeaNames.test.ts` now checks every name and your own land in the opening view at both panel sizes. With the shift removed it fails, naming Astravia's name playing Caldenreich. `tests/startingCountries.test.ts` now checks that a nation's stability matches as player and as neighbour.

Scaled figures (none needed rounding):

| Listed | Row | Astravia | Caldenreich | Veldoria |
| --- | --- | --- | --- | --- |
| 10,000 | Labour I | 12,000 | 10,000 | 8,000 |
| 10,500 | Labour II | 12,600 | 10,500 | 8,400 |
| 11,500 | Order III | 13,800 | 11,500 | 9,200 |
| 11,800 | Food IV | 14,160 | 11,800 | 9,440 |
| 12,300 | Food V | 14,760 | 12,300 | 9,840 |
| 13,000 | Food VI | 15,600 | 13,000 | 10,400 |
| 14,000 | Food VII | 16,800 | 14,000 | 11,200 |

### The main thing to know about these measurements

**The ladder games pass no laws.** `playCarefully` only passes one when given `follow`, and the ladder never gives it. So scaling could not move these games, and it did not: every total under "Scaling only" below, and the ladder's sloppy and careful totals on both sets of seeds, match task 07's figures. The tables say nothing about whether the requirements are now fair. The two tables under "Games that pass laws" are the only evidence on that, and they come from a temporary script.

### Careful wins by nation

All 18 seeds (ladder seeds and 11 to 19), as Astravia, Caldenreich, Veldoria, out of 18 each.

| | Task 07 | Scaling only | Scaling and +5 | In all, of 54 |
| --- | --- | --- | --- | --- |
| Easy | not run | 18, 18, 18 | 18, 18, 18 | 54 |
| Normal | 10, 18, 5 | 10, 18, 5 | **10, 16, 5** | 31 |
| Hard | 5, 11, 0 | 5, 11, 0 | **5, 8, 0** | 13 |
| Ruthless | 5, 2, 0 | 5, 2, 0 | **5, 4, 0** | 9 |

**Caldenreich:** 18 of 18 after scaling, which is 16 or more, so the bonus was cut. After the cut it is 16 of 18, so by the same measure it still wins nearly everything. The task asked for one cut, so I went no further. Astravia and Veldoria did not change at any level.

Ruthless went up for Caldenreich, from 2 to 4, with less stability. That goes against the cut's purpose. I did not trace it. Two games of 18 could well be chance.

### The 27-game ladder

Nine ladder seeds, every nation, sloppy and careful.

| | Recorded before | Task 07 | Now | Move against task 07 | By nation, now |
| --- | --- | --- | --- | --- | --- |
| Easy | 12 and 27 | 10 and 27 | **12 and 27** | sloppy +2 | sloppy 4, 8, 0; careful 9, 9, 9 |
| Normal | 0 and 15 | 0 and 18 | **0 and 17** | careful -1 | careful 6, 8, 3 |
| Hard | 0 and 7 | 0 and 7 | **0 and 5** | careful -2 | careful 3, 2, 0 |
| Ruthless | 0 and 3 | 0 and 3 | **0 and 3** | none | careful 2, 1, 0 |

The largest move is 2, inside the limit of 3. Seeds 11 to 19: Easy 13 and 27, Normal 0 and 14, Hard 0 and 8, Ruthless 0 and 6. Sloppy won nothing above Easy on any seed.

Hard's 5 is exactly the lowest `balance.test.ts` allows, so one more lost game on these seeds fails the test. I did not change the bound.

### Whether each level's summary still tells the truth

Reported only. I rewrote none of them.

| Level | Says | Measured | Verdict |
| --- | --- | --- | --- |
| Easy | Room to learn, mistakes cost less | careful 54 of 54, sloppy 25 of 54 | Fits |
| Normal | A careful player wins about half the time | 17 of 27 (63%), other seeds 14 of 27 (52%), all 31 of 54 (57%) | Fits overall, on the high side. Not for each nation: 56%, 89%, 28% |
| Hard | About one game in four | 5 of 27 (19%), other seeds 8 of 27 (30%), all 13 of 54 (24%) | Fits overall. Not for each nation: 28%, 44%, 0% |
| Ruthless | Not every country can be saved | 9 of 54, Veldoria 0 of 18 | Fits |

The test titles in `balance.test.ts` fit less well: Hard's says "about a third of its games". I left it, as the task names only the summaries.

### Games that pass laws (temporary script, not committed)

Careful player on Normal, 18 seeds. I rebuilt the old figures per nation under the same code, to compare. Wins and average laws passed, as Astravia, Caldenreich, Veldoria. Caldenreich's stability bonus is +5 in both columns.

| Path followed | Wins, listed figures | Wins, scaled | Laws, listed | Laws, scaled |
| --- | --- | --- | --- | --- |
| Labour: Output | 14, 13, 4 | 14, 13, 3 | 2.2, 2.4, 0.4 | 2.2, 2.4, 1.3 |
| Labour: Protection | 14, 17, 4 | 14, 17, 4 | 1.9, 2.3, 0.4 | 2.1, 2.3, 1.4 |
| Food: Husbandry | 11, 16, 1 | 11, 16, 1 | 2.4, 3.3, 1.3 | 2.5, 3.3, 1.3 |
| Order: Justice | 13, 16, 8 | 13, 16, 4 | 4.3, 4.1, 1.2 | 4.1, 4.1, 2.1 |

Veldoria gets its laws, about three times as many on the Labour paths, but does not win more. It wins fewer on Justice (8 to 4), though four games of 18 may be chance. I did not trace why. Astravia's wins did not change on any path, though its first rows came later.

The first day people reached a figure, careful player passing no laws, median of the games that got there before they ended:

| | Astravia, before | Astravia, now | Veldoria, before | Veldoria, now |
| --- | --- | --- | --- | --- |
| Labour I | day 1 | day 1 | day 1,217 (5 of 18) | day 1 |
| Labour II | day 1 | day 510 (10 of 18) | day 1,427 (5 of 18) | day 480 (10 of 18) |
| Order III | day 1 | day 1,024 (10 of 18) | never | day 913 (6 of 18) |
| Food VII | day 1,086 (10 of 18) | never | never | never |

Caldenreich is unchanged: Labour I on day 1, Labour II on day 331, and Food VII on day 1,413 in 17 of 18.

### Caldenreich's opening view

Measured in the browser. Gap in screen pixels from the lettering to the edge of the map panel. A minus means cut off.

| Window | Astravia's name, bottom | Its party line, bottom | Own land, top | Own land, bottom | Own land, each side |
| --- | --- | --- | --- | --- | --- |
| 1440x900, before | -29 | -41 | 247 | 247 | 483 |
| 1440x900, now | **31** | **19** | 186 | 307 | 483 |
| 1000x760, before | -23 | -32 | 189 | 189 | 319 |
| 1000x760, now | **24** | **14** | 143 | 235 | 319 |

The other names now: at 1440x900, Caldenreich 136 from the top and Veldoria's party line 132 from the bottom. At 1000x760, 104 and 100. Neither of them is under the map's buttons. Astravia's and Veldoria's opening views did not change, and nothing is cut off in them: the closest is Caldenreich's name 7 and 5 from the top when playing Astravia, as before. A neighbour's party differs by load, so the party line is not the same one in both rows: Merchants' Assembly before, Harvest Union now. I did not measure Merchants' Assembly after the move. The 60 units come to about 60px and 46px, which would leave it about 19 and 14.

Caldenreich's land now sits above the middle of the panel, which is what makes room for the rest of the continent and its names.

### Checks

`npx tsc -b`: exit 0, no output.

`npm run lint`: exit 0, the five known warnings and no others (`ResourceIcon.tsx:5`, `Gauge.tsx:125`, `BuildingIcon.tsx:8`, `useGameClock.ts:53`, `App.tsx:333`).

`npm run build`: exit 0, "built in 296ms".

`npm test`, one full run, no intermittent failures:

```
 Test Files  36 passed (36)
      Tests  535 passed (535)
```

After that run only `TODO.md` and this file changed.

In the browser, Laws window, all three nations at 1440x900 and 1000x760, no console errors. With the nation short of people, the details read:

- Astravia at 11,000: "Unlocks when population reaches 12k." "Population 11k / 12k". On the tree: "Needs population 12k".
- Caldenreich at 9,000: "reaches 10k", "Population 9,000 / 10k", "Needs population 10k".
- Veldoria at 7,500: "reaches 8,000", "Population 7,500 / 8,000", "Needs population 8,000".

### Screenshots

Not committed. All in `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\task07b\`:

- `shots-before\caldenreich-1440.png`, `shots-before\caldenreich-1000.png`, and the same for the other two nations.
- `shots-after\caldenreich-1440.png`, `shots-after\caldenreich-1000.png`, and the same for the other two nations.
- `shots-laws\astravia-1440.png`, `shots-laws\veldoria-1000.png`, and the rest of the six.

### Could not verify

- **Real play:** the saves were edited and paused. No real player has tried this, and every balance figure comes from scripted players, who build none of the larger buildings and service nothing.
- **Other window sizes:** only 1440x900 and 1000x760 were tried. The margin at 1000x760 is 14px. A shorter window has less: the new test holds it to the panel sizes those two windows give.
- **Lower rows on the tree:** in the browser I saw only the first Labour law's text. The test and the scaling cover the others, which share the same code.
- **The measuring scripts** were temporary and are not committed, so the committed balance test still only covers the 27-game totals. They are kept beside the screenshots (`summarise.cjs`, `summarise-laws.cjs`), but the test files themselves were deleted.

### Left open (found, not changed)

- **Caldenreich still leads:** 16 of 18 on Normal against 10 and 5. If the owner wants it lower, another cut is theirs to decide. Veldoria still wins nothing on Hard or Ruthless.
- **Every country now meets Labour I on day one**, unless it loses people first. The Why above named this as a fault in Astravia. It follows from the owner's rule, and Caldenreich always had it, but it does mean the first law's requirement stops doing anything.
- **The top Food row is out of reach in two nations.** A careful player passing no laws never reached it in Astravia (16,800) or Veldoria (11,200) before the game ended, and did in 17 of 18 in Caldenreich. Caldenreich grows faster, for reasons I did not trace. Astravia loses the most from this: 14,000 used to come at about day 1,086.
- **Rounded figures in the Laws window:** from 10,000 up, numbers are compact, so "Population 12k / 12k" can show while a law is still locked (at 11,960, say). This is the one number format doing its job, and it was already so for Caldenreich, but Astravia now sees it on its first rows.
- **`gameSave.ts` defaults a missing population to 10,000**, as task 07 noted. A save with no figure at all now counts it against its own nation's requirement.

