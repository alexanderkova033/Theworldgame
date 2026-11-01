# 11: Trained workers, and choosing who works where

Branch: `task/11-trained-workers`. Read `CLAUDE.md` first. Runs alone, after every other task on the list. Owner's list item 7.

## What the owner decided (2026-10-31)

- People trained for factories are worse at farming than farmers. A country has a set number of farmers and factory workers. Everyone else starts at poorer efficiency.
- They improve with time in the job, reaching full efficiency in about a year.
- The player chooses how many people work where, among the places available, for **the whole country**, not per province.
- People who are moved finish the month in their previous job. The move takes effect when the month ends.
- Servicing a worn building (`src/application/actions/serviceBuilding.ts`) needs a couple of workers. If they are untrained, the service is slower and costs more. Today a service costs `SERVICE_COST_SHARE` (0.3) and is done at once.

## Today

`getLabourSituation` (`src/domain/labour/labourRules.ts:91`) fills jobs automatically, province by province, in sector order (`food`, `school`, `industry`), locals first and then commuters. It gives each building a staffing share, which production uses. All workers are the same.

## What to do, in two stages

**Stage 1: a design note, then stop.** This changes how every farm and factory works, so write the plan under Results before changing any code, and finish. Cover:

- The state: how trained people are counted per sector, and how they improve month by month. Consider what happens to training when people die, leave, or move between jobs.
- The numbers: starting trained shares per nation, the efficiency of an untrained worker (start from 60%), and the time to full efficiency. All in `constants.ts`.
- How a country-wide choice maps onto the existing province-by-province filling, without losing commuting, islands or uprisings.
- The default when the player chooses nothing, which should behave close to today's filling.
- What moving people looks like with the month's delay, including what the player sees between choosing and the month's end.
- Where the control lives: in Build's People section, with no new window. A rough sketch in words is enough.
- Service crews: what "a couple of workers" means at this game's scale (a farm employs 300), where they come from, how long a service takes with trained and untrained crews, how much more an untrained one costs, and whether the building keeps working and its wear clock stops meanwhile. A service that takes time and people is weaker than today's, so say whether 0.3 still suits. Repairs stay as they are unless you argue otherwise.
- The scripted players, old saves (which load as fully trained on today's filling), and the balance risk you expect.

**Stage 2**, once the note is agreed: build it.

## Out of scope

New sectors, schools training workers, or wages (raise these as ideas under Results if they fit).

## Done when (stage 2)

- Tests cover: efficiency by training, improvement over time, the month's delay, the country-wide choice, service crews trained and untrained, and old saves.
- All checks in `CLAUDE.md` pass.
- Results report the 27-game ladder for each nation against `difficultyData.ts`, and screenshots of the control with their file paths.
- `TODO.md`, `GAME_DESIGN.md` and `TECHNICAL_DESIGN.md` are updated.

## Stop and ask if

The ladder moves by more than 3 wins of 27 at any level. Report the figures and what you would change. Do not retune the levels yourself.

## Results

