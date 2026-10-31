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

