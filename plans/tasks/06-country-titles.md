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

Done. Stage 1 showed three options, and the owner chose B on 2026-11-01: names at sea along each coast. Stage 2 makes it the only behaviour.

### What changed

- **Names at sea:** `src/presentation/nationSeaNames.ts` picks each name's line, and `NationName` in `MapDecor.tsx` draws it. The names are no longer on the land.
- **Removed:** options A and C, the `?titles=` switch, the name placement on land in `nationFrontiers.ts`, and `inkier`, which nothing else used.
- **Freed room:** `mapSlots.ts` keeps no room for a name, so buildings and crowds can use the middle of the land.
- **Docs:** one line each in `TECHNICAL_DESIGN.md` and `TODO.md`, which described the old names.

### The faults from stage 1

- **Caldenreich's "C" at the top edge:** fixed. Measured at 0px out of the map when playing Astravia, at both sizes, where it was 2px. The margin is thin: about 2 map units by calculation.
- **Caldenreich's tilt:** now 24 degrees, against about 30 by eye in stage 1. Astravia's is 10 and Veldoria's 16. No better stretch exists. The flat north shore has about 47 map units of sea above it in the opening view, and the name and party need more than that, so a name there falls off the top (about 20 units in stage 1). Its north-east shore is the flattest that fits.
- **Pale party lines:** every party's line is now darkened in its own hue until its contrast on the water is at least 5, and a test holds it to at least 4.5 on the sea in all four seasons. Reform Circle goes from `#7ec8e3` to `rgb(38, 60, 68)`. The cost is that party colours read as dark tints, less bright than the swatches elsewhere.
- **No em dashes** in any new player text. The only new player text is the names themselves.

### A nation with no shore left

This can happen: Astravia's Redgate provinces and Caldenreich's West province 6 touch no shore. Veldoria has no inland province. The name then takes the nearest open water to the land still held, keeping off other names and islands. A test tries every inland province kept alone. Islands do not count as shore. See `astravia-no-shore-1440.png`: the name is at sea on the north-west shore, steeper than usual (about 50 degrees by eye).

A nation with no land left at all gets no name. Only the player's provinces can be lost (`TODO.md`). I did not check what the game shows at that point.

### How far a name is out of view at the opening position

Measured in the browser, in screen pixels, against the map panel. Each row is the nation being played.

| Playing | Window | Astravia | Caldenreich | Veldoria |
| --- | --- | --- | --- | --- |
| Astravia | 1440x900 | 0 | 0 | 0 |
| Astravia | 1000x760 | 0 | 0 | 0 |
| Caldenreich | 1440x900 | name 29, party 41 | 0 | 0 |
| Caldenreich | 1000x760 | name 23, party 32 | 0 | 0 |
| Veldoria | 1440x900 | 0 | 0 | 0 |
| Veldoria | 1000x760 | 0 | 0 | 0 |

**One fault remains.** Playing Caldenreich, Astravia's name falls off the bottom until you pan or zoom out, down from 48px in stage 1, and the top of a letter or two shows at the edge. Astravia's flat south shore is the only good stretch it has, and the opening view stops above it. Fixing that means moving Caldenreich's opening view, which I left alone as outside this task. Its land stays visible, and pointing at it names it.

No name sat under the map's buttons in any of these measurements. In the browser, every name and party line fitted its line, so no letters were dropped.

### Other checks in the browser

- **A nation that has lost provinces:** Astravia without two provinces. The name follows the shore still held, 0px out.
- **Setup screen:** names at sea at both sizes, 0px out of the chart. It shows no party lines, as before. At 1000px wide the chart is small and the names are small with it, though readable.
- **Winter:** names and party lines read clearly on the darker sea.
- **Zoom and pan:** zoomed right out, and zoomed in then dragged. The names scale and move with the map.
- **Build window:** your own name now stays on show, since it no longer covers the slots. The window hides what lies behind it, as it does anything else.
- No browser console errors in any of the shots above, across all three nations.

### Tests

- New `tests/nationSeaNames.test.ts` (8 tests): each nation has a name, on the water, clear of the shore and islands, reading left to right and apart from the others; a whole country's name stays within 35 degrees and below the top of the opening view; it runs along its own shore; it moves with a loss and comes back; a nation with no shore still gets one; a nation with nothing gets none; party lines are dark enough in every season.
- New test in `tests/mapSlots.test.ts` for the freed room. Putting the old room back temporarily made it fail, so it does catch the change.

### Checks

`npx tsc -b`: exit 0, no output.

`npm run lint`: the five known warnings and no others (`Gauge.tsx:125`, `ResourceIcon.tsx:5`, `BuildingIcon.tsx:8`, `useGameClock.ts:53`, `App.tsx:333`).

`npm run build`: built in 565ms.

`npm test`, one full run, on the same code apart from this file:

```
 Test Files  34 passed (34)
      Tests  492 passed (492)
```

### Screenshots

Not committed. All in `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\titles-final\`. Normal is 1440x900, narrow is 1000x760. The saves are edited to have buildings and trouble on the land.

- `astravia-1440.png`, `astravia-1000.png`, `caldenreich-1440.png`, `caldenreich-1000.png`, `veldoria-1440.png`, `veldoria-1000.png`
- `astravia-lost-two-1440.png`, `astravia-no-shore-1440.png`, `caldenreich-no-shore-1440.png`
- `setup-1440.png`, `setup-1000.png`, `setup-second-nation-1440.png`, `setup-second-nation-1000.png`
- `astravia-winter-1440.png`
- `zoomed-out-1440.png` (a province card happened to open over part of Astravia's name, as the pointer was resting), `zoomed-in-1440.png`, `zoomed-in-panned-1440.png`
- `build-window-1440.png`, `build-window-1000.png`

### Could not verify, and left open

- **Real play:** every shot is an edited save, paused. I did not play through a real loss of provinces, or watch the names through a game at speed.
- **Armies:** regiments near the coast or on the way to islands were not on screen in these saves, so a name passing under one was not seen. Armies are drawn on top of names.
- **Other seasons:** spring and autumn were checked only by the contrast test, not by eye. Summer and winter were seen.
- **Very narrow windows:** nothing below 1000px wide was tried.
- **Setup screen, no-shore and Build window** were seen at the sizes listed, not at every size for every nation.
- **Buildings moved:** with the name's room gone, buildings now stand in new places in existing saves, since plots are worked out rather than saved. Nothing in a save is lost.

### Noticed, left alone

- Strike and riot crowds can stand partly over the shoreline (North Thornwick's strike, and the riot on Astravia's south coast). Now that the middle of the land is free this may be worth a look, in `placeCrowds`.
