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

