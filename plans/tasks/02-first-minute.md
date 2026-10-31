# 02: The first minute

Branch: `task/02-first-minute`. Read `CLAUDE.md` first.

## Why

A new game on Normal starts paused, with 0 Cr and debt, and the first objective asks for something the player cannot pay for ("Repair what was left broken", then "Build a farm"). The default level is now Easy, which starts with 1,500 Cr, but Normal and above start empty. The hard start is deliberate, so keep it, but a new player must be able to see what to do next. The playtester saw this before the repair objective was added, so that step needs the same care.

## What to do

The Objectives panel (`src/presentation/components/Objectives.tsx`) should guide the real sequence when the current step can't be paid for:

1. While the game is paused at the start with nothing affordable, say to start the clock, and name the control (Space or Resume).
2. When a step's cost is out of reach, show what it costs and roughly how long until it can be paid at today's income. Reuse `getDaysToSave` and `getProjectAffordability` rather than writing new sums.
3. When it becomes affordable, go back to the existing "Go" button.

Keep the wording to a line. Check it for all three nations on Normal and on Easy. Easy starts with money, so the guidance should not appear there unless it's needed.

## Out of scope

Starting money, debt, building costs or any other number. Changing the order of the objectives. New windows or tabs. Tips that appear on their own.

## Done when

- A test covers each state: start paused, can't pay, can pay.
- All checks in `CLAUDE.md` pass.
- Results include browser screenshots of the first minute on Normal, in each state, at a normal window and at about 1000px wide, with their file paths.

## Stop and ask if

The first step would still take the player an unreasonably long time to afford (over about 30 game days on Normal, for any nation). That would be a balance question for the owner. Report the measured days under Results.

## Results

### What changed

- `src/application/getObjectiveGuidance.ts` (new) decides what to say about a step of The First Winter that can't be paid for. Repair, farm and homes have prices. It reuses `getDaysToSave`, `getRepairCost`, `canRepairBuilding`, `canBuild`, `planBuyAndBuild`, `upfrontCost` and `getBuildCost`.
- `src/presentation/components/Objectives.tsx` and `Objectives.css` show that as one line under the lit step, in place of "Go ›". The step can still be clicked to open where it's done. Hovering the wait says "At today's income".
- `src/application/startNewGame.ts` exports `STARTING_DATE`.
- `tests/objectiveGuidance.test.ts` (new) covers each state.

The lines the player can read:

| State | Line |
|---|---|
| Paused on the first day, step can't be paid for | Start the clock: Space or Resume. |
| Money short | 325 Cr to start. Enough in 10 days. (or "Enough tomorrow.") |
| Money short, treasury not rising | 325 Cr to start. The treasury is not rising. |
| Money there, goods short and market can't supply them | Needs 1 more wood to start. |
| Can be paid for | No line: the existing "Go ›" |

Two choices beyond the wording of the task:

- **The Also line carries the guidance too.** Trouble in the Streets opened between Jan 5 and Jan 10 on Normal in all three browser runs, took the card and moved The First Winter to the Also line. Without this the guidance would have gone away after a few days.
- **`getProjectAffordability` is not used.** The task asked to reuse it, but it only answers whether a project already under way can pay tomorrow's instalment. A farm counts as built once it's ordered, so a step never has such a project waiting. `netTreasury` already takes instalments off, so `getDaysToSave` includes them.

### Measured days (stop condition not reached)

Scripted through `simulateDay` with no other spending, seeds 1 to 3, day counted from the start. The stop condition is over about 30 days to afford the first step.

| Normal | First repair payable | Both repairs paid | Farm started | Homes started |
|---|---|---|---|---|
| Astravia | day 11 to 14 | day 23 to 26 | day 34 to 40 | day 41 to 47 |
| Caldenreich | day 11 to 14 | day 22 to 26 | day 33 to 39 | not by day 120 (see below) |
| Veldoria | day 11 to 14 | day 22 to 26 | day 33 to 38 | not by day 120 (see below) |

The range is seed 2, where a home broke on day 3 and took the first money. Each repair is 325 Cr and 6 ore. In the browser, hiring one officer first (30 Cr), the repair was payable on Jan 14 for all three nations.

The owner may want to judge one number: the step only ticks when the crews finish, 10 days after paying, so "Repair what was left broken" completes around day 32 to 36. It can be afforded inside 30 days, so I did not stop, but it is close.

### Checked for all three nations

| | Astravia | Caldenreich | Veldoria |
|---|---|---|---|
| Normal, Jan 1, paused | Start the clock | Start the clock | Start the clock |
| Normal, Jan 2, paused | 325 Cr, Enough in 10 days | same | same |
| Normal, can pay | Go › on Jan 14 | Go › on Jan 14 | Go › on Jan 14 |
| Easy, Jan 1, paused | Go ›, no line | Go ›, no line | Go ›, no line |

In every browser check the line fitted the panel on one line, the page did not scroll sideways, and there were no console errors, at 1440x900 and 1000x760. Space started and paused the clock.

### Checks

- `npx tsc -b`: exit 0, no output.
- `npm run lint`: exit 0, the five known warnings and no others (`useGameClock.ts:53`, `ResourceIcon.tsx:5`, `App.tsx:328`, `BuildingIcon.tsx:8`, `Gauge.tsx:125`).
- `npm run build`: exit 0, "built in 403ms".
- `npm test`: "Test Files 30 passed (30), Tests 433 passed (433)".

### Screenshots

Not committed. All are in `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\first-minute\`, named `normal-<nation>-<normal|narrow>-<state>.png` for `astravia`, `caldenreich` and `veldoria`. "normal" is 1440x900 and "narrow" is 1000x760. The states are `1-start-paused`, `2-cant-pay`, `2b-cant-pay-also-line` and `3-can-pay`. Easy is `easy-<nation>-normal-start.png`. For example:

- `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\first-minute\normal-astravia-normal-1-start-paused.png`
- `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\first-minute\normal-astravia-narrow-2-cant-pay.png`
- `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\first-minute\normal-caldenreich-narrow-2b-cant-pay-also-line.png`
- `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\first-minute\normal-veldoria-narrow-3-can-pay.png`
- `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\first-minute\easy-astravia-normal-start.png`

### Could not verify

- In the browser I saw only the repair step. The farm, homes, wood and "treasury is not rising" lines are covered by tests, with the words checked in rendered markup, but not looked at on screen.
- Hard and Ruthless were measured for days (similar to Normal) but not looked at in the browser.
- No real player has read the wording.

### Left open (found, not changed)

- **Caldenreich and Veldoria make no wood.** Starting stock is 15. A farm's first payment and instalments use most of it, and homes need 7 to start, so those two nations can't start homes until the market opens, even on Easy with money in hand. The objectives now say "Needs 1 more wood to start", and once the market is open it counts as payable by buying. The scripted run above never buys, which is why it shows no homes by day 120. Whether this is intended is a balance question for the owner.
- **The repair step stays lit with "Go ›" for 10 days after both repairs are paid**, with nothing left to do there, because a building under repair still counts as not repaired. This holds back the farm step's guidance too. Changing it means changing the objective, so I left it.
- **On a running first day the wait reads 8 days, then 10 the next day.** Income shows +44/d on Jan 1 and +29/d from Jan 2 on the top bar too, for all three nations. It lasts one tick and I did not trace the cause.
- **A step that wraps to two lines next to "Go ›"** ("Repair what was left broken" at this width) lets the connecting line run over its number. This was already there.
- **The folded panel shows no guidance.** A player who folded it earlier starts a new game folded and won't see the line.
- **Other steps with a price have no guidance yet**: "Build a school", "Build a farm in Thornwick", the harbour steps. Their Go still leads to the Build window, which gives its own reason and wait. "Hire a police officer" costs 30 Cr, about a day's income, so I left it out.
