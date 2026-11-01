# 06: Country titles that don't block the map

Branch: `task/06-country-titles`. Read `CLAUDE.md` first. Owner's list item 3.

## Why

The large country names sit over the provinces and hide what is happening there. They are drawn in `src/presentation/components/MapDecor.tsx` (`NATION_NAME_SIZE`, about line 80), and they follow the land held (`nationShapes` in `src/presentation/nationFrontiers.ts`).

## What to do, in two stages

**Stage 1: options only.** Build these on your branch and take real screenshots of each, using the same game state, with buildings on the land:

- A: smaller, paler names drawn underneath every map picture.
- B: names out at sea, following the country's coast, with nothing on the land.
- C: names shown while the map is idle or the pointer rests on a country, and faded while the clock runs.

Add another option only if it is clearly better. Write the screenshot paths under Results, then **stop and finish**. The owner picks from the screenshots.

**Stage 2**, once told which: finish that option, remove the others, and check all three nations, a nation that has lost provinces, and the setup screen, which uses the same map.

## Out of scope

Province names (there are none on the map, and it stays that way). Other map pictures. The nation plate at the top left.

## Done when

All checks in `CLAUDE.md` pass, and Results include final screenshots at a normal window and at about 1000px wide.

## Results

Stage 1 only: the three options are built, and the owner picks. Stage 2 has not started.

### Switching between them

Add to the address: `?titles=a`, `?titles=b` or `?titles=c`. Without it the names stay as they are today, so nothing changes for anyone until a choice is made. The switch is `src/presentation/titleOption.ts`. Stage 2 removes it and the options not chosen. No other option was added: none was clearly better.

### Screenshots

Not committed. All in `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\titles\`. Normal window is 1440x900, narrow is 1000x760. Every shot is one save, loaded unchanged: Astravia in July, 31 buildings on the land, with a camp, a strike and a riot (edited in, as they would not all arrive this early in play).

- Today, to compare: `now-1440-paused.png`, `now-1000-paused.png`
- A: `a-1440-paused.png`, `a-1000-paused.png`
- B: `b-1440-paused.png`, `b-1000-paused.png`
- B, its risks: `b-1440-as-caldenreich.png`, `b-1440-as-veldoria.png` and `b-1440-lost-provinces.png` (each from its own save, made the same way)
- C, clock stopped: `c-1440-paused.png`, `c-1000-paused.png`
- C, clock running: `c-1440-running.png`, `c-1000-running.png`
- C, clock running, pointer resting on Veldoria: `c-1440-running-rest.png`, `c-1000-running-rest.png`

### How each shows what is happening in the provinces

- **Today:** the name is drawn over the crowds. In the save, the riot and the camp sit under "Astravia", and the name and the riot are hard to read apart.
- **A:** nothing in a province is hidden, since every picture is on top. The cost is the name: pictures now stand on it, so Astravia's reads as "A...ravia", and the party line is hard to read, worst at 1000px. Faint letters also run under the buildings as a little noise.
- **B:** the clearest land of the three. Nothing but the map's own pictures is on it, and the names stay easy to read. The costs: a name is only seen if that stretch of sea is in view, and the names tilt with the coast. Details below.
- **C:** while the clock runs, about the same as B on the land, with a faint ghost of each name (10% strength). With the clock stopped it is exactly today's map, with the riot under the name. The game opens paused, and pausing is when a player reads the map and plans, so the fault stays at the moment it matters most. Resting on your own land brings the name back over your provinces at the same moment as the province card. Names coming and going with the clock may also be distracting, which a still screenshot cannot show.

**Recommendation: B.** It is the only one that takes the name off the land in every state. Its faults are about the names, not the provinces, which is the better way round.

### What differs besides the names

Today and C keep the buildings out of the room kept for the name, because C's name comes back there. A and B give that room up (`mapSlots.ts`), so in those two the buildings and crowds stand in different places: the same 31 buildings, spread more evenly, with the riot moved to the south coast. C's empty patch stays while the name is faded.

### B's faults, for stage 2 if it is chosen

- **Off the frame:** the map opens on your own land. Playing Caldenreich, Astravia's name falls 48px off the bottom until you pan. Playing Astravia at both sizes, the top of Caldenreich's "C" reaches the top edge of the map (the name's box measures 2px over it). Its north shore has no room, so its name takes the north-east shore, at a steeper tilt than the other two.
- **Party lines on water:** Caldenreich's blue "Reform Circle" is pale against the sea. That colour was chosen for land.
- **After losses:** with two Astravian provinces gone the name follows the shore still held, at a tilt of about 40 degrees. A nation holding no shore at all gets no name as the code stands: not tried. Island holdings are not counted as shore.

### Checks

- `npx tsc -b`: exit 0, no output.
- `npm run lint`: the five known warnings and no others.
- `npm run build`: built in 647ms.
- `npm test`: Test Files 33 passed (33), Tests 483 passed (483), one full run. No test was changed or added, as this is a trial. The tests run with today's names, so they do not cover options A, B or C, including `tests/mapSlots.test.ts` on A's and B's freed room.
- The browser console showed no errors in any shot, and no page scrolled sideways.

### Could not verify, and left open

- **Not looked at:** the setup screen, all three nations under A and C, and the Build window under each option (B keeps your name on show there, A and C hide it as today). Winter was also left out, since another task is changing it. Zooming and panning with the names at sea were not tried. Stage 2 covers the nations and the setup screen.
- **C's resting** was seen on a neighbour at 1x. Fading during a long game at 5x was not watched.
- **A's size and paleness, and C's 10%,** are first attempts, not tuned values.

### Noticed, left alone

- The strike crowd in the save stands partly off the coast, under every option and today (see North Thornwick). The riot in A and B sits on the shoreline too.
