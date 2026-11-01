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

### Stage 1: design note, for the owner to agree. No game code has changed.

### In short

- **Two trades.** The country keeps one count of trained farm hands and one of trained factory hands. Everyone working on day one is trained. New hands start at 60% and reach about 97% after a year, most of it in the first six months.
- **Automatic stays the default.** It fills jobs as it does today. Someone who never touches the control loses about 1% to 2% of output on average, because new buildings start with learners.
- **The choice.** In Build's People section the player can set how many people work on farms, in schools and in factories, for the whole country. It takes effect when the month ends. It is a limit on each sector, and it never makes anyone jobless.
- **Service crews.** 20 people, from the building's province. 5 days and today's price with a trained crew. 10 days and half as much again with an untrained one. The building keeps working and its wear clock stops.
- **Expected balance.** I built a throwaway copy of the rules and played 432 games on it. Every level stayed within 1 win of 27 of today's result, on both sets of seeds. Veldoria is the nation most at risk, and Ruthless would sit exactly on its test floor. The copy has been removed, and nothing from it is committed.

### Decisions for you

Each has my recommendation. The reasons and figures are in the detail below.

| # | Decision | Recommendation | Other choice |
|---|---|---|---|
| 1 | Who is trained on day one? | Everyone working on day one, in every nation (table below). The trained share is 100%. | 90%, so that the system shows from day one. On the ladder seeds this cost no more than chance would explain (careful Normal 19, Hard 6, Ruthless 1). |
| 2 | How do people learn? | Quick at first: 68% after a month, 90% after six, 97% after twelve. It is the closest to today's results and needs one number per trade. | A straight line that reaches exactly 100% at twelve months. This is more literally "a year", but it takes Veldoria's careful Normal wins down to 4 of 18 instead of 6, and needs 24 stored numbers. |
| 3 | What happens to someone's old skill after a move? | It fades only as the new skill is learned, one for one. So a short move costs little, and a lasting one costs the old trade. | Lost at once on moving. Simpler to explain, but a breakdown would also cost training, since it moves people automatically. |
| 4 | Does Automatic also wait for the month's end? | No. It keeps filling daily as today, and only the player's own choice waits. A new farm under Automatic gets its hands the day it opens. | Automatic waits too. New buildings would then stand empty for up to a month, which moves further from today's results. |
| 5 | What if a choice leaves a new building empty? | It stays empty and the tile says so ("300 jobs empty"), until the player changes the choice or returns to Automatic. Anyone left over still fills open jobs. | The choice grows by itself with new buildings. Then it would no longer be what the player set. |
| 6 | Should training affect when scouting opens? | No. `isShortOfWorkers` keeps counting heads, and 45% for 14 days stays. | Counting learners as part of a person. It would open scouting for a shortage that more people would not cure. |
| 7 | Should building ahead of your people be softened? | No. Untrained penalties don't measurably make it worse, because money is what sinks those games. Instead, tell the player where the hands will come from (below). | A cheaper early game, which is a retune and yours to call. |
| 8 | Service numbers | 20 people, 5 and 10 days, half as much again when untrained. The building keeps working, the clock stops, and `SERVICE_COST_SHARE` stays 0.3. Repairs are unchanged. | Lower the share. Nothing I measured calls for it. |
| 9 | When is a crew untrained? | When fewer than 90% of those working in that trade are trained. | Literally "no trained people available". That never happened in any game measured: the fewest trained factory hands in any game was 473 for the plain scripts and 33 for the builder, against a crew of 20. |
| 10 | Is it fine that using the choice wins more games? | Yes, as what a good player earns. Moving surplus farm hands to factories took careful wins over both seed sets from Normal 33 to 37 and Hard 15 to 20, out of 54. The ladder itself doesn't use the choice. | Make it less rewarding, for example by raising the untrained share's cost. I would wait to see it played first. |
| 11 | Do schools have trained staff? | No. Only farms and food buildings, and factories, mines and sawmills, have trades. Schools always work at full skill. | A third trade, which adds a number with little effect, since the scripted games build no schools. |

### What I would do about building ahead (decision 7)

A country short of workers fills food jobs first, so each new farm takes its hands from the factories. Today that is invisible until the factory figure drops. I would add one line to the tip on a farm or factory row in Build when jobs already exceed workers: "No spare workers. Its 300 jobs would be filled from factories." The wording is a sample. This costs nothing in balance, and it answers the behaviour that task 08b worried about. The choice then gives that player something to do about it.

### The detail

#### State

Three new `GameState` fields, with their numbers in `constants.ts`:

- `trained: { food, industry }`: people trained in each trade. A trade is a skill, not a current job, so a person can be trained and be working elsewhere or idle.
- `workPlan`: the choice in force, as `{ food, school, industry }`, or `null` for Automatic.
- `workPlanNext`: the choice waiting for the month's end, if any.

How much a sector produces each day, where `hired` is the people working in it and `UNTRAINED_EFFICIENCY` is 0.6:

`efficiency = 0.6 + 0.4 × min(hired, trained) / hired`

So 2,100 trained among 2,400 farm hands gives 95%. `staffed.farms`, `granaries`, `canneries` and `factories`, and the staffing used by mines and sawmills, are multiplied by this, nationally. The head-count staffing shares don't change. That is what keeps these as they are: `isShortOfWorkers`, unemployment, migration, the strike decision (`DECISION_STRIKE_FACTORY_STAFFING`), and the People figures for jobs.

Once a month: `trained += (hired - trained) × TRAINING_RATE` (0.2), only where hired is the larger.

- **Moved or new people:** they are simply hired beyond the trained count, so they count as learners.
- **Moving away:** the old trade's count doesn't fall on moving. The two trades together may not exceed the country's workers. When learning would pass that total, the excess comes first from a trade with more trained people than hands. So skill fades only as another is learned. A broken farm's hands lose nothing unless their stay elsewhere lasts.
- **Deaths and emigration, a lost province or island:** the same total applies, first from trained people not working, then in proportion. If the country has idle people, losses come out of the slack first. That is a small unfairness in the player's favour, and I would leave it.
- **Births, settlers, a retaken province:** they arrive untrained, and dilute the count as they are hired.
- **Province by province:** skill is national. Every province's staffing is multiplied by the same figure. Food goes into a national store, so this doesn't change the total. An island farm's new hands lower the whole country's percentage slightly rather than the island's alone.

Example: Astravia with 2,400 on farms and 600 trained factory hands moves 300 to factories, none of them already trained there. Factories run at 87% next month, then 89%, reaching 99% in a year. The farm count falls by what the factories learn, 60 in the first month.

#### Starting numbers

All are `min(jobs, workers)`, farms first, which is how Automatic fills them. A nation's differences come from its people and farms.

| Nation | People | Workers | Trained farm hands | Trained factory hands | Factory jobs at the start | Food jobs at the start |
|---|---|---|---|---|---|---|
| Astravia | 12,000 | 3,000 | 2,100 | 900 | 1,300 | 2,100 |
| Caldenreich | 10,000 | 2,500 | 1,500 | 1,000 | 1,300 | 1,500 |
| Veldoria | 8,000 | 2,000 | 1,200 | 800 | 1,300 | 1,200 |

Broken starting buildings still count, so a player's first repair gets trained hands. I would not tilt these by nation for now. Giving each country one extra farm's worth of farm hands, in the throwaway rules, did not help (below).

Constants: `UNTRAINED_EFFICIENCY` 0.6, `TRAINING_RATE` 0.2, `STARTING_TRAINED_SHARE` 1, `SERVICE_CREW` 20, `SERVICE_DAYS_TRAINED` 5, `SERVICE_DAYS_UNTRAINED` 10, `SERVICE_UNTRAINED_COST` 1.5, `SERVICE_CREW_TRAINED_SHARE` 0.9.

- **0.6** is the figure you gave. Output barely reacts to it: 0.5 and 0.7 gave the same careful results.
- **0.2** is the slowest round rate that reaches about "full" in a year (97%). 0.1 reaches only 89%.

#### From a country-wide choice to the provinces

1. A choice sets a limit for each sector. Each province's jobs in that sector count only up to the same national share: `limit / all jobs in the sector`. So 2,100 of 2,400 farm jobs means each province offers 87.5% of its own.
2. Today's filling runs on those reduced jobs: locals first, then commuters, in the same order.
3. Anyone left then fills any job still open: locals first, then what remains of the commuters. The 70% commuting share is applied once in total, not twice.

What this keeps:

- **Automatic:** the limit is all jobs, so steps 1 to 3 are today's code, unchanged. The throwaway copy with the penalty off reproduced today's ladder exactly, nation by nation, on both seed sets.
- **Commuting:** unchanged, including its limits. A choice may not be met exactly, since 30% of idle people won't travel. The tile shows what happened, not what was asked.
- **Islands:** nobody crosses the sea. An island's jobs get the same share and its own people, and its people fill its remaining jobs in step 3.
- **Uprisings:** buildings the rebels hold have no jobs today, so they aren't in the share.

A broken building's hands go to other open jobs that same day, under a choice too. They have nothing to finish, so the month's delay doesn't apply to them.

#### What the player sees

No new window. It goes in the "Where people work" row of Build's People section (`WorkChain` in `PeoplePanel.tsx`), which already has a tile per sector in the order of filling. In words:

```
Where people work                       [Automatic | Your choice]

[farm]  Farms & food  100%   >   [school] Schools  100%   >   [factory] Factories  46%
        2,400 of 2,400 jobs              0 of 0 jobs                   600 of 1,300 jobs
        95% skill     [-] [+]                                          100% skill  [-] [+]
        2,100 from 1 March                                             900 from 1 March
        [Keep it as it is]
```

- **Each step is 50 people.** Minus on one tile puts them on the next with open jobs, and plus takes them from the fullest other. The total can't pass the country's workers. A sector with no jobs has no buttons.
- **Skill** shows only below 100%. The tip gives trained people and learners, and says that a new hand takes about a year.
- **Between choosing and the month's end:** the row's jobs, staffing and production don't change. The tile shows a small mark on its gauge at the coming figure, and the line "2,100 from 1 March". "Keep it as it is" cancels. Choosing Automatic waits for the month's end as well. Forecasts stay on today's staffing.
- **At the month's end:** one log line that folds with others, such as "300 people moved to factories". No notice and no pause.

#### Service crews

The numbers at today's prices, with a repair for comparison:

| | Farm | Factory | Time | Building |
|---|---|---|---|---|
| Repair (0.25, unchanged) | 163 Cr, 4 wood | 325 Cr, 6 ore | 10 days | Out of use |
| Service, trained crew (0.3) | 195 Cr, 5 wood | 390 Cr, 7 ore | 5 days | Keeps working |
| Service, untrained crew (0.45) | 293 Cr, 7 wood | 585 Cr, 10 ore | 10 days | Keeps working |

- **"A couple of workers":** 20 people. A farm employs 300, so this is 1 in 15, or a couple on a farm of 30. A flat size is simple to show, whatever the building.
- **Where they come from:** the building's province, for as long as the service lasts. They are taken from that province's workers before jobs are filled. They still count as workers for `isShortOfWorkers`. At about 9 services a year on Hard, fewer than one runs at a time, so this is under 1% of workers.
- **Which trade:** farms, estates, model farms, granaries and canneries use farm hands. Everything else uses factory hands, including homes, roads, harbours and schools, which have no trade of their own.
- **Trained or not:** decided when the service is ordered, by decision 9, and shown on the button with the price and days. In a plain game about 1 service in 10 would have an untrained crew, shortly after new buildings open, going by how often a sector was under 95% efficient (2% to 14% of days). I did not count services directly.
- **During a service:** paid at the start, as today. The building works normally, and its wear clock stops, so a service begun with 3 days left doesn't fail. A new field on `PlacedBuilding` holds the end date, and the wear clears then. A riot, a flood or rebels end the service with the wear, and the money is gone. The list row shows a progress bar, as a repair does. No new notice.
- **Does 0.3 still suit?** Yes. The delay costs a player almost nothing, because the building keeps working and the clock stops. Careful servicing across both seed sets, of 54: instant today, Normal 33, Hard 14, Ruthless 7. With five days and no training, 31, 17, 4. With five days and training, 33, 16, 2. Normal and Hard don't fall. Ruthless may, but it is few games, and only a test of it in stage 2 can say.
- **Repairs stay as they are.** A repair is already slow and puts the building out of use, so it needs no further weakening.

#### Scouting and `isShortOfWorkers`

- **Unchanged rule:** the function compares all jobs with all workers. Moving people between sectors alters neither figure, so a choice can't open or hold back scouting. Learners count as whole people.
- **Why not count skill:** task 08b chose this measure because more people is the cure it points to. Time cures a lack of skill. Countries are short of workers from month 1 anyway, so a line that moved with skill would need setting again.
- **Measured:** reaching 14 days at any point in five years did not change. Plain careful games on Normal: 0 today and with training. The builder, careful Normal: 8, 8, 4 today, against 8, 7, 4.
- **What this adds to scouting:** the shortage is what makes the choice matter, because there are always more jobs than people to divide among them. Scouting and the choice answer the same problem at different scales.
- **Still open, and made a little sharper:** people on an island arrive untrained and can't commute. They lower the national shortage figure but don't fill mainland jobs. This is already true today.

#### Building ahead of your people

Untrained penalties do not measurably make this worse. Careful and sloppy wins of 27 for a script that builds factories and farms, turn about, whenever it holds 1,000 Cr:

| | Easy careful | Easy sloppy | Normal, Hard, Ruthless |
|---|---|---|---|
| Today | 10 (1, 9, 0) | 6 | 0 |
| With training | 10 (1, 9, 0) | 7 | 0 |
| With training, and a limit on farm hands | 10 (1, 9, 0) | 8 | 0 |

- **Why:** these games run out of money. Median final treasury, careful on Easy, is 184 Cr against 21,286 for the plain script. New farms' learners cost only a little on top: this script's factories average 97% to 99% and its farms 98% to 99%.
- **Limits of this:** my script is harsher than task 08b's, which was deleted (08b had careful Easy at 9, 9, 4 and careful Normal at 1, 2, 0). With 0 on Normal and above, it can't show anything getting worse there. A gentler one, building only above 4,000 Cr with the straight-line version, went Normal 35 to 30 of 54 and Hard 15 to 16, which matches plain games and says little, as it rarely holds 4,000 Cr on Normal.
- **The choice doesn't rescue it:** see the last row. A limit keeps factory hands in factories, but doesn't bring the money back.

#### The default, and what I expect on the ladder

All games on the throwaway rules, sloppy and careful wins of 27. "Today" is starting commit `94b26bb`, and on the ladder seeds matches `difficultyData.ts`. Other seeds are 11 to 19.

| Level | Ladder seeds, today | With training | Other seeds, today | With training | Careful by nation, both seeds, of 18 each: today | With training |
|---|---|---|---|---|---|---|
| Easy | 14 and 27 | 14 and 27 | 12 and 27 | 12 and 27 | 18, 18, 18 | 18, 18, 18 |
| Normal | 0 and 20 | 0 and 19 | 0 and 15 | 0 and 14 | 10, 17, 8 | 10, 17, 6 |
| Hard | 0 and 7 | 0 and 8 | 0 and 7 | 0 and 7 | 6, 8, 0 | 6, 9, 0 |
| Ruthless | 0 and 2 | 0 and 1 | 0 and 3 | 0 and 3 | 1, 4, 0 | 1, 3, 0 |

Against the test bounds: Hard's 8 is above its floor of 5, Normal's 19 is under its ceiling of 22, and **Ruthless's 1 is exactly on its floor of 1**.

Average skill over a careful game was 98% to 99% on farms and 98% to 100% in factories. A sector was under 95% on 2% to 14% of days. Veldoria had the most such days, as one new farm is a fifth of its food jobs against an eighth of Astravia's.

**How much is chance?** Any change reshuffles every game after the first difference, so a level can move by 1 or 2 without meaning anything. These variations hardly differ, careful wins on the ladder seeds, Normal, Hard, Ruthless:

| Variation | Ladder seeds | Other seeds |
|---|---|---|
| Today | 20, 7, 2 | 15, 7, 3 |
| Proposed | 19, 8, 1 | 14, 7, 3 |
| Untrained 50% | 19, 8, 1 | |
| Untrained 70% | 19, 8, 1 | |
| Learn half as fast | 19, 8, 1 | |
| 90% trained on day one | 19, 6, 1 | |
| 80% trained on day one | 19, 7, 2 | |
| Straight line over a year | 18, 6, 2 | 12, 9, 3 |
| An extra farm's worth of farm hands at the start | 17, 7, 2 | 15, 5, 3 |
| Old skill lingers (the two trades may reach 110% of workers) | 19, 8, 1 | 15, 7, 3 |

**How I would keep the default close:**

1. Everyone working on day one is trained, so a game opens as it does today.
2. Automatic's filling is unchanged, so only new buildings and new people feel it.
3. The quick-at-first curve, which recovers most of the loss within a few months.

The table says tuning the numbers would achieve little, as none of them does much. If stage 2 passes the stop limit of 3 wins, I would stop and report as the task says, rather than retune levels.

#### The choice, measured

A careful script with a limit on farm hands at what feeds the people at 1.0 times, instead of the script's 1.1, with the rest going to factories. Wins over the two seed sets:

| Level | Automatic with training | With the limit | By nation, with the limit |
|---|---|---|---|
| Easy | 27 and 27 | 27 and 27 | 18, 18, 18 |
| Normal | 19 and 14 | 19 and 18 | 12, 17, 8 |
| Hard | 8 and 7 | 9 and 11 | 8, 12, 0 |
| Ruthless | 1 and 3 | 3 and 2 | 3, 2, 0 |

Median final treasury on Easy rose from about 20,500 to about 22,700 Cr. So it pays without being overwhelming. It still doesn't get Veldoria a win on Hard or Ruthless.

#### Scripted players and old saves

- **Scripted players:** `playCarefully` stays on Automatic. Its balance games are then the measure of the default. Stage 2 adds an option for a limit, off by default, as with `service`. Its `service` option follows the new rules.
- **Old saves:** `hydrateGameState` gives `workPlan: null`, no waiting choice, and `trained` equal to the people working in each trade on load, from today's filling. So nothing changes on the day it loads. Idle people then count as untrained if they are hired later. A service field left out simply means no service is running.
- **Neighbours:** computer-run countries have their own staffing and are left alone.
- **Tests:** tests that build a farm and check exact food will see learners. `tests/support/calmStart.ts` may need its country to start with a margin of trained people, or those tests may need adjusting. I have not counted how many.

### Balance risks

1. **Veldoria.** It is the nation I expect to lose most: careful on Normal fell from 8 to 6 of 18 (4 on the straight line). It already wins nothing on Hard or Ruthless and this won't change that. Each result is few games.
2. **Ruthless falling to its test floor.** At 1 of 27, one more lost game fails `balance.test.ts` at stage 2. Hard is safer than before at 8, though variations gave 6, one above its floor of 5.
3. **The choice raising what a good player wins.** Hard rose by 5 of 54 with one crude rule. A person could do better, and nobody has looked for a stronger rule, such as moving people with the seasons. Autumn and winter differ, and the month's delay and learning are the only brakes on it.
4. **Forgetting a choice.** A player who sets one and keeps building gets empty buildings. The tile says so, but only in the People section.
5. **The system may feel too quiet.** Around 1% to 2% of output for someone on Automatic is close to today, which you asked for. Whether it feels worth having is something only play will show. Starting at 90% (decision 1) is the simplest way to make it more present.
6. **Service on Ruthless**, as above.

### What I could not work out

- **A real player.** Everything comes from scripts. Nobody has used the control, and there is no screen yet.
- **Parts not in the throwaway rules:** the crew's 20 people, untrained crews' price and 10 days, the month's delay itself (the script set its limit on the first of each month), and limits on schools or factories. Untrained-crew frequency is an estimate from efficiency figures.
- **Islands and armies under a choice.** The measured games don't settle or fight, so step 3 of the filling has run only on the mainland. I reasoned through islands and uprisings, and did not test them.
- **Why Veldoria loses more,** beyond one farm being a larger share of its food jobs, and why it gains so little from the choice. Not traced.
- **Laws and research that lower jobs per building.** The ladder games pass none, so a sudden fall in jobs has not run against the trades.
- **Whether a season-following player breaks the delay.** Not tried.

### Ideas, out of scope

Schools could shorten the learning time, which would give them a job in this system. Wages could decide who stays in a trade. Neither is proposed here.

### Measurements

Run at `94b26bb` on uncommitted throwaway code, since reverted. About 7,000 games. Saved outside the repository in `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\t11\`: `prototype.diff` is the throwaway code, and the `.json` files are the games. No checks were run on this commit, as it changes only this file.

