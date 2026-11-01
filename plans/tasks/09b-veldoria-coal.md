# 09b: Veldoria's extra coal

Branch: `task/09b-veldoria-coal`. Read `CLAUDE.md` first, and Results in `plans/tasks/09-heating.md`. Runs alone, after task 08b is merged.

## What the owner decided (2026-11-01)

Veldoria starts with 60 extra coal. It digs none, and since wood burns five times worse it goes cold in 8 of 16 second winters and 7 of 9 third winters when played carefully on Normal.

## What to do

1. Add `veldoria: 60` to `STARTING_EXTRA_COAL` in `src/domain/constants.ts`, and update any test that says Astravia alone gets extra coal.
2. Add it to Veldoria's `startingBonus` in `src/domain/nations/nationData.ts`, as Astravia's already says: "+15% industry output, and more coal."
3. Measure, against the figures at the start of this task:
   - The 27-game ladder by nation, as Astravia, Caldenreich, Veldoria, on the ladder seeds and on seeds 11 to 19.
   - Veldoria's first, second and third winters, careful, at each level: games cold, median and worst cold days, wood burned, coal bought and what it cost.
   - Whether the autumn warning still shows for Veldoria in its first autumn.
4. Update the ladder in `src/domain/difficulty/difficultyData.ts` and the `balance.test.ts` line and rough edges in `TODO.md`, if the figures moved and are within the limits. Check each level's `summary` still holds, and report if not. Do not rewrite them.

## Out of scope

Astravia's coal, the heat shares, levels and prices.

## Done when

- A test states each nation's starting coal.
- All checks in `CLAUDE.md` pass.
- Results report the figures above.

## Stop and ask if

The ladder moves by more than 3 wins of 27 at any level, or Hard falls below what `balance.test.ts` allows. Do not change that bound.

## Results

**Done. No stop and ask: Normal rose by 3 of 27, exactly at the limit and not over it, and Hard stayed at 7.** Normal's summary, "about half", no longer quite holds. That is the owner's to change.

### What changed

- `constants.ts`: `STARTING_EXTRA_COAL` is `{ astravia: 120, veldoria: 60 }`, with its comment. Veldoria starts with 140 coal, Astravia 200 and Caldenreich 80.
- `nationData.ts`: Veldoria's `startingBonus` is "+15% industry output, and more coal."
- `tests/heating.test.ts`: "goes to Astravia alone" became one test stating all three nations' starting coal as figures.
- `difficultyData.ts` and the `balance.test.ts` line in `TODO.md`: Normal is 0 and 20.
- `TODO.md`: the Veldoria entry now records the decision and its figures. Two new rough edges: "about half" on Normal, and what a coal order costs. The Hard bound and the test's other bounds are untouched.

### The 27-game ladder

By nation is Astravia, Caldenreich, Veldoria. The baseline was replayed on `d05a6c4` first and matches the record on every level, on both seed sets and by nation.

Ladder seeds:

| Level | Before | Now | Sloppy now (before) | Careful now (before) |
|---|---|---|---|---|
| Easy | 14 and 27 | 14 and 27 | 5, 8, 1 (same) | 9, 9, 9 (same) |
| Normal | 0 and 17 | **0 and 20** | 0, 0, 0 (same) | 7, 8, **5** (7, 8, 2) |
| Hard | 0 and 7 | 0 and 7 | 0, 0, 0 (same) | 4, 3, 0 (same) |
| Ruthless | 0 and 2 | 0 and 2 | 0, 0, 0 (same) | 0, 2, 0 (same) |

Seeds 11 to 19:

| Level | Before | Now | Sloppy now (before) | Careful now (before) |
|---|---|---|---|---|
| Easy | 12 and 27 | 12 and 27 | 5, 7, 0 (same) | 9, 9, 9 (same) |
| Normal | 0 and 12 | **0 and 15** | 0, 0, 0 (same) | 3, 9, **3** (3, 9, 0) |
| Hard | 0 and 7 | 0 and 7 | 0, 0, 0 (same) | 2, 5, 0 (same) |
| Ruthless | 0 and 3 | 0 and 3 | 0, 0, 0 (same) | 1, 2, 0 (same) |

Game by game, all 216 Astravia and Caldenreich games on these seeds are identical to before (treasury, end date, every winter). Veldoria's games change, but the only wins that change are six careful ones on Normal, all from loss to win: ladder seeds 7, 1, 2, and seeds 16, 18, 19. So careful Veldoria on Normal goes from 2 to 8 of 18.

### Veldoria's winters, careful, both seed sets

18 games at each level. Each cell is before, then now. Winter 1 is January and February of year 1. Winter 2 is December of year 1 to February of year 2. Winter 3 is a year later. "Cold" is games with any cold day. The median is over all games reaching that winter, taking the upper middle game, which is how the 8 of 16 and 7 of 9 at the top of this task were counted. Wood, coal and cost are averages over those games, and coal bought is bought during that winter's months.

| Level, winter | Reached | Cold | Median cold days | Worst | Wood burned | Coal bought | Cost, Cr | Fell by spring |
|---|---|---|---|---|---|---|---|---|
| Easy, 1 | 18, 18 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 0, 0 |
| Easy, 2 | 18, 18 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 38, **0** | 2,278, **0** | 0, 0 |
| Easy, 3 | 18, 18 | 1, **0** | 0, 0 | 10, **0** | 0.4, 0 | 80, 59 | 5,053, 4,146 | 0, 0 |
| Normal, 1 | 18, 18 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 0, 0 |
| Normal, 2 | 16, 16 | 8, **0** | 4, **0** | 31, **0** | 3.2, 0 | 25, **0** | 1,487, **0** | 2, 2 |
| Normal, 3 | 9, 9 | 7, **4** | 16, **0** | 39, **19** | 3.6, 4.0 | 59, 50 | 3,309, 3,083 | 0, 0 |
| Hard, 1 | 18, 18 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 0, 0 |
| Hard, 2 | 8, 8 | 4, **0** | 3, **0** | 20, **0** | 3.4, 0 | 23, **0** | 1,141, **0** | 3, 3 |
| Hard, 3 | 5, 5 | 5, **3** | 23, **17** | 27, 38 | 5.1, 1.9 | 20, 26 | 874, 1,396 | 3, 1 |
| Ruthless, 1 | 18, 18 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 0, 0 | 0, 0 |
| Ruthless, 2 | 6, 6 | 4, **0** | 24, **0** | 35, **0** | 6.0, 0 | 10, **0** | 481, **0** | 2, 3 |
| Ruthless, 3 | 0, 0 | none | none | none | none | none | none | none |

The 60 coal carries the second winter on every level: nobody goes cold or burns wood, and nobody buys coal. The bill comes in the third winter, as it does for Astravia, at about 62 Cr a coal on Normal. Veldoria burns almost no wood in any case: it has little. The fourth winter on Normal, from the same games: cold in 7 of 8 before and 5 of 9 now, median 29 and 3 days, worst 57 and 25. The Hard third winter's worst rose from 27 to 38 days, on five games.

### The autumn warning

**It no longer shows in Veldoria's first autumn, with one exception.** Warned, of games reaching that autumn, now (before):

| Level | Careful, first | Careful, second | Careful, third | Sloppy, first |
|---|---|---|---|---|
| Easy | 0 of 18 (18 of 18) | 18 of 18 | 18 of 18 | 0 of 17 (17 of 17) |
| Normal | 0 of 17 (17 of 17) | 9 of 9 | 9 of 9 | 1 of 12 (12 of 12) |
| Hard | 0 of 13 (13 of 13) | 5 of 5 | 4 of 4 | 0 of 9 (9 of 9) |
| Ruthless | 0 of 13 (12 of 13) | none reached | none reached | 0 of 7 (7 of 7) |

The one exception is a sloppy game on Normal, from 22 November. On 1 September of year 1 Veldoria holds 96.8 coal on Easy and 101.5 elsewhere (36.8 and 41.5 before). From its second autumn it is warned on 1 September as a rule, holding about 26 coal on Normal. That is true, as the coal is then gone. Measured by the rule (`isWinterFuelShort`) each day, not on screen.

### Do the start-screen summaries hold?

- Easy, "Room to learn": yes. 27 careful of 27, and 14 and 12 sloppy.
- **Normal, "A careful player wins about half the time": less so.** 20 of 27 on the ladder seeds and 15 of 27 on the others, 35 of 54 together, or 65%. It was 29 of 54. By nation over 18 seeds it is 10, 17, 8. `balance.test.ts` allows 12 to 22, so the test passes. Not rewritten, as the task says.
- Hard, "about one game in four": yes, 7 of 27 on both seed sets.
- Ruthless, "Not every country can be saved": yes, 2 and 3 of 27. Veldoria still wins none on Hard or Ruthless.

### The coal order check, rerun at 5 to 1

As in `10-trading-orders.md`, "Coal ahead of winter": a buy order with "stock under 150", set before day 1, careful scripted game, Easy, seed 20261015. Coal on 1 December of years 1, 2, 3.

| Nation, price limit (of base, 22 Cr) | Recorded in task 10 | On `d05a6c4` | Now |
|---|---|---|---|
| Astravia, no order | 20, 0, 0 | 140, 43, 0 | 140, 43, 0 |
| Astravia, 1.0 | 70, 100, 80 | 150, 153, 121 | 150, 153, 121 |
| Astravia, 1.15 | 150, 153, 151 | 150, 153, 151 | 150, 153, 151 |
| Caldenreich, no order | 360 to 789 | 360, 571, 789 | 360, 571, 789 |
| Veldoria, no order | 37, 2, 2 | 37, 2, 2 | 97, 22, 1 |
| Veldoria, 1.15 | buys nothing | buys nothing by these dates: 37, 2, 2 | buys nothing by these dates: 97, 22, 1 |
| Veldoria, 1.3 | 62, 102, 151 | 62, 102, 151 | 122, 47, 41 |
| Veldoria, 1.5 | 152, 152, 152 | 152, 152, 152 | 152, 152, 151 |

Astravia's earlier gap is its 120 coal, which task 10 did not have. So the limit still works at 5 to 1, and the price limit still decides how fast it fills. Note Veldoria at 1.3 now: it no longer reaches the limit by the second or third December. On this one seed nobody goes cold in winters 2 to 4 now, with or without an order, except that before this task Veldoria with no order, or an order at 1.0 or 1.15, had 4 cold days in winter 4. Astravia with no order burns 296 and 210 wood in winters 3 and 4, and with 1.15 none.

One seed on Easy can't answer whether an order keeps a country warm, so I also ran it over both seed sets, 18 games a cell, on the final code. Games cold, of those reaching winters 2, 3 and 4, and careful wins of 18:

| Level, nation | No order | 1.0 | 1.15 | 1.3 | 1.5 |
|---|---|---|---|---|---|
| Normal, Astravia | 0/18, 0/11, 2/10; 10 wins | 0/18, 0/12, 3/12; 11 | 0/18, 0/13, 1/13; 11 | 0/18, 0/10, 1/10; 8 | 0/18, 0/10, **0/9**; 8 |
| Normal, Caldenreich | never cold; 17 wins | never; 17 | never; 17 | never; 17 | never; **13** |
| Normal, Veldoria | 0/16, 4/9, 5/9; 8 wins | 0/14, 2/7, 2/6; 5 | **0/15, 0/8, 0/7**; 7 | **0/14, 0/7, 0/7**; 4 | **0/13, 0/7, 0/6**; 4 |
| Hard, Astravia | 0/18, 1/7, 4/7; 6 wins | 0/18, 1/7, 4/7; 4 | 0/18, 0/6, 1/5; 4 | 0/17, 0/6, 0/4; 3 | 0/17, 0/7, 0/3; 2 |
| Hard, Caldenreich | never cold; 8 wins | never; 8 | never; 8 | never; 7 | never; 8 |
| Hard, Veldoria | 0/8, 3/5, 2/4; 0 wins | 0/8, 1/2, 1/2; 0 | 0/9, 1/3, 1/2; 0 | 0/8, 1/3, 2/2; 0 | 0/7, 0/3, 0/1; 0 |
| Ruthless, Astravia | 0/18, 2/4, 1/4; 1 win | 0/18, 2/4, 2/4; 1 | 0/17, 1/3, 2/3; 2 | 0/17, 1/4, 2/3; 2 | 0/17, 0/3, 0/3; 2 |
| Ruthless, Caldenreich | never cold; 4 wins | never; 6 | never; 5 | never; 3 | never; 2 |
| Ruthless, Veldoria | 0/6, none later; 0 wins | 0/3; 0 | 0/6, 0/1; 0 | 0/4; 0 | 0/4; 0 |

On Easy every nation wins 18 of 18 at every setting, and only Veldoria goes cold at all: 1 of 18 in winter 4, 1 day, with no order or at 1.0.

**So: yes, a buy order with a stock limit keeps a country warm, if the price limit is set high enough.**

- **Caldenreich** needs none. Its order buys almost only in the first year, before its own coal passes 150. At 1.5 on Normal it won 13 of 18 rather than 17.
- **Veldoria** on Normal: 1.15 of base or higher, and no game goes cold. At 1.0 it still does.
- **Astravia** on Normal: only 1.5 removes every cold day. At 1.15 and 1.3 one game goes cold in its fourth winter. Wood burned falls with the limit: winter 3 averages 261 with no order, 123 at 1.15, 42 at 1.3 and 6 at 1.5.
- **The price is real.** At 1.5 on Normal an order spends about 2,200 to 3,000 Cr a year in Veldoria, and 3,400 to 4,200 in Astravia from its second year, against an income of about 12,000 Cr. Wins fall at the loose limits: Veldoria from 8 to 4, Astravia from 10 to 8, and Astravia on Hard from 6 to 2. At 1.15 Veldoria stays warm for 1 win of 18, which is about noise. I did not trace why each game falls, so that the money is the cause is my reading, not a measurement. The scripted player leaves the order on all year and never lifts it when short of money, which a person would do.
- **A warm winter does not win Veldoria Hard or Ruthless**: no order setting gives it a win there.

### Checks, on the final code

Run once, in this order, before this Results section was written, which is the only change since. `npm test` did not fail, so there is no intermittent failure to record.

- `npx tsc -b`: no output, exit 0.
- `npm run lint`: the five known warnings only (`BuildingIcon.tsx`, `Gauge.tsx`, `ResourceIcon.tsx`, `useGameClock.ts`, `App.tsx`), exit 0.
- `npm run build`: "built in 315ms", exit 0.
- `npm test`: 38 files passed, 593 tests passed, in 96.74s, exit 0.

### Looked at in a browser

Headless Chrome on the production build, through "Start New Game" and a click on each nation, at 1400 and 1000 wide. Veldoria's flag reads "+15% industry output, and more coal." in one line, Astravia "Starts with an extra farm and more coal." and Caldenreich "Starts with higher stability." No sideways scroll and no console errors. Screenshots:

- C:/Users/lorta/AppData/Local/Temp/claude/c--Users-lorta-Documents-repos-Theworldgame/e368a804-c798-48e1-adaa-e1b647feed00/scratchpad/t09b/setup-veldoria-1400.png
- C:/Users/lorta/AppData/Local/Temp/claude/c--Users-lorta-Documents-repos-Theworldgame/e368a804-c798-48e1-adaa-e1b647feed00/scratchpad/t09b/setup-veldoria-1000.png

### How it was measured

A scratch test, not committed, played the same games as `balance.test.ts` with the same seeds, and wrapped `produceGoods`, `burnHeatingFuel`, `runMarketOrders` and `buyGood` to count without touching dice or state. Script and raw figures are in the session's scratchpad `t09b` folder. Orders were set through the same actions as the Market's buttons.

### Not verified, or left open

- **The Normal summary** is for the owner, as above. Normal now sits at 20 of 27 against a test ceiling of 22.
- **The autumn warning on screen.** Veldoria's was read from the rule, not seen on the bar in this task.
- **How a person uses an order.** Only one stock limit, 150, was measured, kept on all year by a script. Whether a real player sets the price limit high enough, or lifts it in time, is unmeasured. Nothing tells the player an order will fall short of its limit by winter, as task 10 already noted. Sloppy games with orders were not run.
- **Win counts with orders are small samples.** Each is 18 games, and a game can turn on small changes, so differences of 1 or 2 mean little.
- **`GAME_DESIGN.md` line 151** still says only "Astravia, with no hills, starts with 120 more coal." The task did not ask to change it, so I left it. It is one sentence.
- **The neighbours.** As with Astravia, the coal goes to Veldoria only as the player's country, not as a neighbour. Not touched.
- `.claude/settings.local.json` was already modified in this worktree before I began. It is not mine and is not in the commit.

